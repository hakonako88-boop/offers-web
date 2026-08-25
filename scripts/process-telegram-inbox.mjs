import fs from 'node:fs';
import path from 'node:path';
import {
  activateChatFromMessage,
  aliExpressPublicationUrl,
  amazonProductImageFromUrl,
  controlHelp,
  campaignFromTelegramMessage,
  editorialPostFromMessage,
  formatManualTelegramCaption,
  formatManualWebsiteText,
  manualOfferFromMessage,
  metadataForIncomingProductLink,
  mergeProductMetadata,
  metadataMatchesOfficialProduct,
  offerFromProductMetadata,
  processingOfferReply,
  storeFromUrl,
  forwardedOfferMetadata,
  urlFromTelegramMessage,
} from './telegram-inbox-commands.mjs';
import { extractProductMetadata, parsePrice } from './link-offer-extractor.mjs';
import { isInboxDuplicate } from './offer-deduplication.mjs';
import { aliexpressProductId, isOwnedAliExpressAffiliateUrl, resolveAliExpressAffiliateProduct } from './aliexpress-link-resolver.mjs';
import { miraviaAffiliateUrl, miraviaProductIdFromUrl } from './miravia-affiliate-resolver.mjs';
import { resolveMiraviaFeedMetadata } from './miravia-link-metadata.mjs';
import { offerReplyMarkup } from './offer-presentation.mjs';
import { buildAmazonReviewDraft } from './amazon-review-drafts.mjs';

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, 'data', 'telegram-inbox-state.json');
const OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const POSTS_FILE = path.join(ROOT, 'data', 'posts.json');
const TELEGRAM_SOURCE_QUEUE_FILE = path.join(ROOT, 'data', 'telegram-source-queue.json');
const IMAGES_DIR = path.join(ROOT, 'public', 'tg');
const MAX_PROCESSED_UPDATES = 400;
const DUPLICATE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function config() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN,
    channelId: process.env.TELEGRAM_CHANNEL_ID,
    controlCode: process.env.TELEGRAM_CONTROL_CODE,
    allowedChatId: process.env.TELEGRAM_ALLOWED_CHAT_ID,
    amazonPartnerTag: process.env.AMAZON_PARTNER_TAG,
    aliexpressAppKey: process.env.ALIEXPRESS_APP_KEY,
    aliexpressAppSecret: process.env.ALIEXPRESS_APP_SECRET,
    aliexpressTrackingId: process.env.ALIEXPRESS_TRACKING_ID,
    aliexpressInvitationCode: process.env.ALIEXPRESS_INVITATION_CODE,
    awinFeedListUrl: process.env.AWIN_FEED_LIST_URL,
  };
}

function safeError(error, token) {
  return String(error?.message || error || 'Unknown error').replaceAll(token || '', '[redacted]');
}

async function telegram(token, method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`Telegram ${method} failed: ${data.description || response.status}`);
  return data.result;
}

async function telegramForm(token, method, form) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`Telegram ${method} failed: ${data.description || response.status}`);
  return data.result;
}

export function detectedProductImageMime(bytes, contentType = '') {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const ascii = (start, length) => String.fromCharCode(...data.slice(start, start + length));
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (data[0] === 0x89 && ascii(1, 3) === 'PNG') return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
  if (ascii(0, 4) === 'GIF8') return 'image/gif';
  if (ascii(4, 8).startsWith('ftypavi')) return 'image/avif';
  const declared = String(contentType || '').split(';')[0].trim().toLowerCase();
  return /^image\/(?:jpeg|jpg|png|webp|gif|avif)$/u.test(declared)
    ? declared.replace('image/jpg', 'image/jpeg')
    : '';
}

async function downloadProductImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0 (compatible; ChollosAlDiaBot/1.0; +https://chollosaldia.com)',
      },
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) throw new Error(`La imagen respondió ${response.status || 'sin estado'}.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.byteLength) throw new Error('La imagen estaba vacía.');
    const mimeType = detectedProductImageMime(bytes, contentType);
    if (!mimeType) throw new Error(`La dirección no devolvió una fotografía válida (${contentType || 'sin tipo'}).`);
    return new Blob([bytes], { type: mimeType });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendProductPhoto(settings, offer) {
  const photos = [...new Set([offer.photoFileId, offer.imageUrl].filter(Boolean))];
  let lastError;
  for (const photo of photos) {
    const replyMarkup = offerReplyMarkup(
      offer,
      offer.kind === 'campaign' ? '👉🏻 VER PROMOCIÓN' : offer.kind === 'post' ? '👉🏻 ABRIR ENLACE' : '👉🏻 VER OFERTA',
    );
    const payload = {
      chat_id: settings.channelId,
      photo,
      caption: formatManualTelegramCaption(offer),
      parse_mode: 'HTML',
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    };
    try {
      return await telegram(settings.token, 'sendPhoto', payload);
    } catch (error) {
      lastError = error;
      // Algunas CDNs bloquean a Telegram. Con una URL pública descargamos la
      // imagen una vez y la subimos como archivo para no perder la oferta.
      if (!/^https?:\/\//iu.test(String(photo))) continue;
      try {
        const image = await downloadProductImage(photo);
        const form = new FormData();
        form.set('chat_id', String(settings.channelId));
        form.set('caption', formatManualTelegramCaption(offer));
        form.set('parse_mode', 'HTML');
        if (replyMarkup) form.set('reply_markup', JSON.stringify(replyMarkup));
        form.set('photo', image, 'oferta.jpg');
        return await telegramForm(settings.token, 'sendPhoto', form);
      } catch (uploadError) {
        lastError = uploadError;
      }
    }
  }
  throw lastError || new Error('No se recibió una foto válida del producto.');
}

async function sendOfferPreview(settings, chatId, offer) {
  const photos = [...new Set([offer.photoFileId, offer.imageUrl].filter(Boolean))];
  const isPost = offer.kind === 'post';
  const replyMarkup = {
    inline_keyboard: [
      [{ text: '✅ CONFIRMAR PUBLICACIÓN', callback_data: 'offer:confirm' }],
      [
        { text: '✏️ CAMBIAR TÍTULO', callback_data: 'offer:title' },
        ...(isPost
          ? [{ text: '📝 CAMBIAR TEXTO', callback_data: 'offer:body' }]
          : [{ text: '🎟️ AÑADIR CUPÓN', callback_data: 'offer:coupon' }]),
      ],
      ...(isPost ? [[{ text: offer.url ? '🔗 CAMBIAR ENLACE' : '🔗 AÑADIR ENLACE', callback_data: 'offer:link' }]] : []),
      [
        { text: '🖼️ CAMBIAR FOTO', callback_data: 'offer:photo' },
      ],
      [
        { text: '❌ CANCELAR', callback_data: 'offer:cancel' },
      ],
    ],
  };
  let lastError;
  for (const photo of photos) {
    const payload = {
      chat_id: chatId,
      photo,
      caption: formatManualTelegramCaption(offer),
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    };
    try {
      return await telegram(settings.token, 'sendPhoto', payload);
    } catch (error) {
      lastError = error;
      if (!/^https?:\/\//iu.test(String(photo))) continue;
      try {
        const image = await downloadProductImage(photo);
        const form = new FormData();
        form.set('chat_id', String(chatId));
        form.set('caption', formatManualTelegramCaption(offer));
        form.set('parse_mode', 'HTML');
        form.set('reply_markup', JSON.stringify(replyMarkup));
        form.set('photo', image, 'vista-previa.jpg');
        return await telegramForm(settings.token, 'sendPhoto', form);
      } catch (uploadError) {
        lastError = uploadError;
      }
    }
  }
  throw lastError || new Error('No se recibió una foto válida para la vista previa.');
}

async function removePreviewButtons(settings, chatId, messageId) {
  if (!chatId || !messageId) return;
  try {
    await telegram(settings.token, 'editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    });
  } catch (error) {
    // The publication flow must continue if Telegram already removed the
    // keyboard or the preview is too old to edit.
    console.warn(`Preview buttons could not be removed: ${safeError(error, settings.token)}`);
  }
}

async function mirrorTelegramPhoto(token, fileId, reference) {
  const file = await telegram(token, 'getFile', { file_id: fileId });
  if (!file?.file_path) throw new Error('Telegram did not return the uploaded photo.');
  const extension = path.extname(file.file_path) || '.jpg';
  const filename = `manual-${reference}${extension}`;
  const localPath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(localPath)) {
    const imageResponse = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
    if (!imageResponse.ok) throw new Error(`Could not download Telegram image: ${imageResponse.status}`);
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    fs.writeFileSync(localPath, Buffer.from(await imageResponse.arrayBuffer()));
  }
  return `/tg/${filename}`;
}

async function reply(token, chatId, text) {
  return telegram(token, 'sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

async function publishManualOffer(settings, offer, inputMessage) {
  const channelMessage = await sendProductPhoto(settings, offer);

  const postedPhotoId = channelMessage.photo?.at(-1)?.file_id || offer.photoFileId;
  if (!postedPhotoId) throw new Error('Telegram did not return a reusable product image.');
  const image = await mirrorTelegramPhoto(settings.token, postedPhotoId, channelMessage.message_id);
  if (offer.kind === 'post') {
    const existingPosts = readJson(POSTS_FILE, []);
    const record = {
      id: `post-${channelMessage.message_id}`,
      message_id: channelMessage.message_id,
      source_product_id: offer.sourceProductId || `post:${inputMessage.message_id}`,
      date: Math.floor(Date.now() / 1000),
      title: offer.title,
      body: offer.postBody || offer.description,
      image,
      url: offer.url || '',
      source: 'telegram-inbox',
    };
    writeJson(POSTS_FILE, [record, ...existingPosts.filter((entry) => entry.source_product_id !== record.source_product_id)]);
    return channelMessage;
  }
  const existingOffers = readJson(OFFERS_FILE, []);
  const record = {
    message_id: channelMessage.message_id,
    // Preserve a verified store product id. Future submissions of that exact
    // catalogue item can be recognised reliably, without turning every
    // private message into an unrelated "manual" duplicate.
    source_product_id: offer.sourceProductId || `manual-${inputMessage.message_id}`,
    date: Math.floor(Date.now() / 1000),
    title: offer.title,
    text: formatManualWebsiteText(offer),
    image,
    url: offer.url,
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    store: offer.store,
    category: offer.category,
    coupon: offer.coupon || '',
    description: offer.description,
    source: 'telegram-inbox',
  };
  const withoutPriorVersion = existingOffers.filter((entry) => entry.source_product_id !== record.source_product_id);
  writeJson(OFFERS_FILE, [record, ...withoutPriorVersion]);
  return channelMessage;
}

async function publishIfNew(settings, offer, inputMessage) {
  if (offer.kind === 'post') {
    const posts = readJson(POSTS_FILE, []);
    const duplicate = posts.some((post) => post.source_product_id === offer.sourceProductId
      || (post.title === offer.title && post.body === (offer.postBody || offer.description)));
    return duplicate ? { duplicate: true } : { channelMessage: await publishManualOffer(settings, offer, inputMessage), duplicate: false };
  }
  const existingOffers = readJson(OFFERS_FILE, []);
  const oldestDuplicate = Math.floor((Date.now() - DUPLICATE_WINDOW_MS) / 1000);
  // An expired deal must not keep blocking the same product forever. Only
  // compare against offers that can still be visible on the public site.
  const recentOffers = existingOffers.filter((entry) => Number(entry.date) >= oldestDuplicate);
  if (offer.kind === 'campaign' && recentOffers.some((entry) => entry.source_product_id === offer.sourceProductId)) {
    return { duplicate: true };
  }
  if (recentOffers.some((entry) => isInboxDuplicate(offer, entry))) return { duplicate: true };
  return { channelMessage: await publishManualOffer(settings, offer, inputMessage), duplicate: false };
}

function offerIsDuplicate(offer) {
  if (offer.kind === 'post') {
    return readJson(POSTS_FILE, []).some((post) => post.source_product_id === offer.sourceProductId
      || (post.title === offer.title && post.body === (offer.postBody || offer.description)));
  }
  const existingOffers = readJson(OFFERS_FILE, []);
  const oldestDuplicate = Math.floor((Date.now() - DUPLICATE_WINDOW_MS) / 1000);
  const recentOffers = existingOffers.filter((entry) => Number(entry.date) >= oldestDuplicate);
  if (offer.kind === 'campaign' && recentOffers.some((entry) => entry.source_product_id === offer.sourceProductId)) return true;
  return recentOffers.some((entry) => isInboxDuplicate(offer, entry));
}

async function queueOfferPreview(settings, pendingConfirmations, chatId, offer, inputMessage) {
  if (offerIsDuplicate(offer)) return { duplicate: true };
  const previewMessage = await sendOfferPreview(settings, chatId, offer);
  pendingConfirmations[String(chatId)] = {
    offer,
    inputMessageId: inputMessage?.message_id || `preview-${chatId}`,
    previewMessageId: previewMessage.message_id,
    createdAt: Date.now(),
  };
  return { duplicate: false, previewMessage };
}

function updateAmazonReviewQueueItem(itemId, status, reason, extra = {}) {
  if (!itemId) return;
  const queue = readJson(TELEGRAM_SOURCE_QUEUE_FILE, { version: 1, items: [] });
  const item = (queue.items || []).find((entry) => entry.id === itemId);
  if (!item) return;
  Object.assign(item, {
    status,
    reason,
    updatedAt: new Date().toISOString(),
    ...extra,
  });
  writeJson(TELEGRAM_SOURCE_QUEUE_FILE, queue);
}

async function queueNextAmazonReviewDraft(settings, pendingConfirmations) {
  const chatId = String(settings.allowedChatId || '').trim();
  if (!chatId || pendingConfirmations[chatId] || !settings.amazonPartnerTag) return false;
  const queue = readJson(TELEGRAM_SOURCE_QUEUE_FILE, { version: 1, items: [] });
  const cutoff = Date.now() - 72 * 60 * 60 * 1000;
  const candidates = (queue.items || [])
    .filter((item) => item.store === 'Amazon'
      && ['pending', 'blocked'].includes(item.status)
      && Date.parse(item.publishedAt || item.createdAt || 0) >= cutoff)
    .sort((left, right) => Date.parse(right.publishedAt || right.createdAt || 0) - Date.parse(left.publishedAt || left.createdAt || 0));

  for (const item of candidates.slice(0, 25)) {
    const result = await buildAmazonReviewDraft({ item, partnerTag: settings.amazonPartnerTag });
    if (result.status !== 'ready') {
      const missing = result.missing?.join(', ') || 'datos verificables';
      updateAmazonReviewQueueItem(item.id, 'needs_review', `No se pudo preparar la vista previa: falta ${missing}`);
      continue;
    }
    try {
      const outcome = await queueOfferPreview(settings, pendingConfirmations, chatId, result.offer, {
        message_id: item.messageId || `amazon-review-${item.id}`,
      });
      if (outcome.duplicate) {
        updateAmazonReviewQueueItem(item.id, 'duplicate', 'El mismo ASIN ya está publicado recientemente');
        continue;
      }
      updateAmazonReviewQueueItem(item.id, 'awaiting_confirmation', 'Vista previa automática enviada al propietario', {
        previewMessageId: outcome.previewMessage?.message_id || null,
        resultUrl: result.offer.url,
      });
      await reply(settings.token, chatId, [
        '🤖 Borrador automático de Amazon preparado.',
        `✅ El enlace lleva tu tag ${settings.amazonPartnerTag}.`,
        '🖼️ La foto procede del ASIN oficial de Amazon.',
        'Comprueba el precio y pulsa «✅ CONFIRMAR PUBLICACIÓN» para enviarlo a Telegram y a la web.',
      ].join('\n'));
      return true;
    } catch (error) {
      updateAmazonReviewQueueItem(item.id, 'pending', `No se pudo enviar la vista previa: ${safeError(error, settings.token).slice(0, 180)}`);
      console.warn(`Automatic Amazon preview failed for ${item.id}: ${safeError(error, settings.token)}`);
      return false;
    }
  }
  return false;
}

function publicationSuccessReply() {
  return [
    '✅ Publicada en el canal.',
    '🌐 También se ha guardado para Chollos al Día.',
    '⏳ La ficha aparecerá en la web en unos minutos, al terminar su actualización automática.',
  ].join('\n');
}

function requestedPrice(text) {
  const priceMatch = String(text).match(/(?:precio|ahora)\s*:\s*([^\n]+)/iu);
  const previousMatch = String(text).match(/(?:antes|pvp)\s*:\s*([^\n]+)/iu);
  return {
    price: parsePrice(priceMatch?.[1] || text),
    previousPrice: parsePrice(previousMatch?.[1] || ''),
  };
}

function inboxFailureReply(error) {
  const detail = String(error?.message || error || '');
  if (/sendPhoto|photo|image|file/i.test(detail)) {
    return '⚠️ He leído la oferta, pero Telegram no ha podido descargar la foto de la tienda. Pega el enlace directo del producto (no un enlace acortado) y la intentaré publicar de nuevo.';
  }
  if (/abort|timeout|fetch|respondió|status/i.test(detail)) {
    return '⚠️ La tienda no ha dejado leer la ficha en este momento. No he publicado nada. Pega el enlace directo del producto y vuelve a enviarlo dentro de unos minutos.';
  }
  return '⚠️ No he podido terminar esa oferta. No se ha publicado nada. Reenvía la publicación y, si Telegram quitó el botón, pega debajo el enlace directo de compra.';
}

function metadataWithOfficialAmazonImage(url, metadata = {}) {
  if (storeFromUrl(url) !== 'Amazon' || metadata.imageUrl) return metadata;
  const imageUrl = amazonProductImageFromUrl(url);
  return imageUrl ? { ...metadata, imageUrl } : metadata;
}

async function extractMetadataWithRetry(url) {
  let latestError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await extractProductMetadata(url);
    } catch (error) {
      latestError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 650));
    }
  }
  throw latestError;
}

const settings = config();
if (!settings.token || !settings.channelId) {
  console.log('Telegram inbox skipped: missing Telegram configuration.');
  process.exit(0);
}
const state = readJson(STATE_FILE, { processedUpdateIds: [] });
const processed = new Set((state.processedUpdateIds || []).map(Number));
const authorizedChatIds = new Set((state.authorizedChatIds || []).map(String));
const pendingByChat = state.pendingByChat && typeof state.pendingByChat === 'object' ? state.pendingByChat : {};
const pendingConfirmations = state.pendingConfirmations && typeof state.pendingConfirmations === 'object'
  ? state.pendingConfirmations
  : {};
let updates;
let webhookUpdate = String(process.env.TELEGRAM_WEBHOOK_UPDATE || '').trim();
// GitHub stores the repository_dispatch payload in GITHUB_EVENT_PATH. Reading
// it from that private runner file prevents the complete Telegram message from
// being echoed as a job-level environment value in public Actions logs.
if ((!webhookUpdate || webhookUpdate === 'null') && process.env.GITHUB_EVENT_PATH) {
  try {
    const githubEvent = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    if (githubEvent?.client_payload?.update && typeof githubEvent.client_payload.update === 'object') {
      webhookUpdate = JSON.stringify(githubEvent.client_payload.update);
    }
  } catch (error) {
    console.warn(`GitHub event payload could not be read: ${safeError(error, settings.token)}`);
  }
}
const pendingOnly = String(process.env.TELEGRAM_PENDING_ONLY || '').toLowerCase() === 'true';
if (pendingOnly) {
  updates = [];
} else if (webhookUpdate && webhookUpdate !== 'null') {
  try {
    const parsed = JSON.parse(webhookUpdate);
    updates = parsed && typeof parsed === 'object' ? [parsed] : [];
    console.log('Telegram inbox received one update through the instant webhook.');
  } catch (error) {
    throw new Error(`Telegram webhook update is not valid JSON: ${safeError(error, settings.token)}`);
  }
} else {
  updates = await telegram(settings.token, 'getUpdates', {
    limit: 100,
  });
}

let published = 0;
let handled = 0;
for (const [chatKey, pending] of Object.entries(pendingByChat)) {
  if (pendingConfirmations[chatKey]) continue;
  let pendingUrl = pending?.url;
  let metadata = metadataWithOfficialAmazonImage(pendingUrl, pending?.metadata);
  let result = offerFromProductMetadata({
    url: pendingUrl,
    metadata,
    partnerTag: settings.amazonPartnerTag,
  });
  if (result.status !== 'ready' && storeFromUrl(pendingUrl) === 'Amazon') {
    try {
      const refreshed = await extractMetadataWithRetry(pendingUrl);
      metadata = mergeProductMetadata(refreshed, pending?.draft || metadata);
      pendingUrl = metadata.finalUrl || pendingUrl;
      metadata = metadataWithOfficialAmazonImage(pendingUrl, metadata);
      result = offerFromProductMetadata({
        url: pendingUrl,
        metadata,
        partnerTag: settings.amazonPartnerTag,
      });
      pendingByChat[chatKey] = { ...pending, url: pendingUrl, metadata };
    } catch (error) {
      console.warn(`Pending Amazon metadata refresh failed for ${chatKey}: ${safeError(error, settings.token)}`);
    }
  }
  if (result.status !== 'ready' && storeFromUrl(pendingUrl) === 'AliExpress') {
    try {
      let refreshed = { finalUrl: pendingUrl };
      try {
        refreshed = await extractMetadataWithRetry(pendingUrl);
      } catch {
        // The affiliate resolver has independent redirect and reader paths.
      }
      // The pending URL is the identity the owner actually submitted. A page
      // reader may expose AliExpress's old compatibility id in finalUrl.
      const affiliateMetadata = await resolveAliExpressAffiliateProduct(pendingUrl, {
        appKey: settings.aliexpressAppKey,
        appSecret: settings.aliexpressAppSecret,
        trackingId: settings.aliexpressTrackingId,
      });
      const storedOwnedUrl = String(pending?.metadata?.ownedAffiliateUrl || '');
      const resolvedOwnedUrl = isOwnedAliExpressAffiliateUrl(
        refreshed.finalUrl || metadata.finalUrl || '',
        settings.aliexpressInvitationCode,
      ) ? pendingUrl : '';
      const ownedAffiliateUrl = /^https:\/\/(?:s\.click|a)\.aliexpress\.com\//iu.test(storedOwnedUrl)
        ? storedOwnedUrl
        : resolvedOwnedUrl;
      const generatedUrl = String(affiliateMetadata.affiliateUrl || ownedAffiliateUrl || '');
      const storedMetadata = mergeProductMetadata(metadata, pending?.draft || {});
      metadata = mergeProductMetadata({
        ...refreshed,
        ...Object.fromEntries(Object.entries(affiliateMetadata)
          .filter(([key, value]) => key !== 'affiliateUrl' && value)),
      }, storedMetadata);
      metadata = {
        ...metadata,
        affiliateUrl: generatedUrl,
        ...(ownedAffiliateUrl ? { ownedAffiliateUrl } : {}),
      };
      pendingUrl = aliExpressPublicationUrl({
        generatedUrl,
        productId: metadata.productId,
        fallbackUrl: metadata.canonicalUrl || pendingUrl,
      });
      if (!generatedUrl) {
        metadata = {
          ...metadata,
          finalUrl: pendingUrl,
          sourceUrl: pendingUrl,
          affiliateUrl: '',
        };
      }
      result = offerFromProductMetadata({
        url: pendingUrl,
        metadata,
        partnerTag: settings.amazonPartnerTag,
      });
      pendingByChat[chatKey] = {
        ...pending,
        url: pendingUrl,
        metadata,
        draft: { ...(pending?.draft || {}), ...storedMetadata },
      };
      console.log(`Pending AliExpress product ${metadata.productId || 'without-id'}; own affiliate=${generatedUrl ? 'yes' : 'no'}; ready=${result.status === 'ready' ? 'yes' : 'no'}.`);
      if (!generatedUrl && !pending?.affiliateUnavailableNotified) {
        await reply(settings.token, chatKey, `He recuperado el título y la foto del producto ${metadata.productId || ''}, pero la API oficial de AliExpress no ofrece precio ni permite generar tu enlace afiliado para este artículo. No publico el enlace de otra persona. Prueba con otra oferta del mismo producto o vuelve a enviarlo más tarde.`);
        pendingByChat[chatKey] = {
          ...pendingByChat[chatKey],
          affiliateUnavailableNotified: true,
        };
      }
    } catch (error) {
      console.warn(`Pending AliExpress metadata refresh failed for ${chatKey}: ${safeError(error, settings.token)}`);
    }
  }
  if (result.status !== 'ready') continue;
  try {
    const outcome = await queueOfferPreview(settings, pendingConfirmations, chatKey, result.offer, {
      message_id: pending.messageId || `pending-${chatKey}`,
    });
    await reply(settings.token, chatKey, outcome.duplicate
      ? '♻️ Esa oferta pendiente ya estaba publicada. No la repito en el canal.'
      : '👀 Esta es la vista previa. Revisa todos los datos; no se publicará hasta que pulses «✅ CONFIRMAR PUBLICACIÓN».');
    delete pendingByChat[chatKey];
  } catch (error) {
    console.warn(`Pending Telegram preview for ${chatKey} could not be prepared: ${safeError(error, settings.token)}`);
  }
}
for (const update of updates || []) {
  const updateId = Number(update.update_id);
  if (!Number.isFinite(updateId) || processed.has(updateId)) continue;
  const callback = update.callback_query;
  if (callback) {
    const callbackChatId = callback.message?.chat?.id;
    const callbackChatKey = String(callbackChatId || '');
    const isAuthorizedCallback = authorizedChatIds.has(callbackChatKey)
      || (settings.allowedChatId && callbackChatKey === String(settings.allowedChatId));
    try {
      // GitHub Actions can start after Telegram's short callback acknowledgement
      // window has elapsed. A stale answerCallbackQuery must never prevent the
      // requested confirm/edit/photo/cancel action from being executed.
      try {
        await telegram(settings.token, 'answerCallbackQuery', { callback_query_id: callback.id });
      } catch (error) {
        console.warn(`Telegram callback acknowledgement arrived too late: ${safeError(error, settings.token)}`);
      }
      if (!callbackChatId || !isAuthorizedCallback) {
        if (callbackChatId) await reply(settings.token, callbackChatId, '⛔ Este chat no está autorizado.');
      } else if (callback.data === 'offer:confirm') {
        const pending = pendingConfirmations[callbackChatKey];
        if (!pending) {
          // Telegram Web may keep an old keyboard cached after the offer was
          // already published or cancelled. Remove the keyboard from the
          // exact message the owner tapped so it cannot keep looking active.
          await removePreviewButtons(settings, callbackChatId, callback.message?.message_id);
          await reply(settings.token, callbackChatId, 'ℹ️ Esa vista previa ya estaba procesada. He desactivado sus botones para que no puedas publicarla dos veces.');
        } else {
          const outcome = await publishIfNew(settings, pending.offer, { message_id: pending.inputMessageId });
          if (pending.offer.reviewQueueItemId) {
            updateAmazonReviewQueueItem(
              pending.offer.reviewQueueItemId,
              outcome.duplicate ? 'duplicate' : 'published',
              outcome.duplicate ? 'El mismo ASIN ya estaba publicado recientemente' : 'Confirmada por el propietario y publicada en Telegram y la web',
              outcome.channelMessage ? { telegramMessageId: outcome.channelMessage.message_id, resultUrl: pending.offer.url } : {},
            );
          }
          await reply(settings.token, callbackChatId, outcome.duplicate
            ? '♻️ No la publico porque ese producto ya existe en el canal.'
            : publicationSuccessReply());
          if (!outcome.duplicate) published += 1;
          await removePreviewButtons(settings, callbackChatId, pending.previewMessageId);
          if (callback.message?.message_id !== pending.previewMessageId) {
            await removePreviewButtons(settings, callbackChatId, callback.message?.message_id);
          }
          delete pendingConfirmations[callbackChatKey];
        }
      } else if (callback.data === 'offer:title' || callback.data === 'offer:edit') {
        const pending = pendingConfirmations[callbackChatKey];
        if (!pending) {
          await reply(settings.token, callbackChatId, '⌛ Esa vista previa ya no está pendiente. Envía la oferta otra vez.');
        } else {
          pending.awaitingTitle = true;
          pending.awaitingCoupon = false;
          pending.awaitingBody = false;
          pending.awaitingLink = false;
          pending.awaitingPhoto = false;
          pending.updatedAt = Date.now();
          await removePreviewButtons(settings, callbackChatId, pending.previewMessageId);
          await reply(settings.token, callbackChatId, '✏️ Escribe ahora el título que quieres mostrar. Conservaré la foto, el precio, el cupón y el enlace, y te enseñaré otra vista previa.');
        }
      } else if (callback.data === 'offer:coupon') {
        const pending = pendingConfirmations[callbackChatKey];
        if (!pending) {
          await reply(settings.token, callbackChatId, '⌛ Esa vista previa ya no está pendiente. Envía la oferta otra vez.');
        } else {
          pending.awaitingCoupon = true;
          pending.awaitingTitle = false;
          pending.awaitingBody = false;
          pending.awaitingLink = false;
          pending.awaitingPhoto = false;
          pending.updatedAt = Date.now();
          await removePreviewButtons(settings, callbackChatId, pending.previewMessageId);
          await reply(settings.token, callbackChatId, '🎟️ Escribe el código del cupón. Para eliminar uno existente, responde «SIN CUPÓN». Después te mostraré otra vista previa.');
        }
      } else if (callback.data === 'offer:body') {
        const pending = pendingConfirmations[callbackChatKey];
        if (!pending?.offer || pending.offer.kind !== 'post') {
          await reply(settings.token, callbackChatId, '⌛ Esa publicación ya no está pendiente. Envía el post otra vez.');
        } else {
          pending.awaitingBody = true;
          pending.awaitingTitle = false;
          pending.awaitingCoupon = false;
          pending.awaitingLink = false;
          pending.awaitingPhoto = false;
          pending.updatedAt = Date.now();
          await removePreviewButtons(settings, callbackChatId, pending.previewMessageId);
          await reply(settings.token, callbackChatId, '📝 Escribe ahora el texto completo de la publicación. Después te mostraré otra vista previa.');
        }
      } else if (callback.data === 'offer:link') {
        const pending = pendingConfirmations[callbackChatKey];
        if (!pending?.offer || pending.offer.kind !== 'post') {
          await reply(settings.token, callbackChatId, '⌛ Esa publicación ya no está pendiente. Envía el post otra vez.');
        } else {
          pending.awaitingLink = true;
          pending.awaitingTitle = false;
          pending.awaitingCoupon = false;
          pending.awaitingBody = false;
          pending.awaitingPhoto = false;
          pending.updatedAt = Date.now();
          await removePreviewButtons(settings, callbackChatId, pending.previewMessageId);
          await reply(settings.token, callbackChatId, '🔗 Envía el enlace que quieres añadir. Para publicar sin botón, responde «SIN ENLACE».');
        }
      } else if (callback.data === 'offer:photo') {
        const pending = pendingConfirmations[callbackChatKey];
        if (!pending) {
          await reply(settings.token, callbackChatId, '⌛ Esa vista previa ya no está pendiente. Envía la oferta otra vez.');
        } else {
          pending.awaitingPhoto = true;
          pending.awaitingTitle = false;
          pending.awaitingCoupon = false;
          pending.awaitingBody = false;
          pending.awaitingLink = false;
          pending.updatedAt = Date.now();
          await removePreviewButtons(settings, callbackChatId, pending.previewMessageId);
          await reply(settings.token, callbackChatId, '🖼️ Envía ahora la nueva foto del producto. Sustituiré la anterior y te mostraré otra vista previa antes de publicar.');
        }
      } else if (callback.data === 'offer:cancel') {
        const pending = pendingConfirmations[callbackChatKey];
        await removePreviewButtons(settings, callbackChatId, pending?.previewMessageId);
        if (pending?.offer?.reviewQueueItemId) {
          updateAmazonReviewQueueItem(pending.offer.reviewQueueItemId, 'cancelled', 'Vista previa cancelada por el propietario');
        }
        delete pendingConfirmations[callbackChatKey];
        await reply(settings.token, callbackChatId, '❌ Publicación cancelada. No se ha enviado nada al canal ni a la web.');
      }
      handled += 1;
    } catch (error) {
      console.warn(`Telegram confirmation callback could not be processed: ${safeError(error, settings.token)}`);
      if (callbackChatId) {
        try { await reply(settings.token, callbackChatId, inboxFailureReply(error)); } catch {
          // The callback was already acknowledged; Telegram can reject a late
          // diagnostic reply without changing the processed update state.
        }
      }
    }
    processed.add(updateId);
    continue;
  }
  const message = update.message;
  if (!message || message.chat?.type !== 'private') {
    processed.add(updateId);
    continue;
  }

  try {
    const text = message.caption || message.text || '';
    const chatKey = String(message.chat.id);
    const isAuthorizedChat = authorizedChatIds.has(chatKey) || (settings.allowedChatId && chatKey === String(settings.allowedChatId));
    const largestPhoto = Array.isArray(message.photo) ? message.photo.at(-1)?.file_id : '';
    const incomingUrl = urlFromTelegramMessage(message, text);
    const campaign = campaignFromTelegramMessage({ text, photoFileId: largestPhoto, url: incomingUrl });
    const editorialPost = editorialPostFromMessage({
      text,
      photoFileId: largestPhoto,
      allowImplicit: isAuthorizedChat
        && storeFromUrl(incomingUrl) === 'Tienda',
    });
    const activation = activateChatFromMessage({ text, controlCode: settings.controlCode });
    if (activation.status === 'authorized') {
      authorizedChatIds.add(chatKey);
      await reply(settings.token, message.chat.id, '✅ Chat activado. Ahora solo tienes que pegar un enlace de oferta.');
      handled += 1;
    } else if (activation.status === 'unauthorized') {
      await reply(settings.token, message.chat.id, '⛔ La clave no es correcta.');
      handled += 1;
    } else if (/^\/(?:start|ayuda)(?:@\w+)?\b/i.test(String(text).trim())) {
      await reply(settings.token, message.chat.id, controlHelp());
      handled += 1;
    } else if (message.voice) {
      await reply(settings.token, message.chat.id, '🎙️ Esta versión gratuita no transcribe audios. Pega el enlace del producto por escrito.\n\n' + controlHelp());
      handled += 1;
    } else if (isAuthorizedChat && pendingConfirmations[chatKey]?.awaitingTitle) {
      const pending = pendingConfirmations[chatKey];
      const title = String(text || '').replace(/^(?:t[ií]tulo|producto)\s*:\s*/iu, '').replace(/\s+/gu, ' ').trim();
      if (title.length < 5 || title.length > 180 || /^https?:\/\//iu.test(title)) {
        await reply(settings.token, message.chat.id, '✏️ El título debe tener entre 5 y 180 caracteres y no puede ser solamente un enlace. Escríbelo de nuevo.');
      } else {
        pending.offer = { ...pending.offer, title };
        pending.awaitingTitle = false;
        pending.updatedAt = Date.now();
        const previewMessage = await sendOfferPreview(settings, message.chat.id, pending.offer);
        pending.previewMessageId = previewMessage.message_id;
        await reply(settings.token, message.chat.id, '✅ Título actualizado. Revisa la vista previa y confirma o sigue editando.');
      }
      handled += 1;
    } else if (isAuthorizedChat && pendingConfirmations[chatKey]?.awaitingCoupon) {
      const pending = pendingConfirmations[chatKey];
      const supplied = String(text || '').replace(/^(?:cup[oó]n|c[oó]digo)\s*:\s*/iu, '').replace(/\s+/gu, ' ').trim();
      const removeCoupon = /^(?:sin\s+cup[oó]n|quitar|eliminar|ninguno|-)$/iu.test(supplied);
      if (!removeCoupon && (!supplied || supplied.length > 40 || /^https?:\/\//iu.test(supplied))) {
        await reply(settings.token, message.chat.id, '🎟️ Escribe solamente el código del cupón (máximo 40 caracteres) o responde «SIN CUPÓN».');
      } else {
        pending.offer = { ...pending.offer, coupon: removeCoupon ? '' : supplied };
        pending.awaitingCoupon = false;
        pending.updatedAt = Date.now();
        const previewMessage = await sendOfferPreview(settings, message.chat.id, pending.offer);
        pending.previewMessageId = previewMessage.message_id;
        await reply(settings.token, message.chat.id, removeCoupon
          ? '✅ Cupón eliminado. Revisa la vista previa y confirma o sigue editando.'
          : '✅ Cupón añadido. Revisa la vista previa y confirma o sigue editando.');
      }
      handled += 1;
    } else if (isAuthorizedChat && pendingConfirmations[chatKey]?.awaitingBody) {
      const pending = pendingConfirmations[chatKey];
      const body = String(text || '').replace(/^texto\s*:\s*/iu, '').trim();
      if (body.length < 5 || body.length > 3500) {
        await reply(settings.token, message.chat.id, '📝 El texto debe tener entre 5 y 3.500 caracteres. Escríbelo de nuevo.');
      } else {
        pending.offer = { ...pending.offer, description: body, postBody: body };
        pending.awaitingBody = false;
        pending.updatedAt = Date.now();
        const previewMessage = await sendOfferPreview(settings, message.chat.id, pending.offer);
        pending.previewMessageId = previewMessage.message_id;
        await reply(settings.token, message.chat.id, '✅ Texto actualizado. Revisa la vista previa y confirma o sigue editando.');
      }
      handled += 1;
    } else if (isAuthorizedChat && pendingConfirmations[chatKey]?.awaitingLink) {
      const pending = pendingConfirmations[chatKey];
      const removeLink = /^(?:sin\s+enlace|quitar|eliminar|ninguno|-)$/iu.test(String(text || '').trim());
      let link = removeLink ? '' : incomingUrl;
      try {
        if (link && !/^https?:$/u.test(new URL(link).protocol)) link = '';
      } catch { link = ''; }
      if (!removeLink && !link) {
        await reply(settings.token, message.chat.id, '🔗 No he encontrado un enlace válido. Pega una dirección que empiece por https:// o responde «SIN ENLACE».');
      } else {
        pending.offer = { ...pending.offer, url: link };
        pending.awaitingLink = false;
        pending.updatedAt = Date.now();
        const previewMessage = await sendOfferPreview(settings, message.chat.id, pending.offer);
        pending.previewMessageId = previewMessage.message_id;
        await reply(settings.token, message.chat.id, link ? '✅ Enlace actualizado. Revisa la vista previa.' : '✅ Enlace eliminado. El post se publicará sin botón externo.');
      }
      handled += 1;
    } else if (isAuthorizedChat && pendingConfirmations[chatKey]?.awaitingPhoto) {
      const pending = pendingConfirmations[chatKey];
      if (!largestPhoto) {
        await reply(settings.token, message.chat.id, '🖼️ Aún estoy esperando una imagen. Envíala como foto (no como enlace ni como documento).');
      } else {
        pending.offer = {
          ...pending.offer,
          photoFileId: largestPhoto,
          imageUrl: largestPhoto,
        };
        pending.awaitingPhoto = false;
        pending.updatedAt = Date.now();
        const previewMessage = await sendOfferPreview(settings, message.chat.id, pending.offer);
        pending.previewMessageId = previewMessage.message_id;
        await reply(settings.token, message.chat.id, '✅ Foto sustituida. Revisa la nueva vista previa y pulsa «CONFIRMAR PUBLICACIÓN» si está correcta.');
      }
      handled += 1;
    } else if (isAuthorizedChat && editorialPost.status !== 'ignore') {
      if (editorialPost.status === 'invalid') {
        await reply(settings.token, message.chat.id, /^\/(?:post|publicacion)(?:@\w+)?\s*$/iu.test(String(text).trim())
          ? 'ℹ️ Envía /post, el título y el texto juntos en un solo mensaje. También puedes reenviar directamente un post completo y te mostraré la vista previa.'
          : `⚠️ ${editorialPost.message}`);
      } else {
        const outcome = await queueOfferPreview(settings, pendingConfirmations, message.chat.id, editorialPost.offer, message);
        await reply(settings.token, message.chat.id, outcome.duplicate
          ? '♻️ Esa publicación ya existe. No la repito.'
          : '👀 Vista previa del post preparada. Puedes cambiar título, texto, enlace o foto antes de confirmar.');
        delete pendingByChat[chatKey];
      }
      handled += 1;
    } else if (isAuthorizedChat && campaign.status !== 'ignore') {
      if (campaign.status === 'invalid') {
        await reply(settings.token, message.chat.id, `⚠️ ${campaign.message}`);
      } else {
        const outcome = await queueOfferPreview(settings, pendingConfirmations, message.chat.id, campaign.offer, message);
        await reply(settings.token, message.chat.id, outcome.duplicate
          ? '♻️ Esta campaña ya está publicada. No la repito en el canal.'
          : '👀 Vista previa preparada. La campaña no se publicará hasta que pulses «✅ CONFIRMAR PUBLICACIÓN».');
        delete pendingByChat[chatKey];
      }
      handled += 1;
    } else if (isAuthorizedChat && incomingUrl && !/^\/(?:oferta|publicar)(?:@\w+)?\b/iu.test(String(text).trim())) {
      const url = incomingUrl;
      const forwardedMetadata = metadataForIncomingProductLink({
        pending: pendingByChat[chatKey],
        text,
        photoFileId: largestPhoto,
      });
      try {
        await reply(settings.token, message.chat.id, processingOfferReply(storeFromUrl(url)));
      } catch (error) {
        // The acknowledgement is helpful but must never stop the actual
        // publication when Telegram delays a private reply.
        console.warn(`Telegram acknowledgement could not be sent: ${safeError(error, settings.token)}`);
      }
      let metadata = { finalUrl: url };
      let metadataError = '';
      try {
        metadata = await extractMetadataWithRetry(url);
      } catch (error) {
        metadataError = safeError(error, settings.token);
        console.warn(`Could not read product metadata for inbox message ${message.message_id}: ${metadataError}`);
      }
      const resolvedStore = storeFromUrl(metadata.finalUrl || metadata.affiliateUrl || url);
      // The shop/API image always wins. If it cannot be read, however, a photo
      // supplied in the Telegram card is a valid last-resort fallback. This is
      // essential for AliExpress redirects, which occasionally block metadata
      // access even though the owner has sent a complete offer. The supported
      // store/link validation below still prevents image-only channel links
      // from being published as products.
      let metadataFromForward = Object.fromEntries(Object.entries(forwardedMetadata)
        .filter(([key, value]) => key !== 'photoFileId' && value));
      // AliExpress's public page frequently returns a generic storefront title
      // or an incomplete price to automated readers. Its affiliate catalogue
      // is the authoritative product source, so ask it on every AliExpress
      // submission rather than only when the page happens to be blank.
      let generatedAliExpressUrl = '';
      let generatedMiraviaUrl = '';
      let aliExpressIdentityVerified = false;
      if (resolvedStore === 'AliExpress') {
        const submittedOwnedAffiliateUrl = isOwnedAliExpressAffiliateUrl(
          metadata.finalUrl || '',
          settings.aliexpressInvitationCode,
        ) && /^https:\/\/(?:s\.click|a)\.aliexpress\.com\//iu.test(url)
          ? url
          : '';
        generatedAliExpressUrl = submittedOwnedAffiliateUrl;
        try {
          const affiliateMetadata = await resolveAliExpressAffiliateProduct(metadata.finalUrl || url, {
            appKey: settings.aliexpressAppKey,
            appSecret: settings.aliexpressAppSecret,
            trackingId: settings.aliexpressTrackingId,
          });
          const canonicalProductId = aliexpressProductId(affiliateMetadata.canonicalUrl || metadata.finalUrl || url);
          generatedAliExpressUrl = String(affiliateMetadata.affiliateUrl || generatedAliExpressUrl || '');
          aliExpressIdentityVerified = Boolean(affiliateMetadata.identityVerified);
          metadata = {
            ...metadata,
            ...Object.fromEntries(Object.entries(affiliateMetadata)
              .filter(([key, value]) => key !== 'affiliateUrl' && value)),
            affiliateUrl: generatedAliExpressUrl,
            ...(submittedOwnedAffiliateUrl ? { ownedAffiliateUrl: submittedOwnedAffiliateUrl } : {}),
            ...(canonicalProductId ? { productId: canonicalProductId } : {}),
          };
          console.log(`AliExpress resolved product ${canonicalProductId || 'without-id'}; exact metadata=${affiliateMetadata.identityVerified ? 'yes' : 'page-fallback'}; own affiliate=${generatedAliExpressUrl ? 'yes' : 'no'}.`);
        } catch (error) {
          console.warn(`AliExpress affiliate lookup failed: ${safeError(error, settings.token)}`);
        }
      }
      if (resolvedStore === 'AliExpress'
        && aliExpressIdentityVerified
        && !metadataMatchesOfficialProduct(metadata.title, metadataFromForward.title)) {
        console.warn('Forwarded AliExpress card does not match the verified product; ignoring its copied title, photo and prices.');
        metadataFromForward = {};
      }
      if (resolvedStore === 'Miravia') {
        const submittedProductId = String(miraviaProductIdFromUrl(url) || miraviaProductIdFromUrl(metadata.affiliateUrl || '') || '');
        if (settings.awinFeedListUrl && (!metadata.title || !metadata.imageUrl || !metadata.price)) {
          try {
            const feedMetadata = await resolveMiraviaFeedMetadata(
              submittedProductId ? url : (metadata.finalUrl || url),
              settings.awinFeedListUrl,
            );
            metadata = mergeProductMetadata(feedMetadata, metadata);
            if (feedMetadata.finalUrl) metadata.finalUrl = feedMetadata.finalUrl;
            if (feedMetadata.productId) metadata.productId = feedMetadata.productId;
            console.log(`Miravia feed lookup product ${feedMetadata.productId || submittedProductId || 'without-id'}; metadata=${feedMetadata.title && feedMetadata.imageUrl ? 'yes' : 'no'}.`);
          } catch (error) {
            console.warn(`Miravia feed lookup failed: ${safeError(error, settings.token)}`);
          }
        }
        const productId = String(metadata.productId || submittedProductId || '');
        generatedMiraviaUrl = miraviaAffiliateUrl({
          productId,
          destinationUrl: metadata.finalUrl || '',
        });
        if (generatedMiraviaUrl && productId) metadata.productId = productId;
      }
      metadata = mergeProductMetadata(metadata, metadataFromForward);
      metadata = metadataWithOfficialAmazonImage(metadata.finalUrl || url, metadata);
      // A shortened link copied from another publisher must never reach the
      // channel unchanged. AliExpress and Miravia leave this block only with
      // a link generated for this account; a direct URL otherwise triggers a
      // controlled affiliate error below.
      const affiliateUrl = resolvedStore === 'Amazon'
        ? (metadata.finalUrl || url)
        : (resolvedStore === 'AliExpress'
          ? aliExpressPublicationUrl({
            generatedUrl: generatedAliExpressUrl,
            productId: metadata.productId,
            fallbackUrl: metadata.canonicalUrl || metadata.finalUrl || url,
          })
          : (resolvedStore === 'Miravia' && /^https:\/\/(?:www\.)?awin1\.com\//iu.test(generatedMiraviaUrl)
            ? generatedMiraviaUrl
            : (metadata.finalUrl || url)));
      if (resolvedStore === 'AliExpress' && !generatedAliExpressUrl) {
        metadata = {
          ...metadata,
          finalUrl: affiliateUrl,
          sourceUrl: affiliateUrl,
          affiliateUrl: '',
        };
      }
      const result = offerFromProductMetadata({ url: affiliateUrl, metadata, partnerTag: settings.amazonPartnerTag });
      if (result.status === 'ready') {
        const outcome = await queueOfferPreview(settings, pendingConfirmations, message.chat.id, result.offer, message);
        if (outcome.duplicate) {
          await reply(settings.token, message.chat.id, '♻️ No la publico porque he identificado el mismo producto que ya existe en el canal.');
        } else {
          await reply(settings.token, message.chat.id, '👀 Esta es la vista previa. Comprueba todos los datos y pulsa «✅ CONFIRMAR PUBLICACIÓN» solo si está correcta.');
        }
        delete pendingByChat[chatKey];
      } else if (result.status === 'needs_details') {
        pendingByChat[chatKey] = {
          url: affiliateUrl,
          metadata,
          draft: forwardedMetadata,
          messageId: pendingByChat[chatKey]?.messageId || message.message_id,
        };
        const missing = result.missing.join(', ');
        const retry = metadataError
          ? ' La tienda no ha dejado leer la ficha ahora mismo; pega el enlace directo del producto e inténtalo de nuevo en unos minutos.'
          : '';
        if (resolvedStore === 'AliExpress' && !generatedAliExpressUrl) {
          await reply(settings.token, message.chat.id, `He encontrado el producto, pero falta ${missing} y la API oficial de AliExpress no ha podido generar tu enlace afiliado. No publico el enlace original. Prueba con otra ficha del producto o vuelve a enviarlo más tarde.`);
        } else {
          await reply(settings.token, message.chat.id, `He encontrado el enlace, pero falta ${missing}.${retry} Si solo falta el precio, responde: “Precio: 19,99 €” y, si lo tienes, “Antes: 29,99 €”.`);
        }
      } else {
        // A community/deals page occasionally hides its merchant button from
        // GitHub. Preserve the factual card so the next direct shop URL can
        // reuse its title, price and Telegram photo instead of starting over.
        if (forwardedMetadata?.title || forwardedMetadata?.price || forwardedMetadata?.photoFileId) {
          pendingByChat[chatKey] = {
            draft: forwardedMetadata,
            messageId: pendingByChat[chatKey]?.messageId || message.message_id,
          };
        }
        await reply(settings.token, message.chat.id, `⚠️ ${result.message}`);
      }
      handled += 1;
    } else if (isAuthorizedChat && pendingByChat[chatKey]) {
      const pending = pendingByChat[chatKey];
      const amounts = requestedPrice(text);
      if (!amounts.price) {
        await reply(settings.token, message.chat.id, 'Necesito un precio válido, por ejemplo: Precio: 19,99 €');
      } else {
        const result = offerFromProductMetadata({
          url: pending.url,
          metadata: { ...metadataWithOfficialAmazonImage(pending.url, pending.metadata), ...amounts },
          partnerTag: settings.amazonPartnerTag,
        });
        if (result.status === 'ready') {
          // The requested price can arrive together with a replacement photo.
          // Keep it so a previously incomplete forwarded offer can finish.
          const newestPhoto = Array.isArray(message.photo) ? message.photo.at(-1)?.file_id : '';
          if (newestPhoto) result.offer.photoFileId = newestPhoto;
          const outcome = await queueOfferPreview(settings, pendingConfirmations, message.chat.id, result.offer, message);
          if (outcome.duplicate) {
            await reply(settings.token, message.chat.id, '♻️ No la publico porque he identificado el mismo producto que ya existe en el canal.');
          } else {
            await reply(settings.token, message.chat.id, '👀 Vista previa preparada. Revisa los datos y confirma con el botón; todavía no se ha publicado.');
          }
          delete pendingByChat[chatKey];
        } else {
          await reply(settings.token, message.chat.id, result.message
            ? `⚠️ ${result.message}`
            : `⚠️ Aún falta ${result.missing?.join(', ') || 'información'} para publicar.`);
        }
      }
      handled += 1;
    } else if (
      isAuthorizedChat
      && !/^\/(?:oferta|publicar)(?:@\w+)?\b/i.test(String(text).trim())
      && (message.forward_origin || message.forward_date || Array.isArray(message.photo))
    ) {
      const largestPhoto = Array.isArray(message.photo) ? message.photo.at(-1)?.file_id : '';
      pendingByChat[chatKey] = {
        draft: forwardedOfferMetadata(text, largestPhoto),
        messageId: message.message_id,
      };
      await reply(settings.token, message.chat.id, 'He guardado la foto, el título y los precios de la publicación. Telegram elimina los botones de compra al reenviarla, así que pega ahora el enlace de Amazon, AliExpress o Miravia y la publicaré con tu afiliado.');
      handled += 1;
    } else {
      const result = manualOfferFromMessage({
        text,
        photoFileId: largestPhoto,
        controlCode: settings.controlCode,
        authorized: isAuthorizedChat,
      });

      if (result.status === 'invalid') {
        await reply(settings.token, message.chat.id, `⚠️ ${result.message}`);
        handled += 1;
      } else if (result.status === 'ready') {
        const outcome = await queueOfferPreview(settings, pendingConfirmations, message.chat.id, result.offer, message);
        if (outcome.duplicate) {
          await reply(settings.token, message.chat.id, '♻️ No la publico porque he identificado el mismo producto que ya existe en el canal.');
        } else {
          await reply(settings.token, message.chat.id, '👀 Vista previa preparada. Pulsa «✅ CONFIRMAR PUBLICACIÓN» para enviarla al canal y a la web.');
        }
        handled += 1;
      } else if (result.status === 'unauthorized') {
        await reply(settings.token, message.chat.id, '⛔ Este chat no está autorizado para publicar ofertas.');
        handled += 1;
      } else {
        await reply(settings.token, message.chat.id, 'Pega un enlace de oferta o reenvía una publicación y después envía su enlace de compra.');
        handled += 1;
      }
    }
  } catch (error) {
    console.warn(`Telegram private message ${message.message_id} could not be processed: ${safeError(error, settings.token)}`);
    try {
      await reply(settings.token, message.chat.id, inboxFailureReply(error));
    } catch {
      // Avoid failing the complete scheduled publication when Telegram cannot send a response.
    }
  }
  processed.add(updateId);
}

// Source monitoring and confirmation callbacks both end here. This keeps one
// reviewed Amazon draft ready at a time and immediately advances to the next
// candidate after the owner confirms or cancels the previous one.
await queueNextAmazonReviewDraft(settings, pendingConfirmations);

writeJson(STATE_FILE, {
  processedUpdateIds: Array.from(processed).sort((left, right) => left - right).slice(-MAX_PROCESSED_UPDATES),
  authorizedChatIds: Array.from(authorizedChatIds).slice(-20),
  pendingByChat,
  pendingConfirmations,
  lastCheckedAt: new Date().toISOString(),
});
console.log(`Telegram private inbox handled ${handled} message(s) and published ${published} offer(s).`);
