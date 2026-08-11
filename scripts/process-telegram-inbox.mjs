import fs from 'node:fs';
import path from 'node:path';
import {
  activateChatFromMessage,
  controlHelp,
  formatManualTelegramCaption,
  formatManualWebsiteText,
  manualOfferFromMessage,
  offerFromProductMetadata,
  storeFromUrl,
  forwardedOfferMetadata,
  urlFromTelegramMessage,
} from './telegram-inbox-commands.mjs';
import { extractProductMetadata, parsePrice } from './link-offer-extractor.mjs';
import { isEquivalentDeal } from './offer-deduplication.mjs';
import { resolveAliExpressAffiliateProduct } from './aliexpress-link-resolver.mjs';

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, 'data', 'telegram-inbox-state.json');
const OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const IMAGES_DIR = path.join(ROOT, 'public', 'tg');
const MAX_PROCESSED_UPDATES = 400;

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
  const channelMessage = await telegram(settings.token, 'sendPhoto', {
    chat_id: settings.channelId,
    photo: offer.photoFileId || offer.imageUrl,
    caption: formatManualTelegramCaption(offer),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: '👉🏻 VER OFERTA', url: offer.url }]],
    },
  });

  const postedPhotoId = channelMessage.photo?.at(-1)?.file_id || offer.photoFileId;
  if (!postedPhotoId) throw new Error('Telegram did not return a reusable product image.');
  const image = await mirrorTelegramPhoto(settings.token, postedPhotoId, channelMessage.message_id);
  const existingOffers = readJson(OFFERS_FILE, []);
  const record = {
    message_id: channelMessage.message_id,
    source_product_id: `manual-${inputMessage.message_id}`,
    date: Math.floor(Date.now() / 1000),
    title: offer.title,
    text: formatManualWebsiteText(offer),
    image,
    url: offer.url,
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    store: offer.store,
    category: offer.category,
    description: offer.description,
  };
  const withoutPriorVersion = existingOffers.filter((entry) => entry.source_product_id !== record.source_product_id);
  writeJson(OFFERS_FILE, [record, ...withoutPriorVersion]);
  return channelMessage;
}

async function publishIfNew(settings, offer, inputMessage) {
  const existingOffers = readJson(OFFERS_FILE, []);
  if (existingOffers.some((entry) => isEquivalentDeal(offer, entry))) return { duplicate: true };
  return { channelMessage: await publishManualOffer(settings, offer, inputMessage), duplicate: false };
}

function requestedPrice(text) {
  const priceMatch = String(text).match(/(?:precio|ahora)\s*:\s*([^\n]+)/iu);
  const previousMatch = String(text).match(/(?:antes|pvp)\s*:\s*([^\n]+)/iu);
  return {
    price: parsePrice(priceMatch?.[1] || text),
    previousPrice: parsePrice(previousMatch?.[1] || ''),
  };
}

const settings = config();
if (!settings.token || !settings.channelId) {
  console.log('Telegram inbox skipped: missing Telegram configuration.');
  process.exit(0);
}
if (!settings.controlCode) {
  console.log('Telegram inbox skipped: add the TELEGRAM_CONTROL_CODE secret to enable private commands.');
  process.exit(0);
}

const state = readJson(STATE_FILE, { processedUpdateIds: [] });
const processed = new Set((state.processedUpdateIds || []).map(Number));
const authorizedChatIds = new Set((state.authorizedChatIds || []).map(String));
const pendingByChat = state.pendingByChat && typeof state.pendingByChat === 'object' ? state.pendingByChat : {};
const updates = await telegram(settings.token, 'getUpdates', {
  limit: 100,
});

let published = 0;
let handled = 0;
for (const update of updates || []) {
  const updateId = Number(update.update_id);
  if (!Number.isFinite(updateId) || processed.has(updateId)) continue;
  const message = update.message;
  if (!message || message.chat?.type !== 'private') {
    processed.add(updateId);
    continue;
  }

  try {
    const text = message.caption || message.text || '';
    const chatKey = String(message.chat.id);
    const isAuthorizedChat = authorizedChatIds.has(chatKey) || (settings.allowedChatId && chatKey === String(settings.allowedChatId));
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
    } else if (isAuthorizedChat && urlFromTelegramMessage(message, text)) {
      const url = urlFromTelegramMessage(message, text);
      let metadata = await extractProductMetadata(url);
      const largestPhoto = Array.isArray(message.photo) ? message.photo.at(-1)?.file_id : '';
      const forwardedMetadata = pendingByChat[chatKey]?.draft || forwardedOfferMetadata(text, largestPhoto);
      metadata = {
        ...metadata,
        ...Object.fromEntries(Object.entries(forwardedMetadata).filter(([, value]) => value)),
      };
      if (storeFromUrl(url) === 'AliExpress' && (!metadata.title || !metadata.price || !/\.(?:jpe?g|png|webp)(?:[?#]|$)/iu.test(metadata.imageUrl))) {
        try {
          const affiliateMetadata = await resolveAliExpressAffiliateProduct(metadata.finalUrl || url, {
            appKey: settings.aliexpressAppKey,
            appSecret: settings.aliexpressAppSecret,
            trackingId: settings.aliexpressTrackingId,
          });
          metadata = {
            ...metadata,
            ...Object.fromEntries(Object.entries(affiliateMetadata).filter(([, value]) => value)),
          };
        } catch (error) {
          console.warn(`AliExpress affiliate lookup failed: ${safeError(error, settings.token)}`);
        }
      }
      const affiliateUrl = storeFromUrl(url) === 'Amazon' ? (metadata.finalUrl || url) : url;
      const result = offerFromProductMetadata({ url: affiliateUrl, metadata, partnerTag: settings.amazonPartnerTag });
      if (result.status === 'ready') {
        if (forwardedMetadata.photoFileId) result.offer.photoFileId = forwardedMetadata.photoFileId;
        const outcome = await publishIfNew(settings, result.offer, message);
        if (outcome.duplicate) {
          await reply(settings.token, message.chat.id, '♻️ Esa oferta o un producto equivalente ya está publicado. No la repito en el canal.');
        } else {
          await reply(settings.token, message.chat.id, `✅ Publicada en el canal y en Chollos al Día. Mensaje del canal: ${outcome.channelMessage.message_id}`);
          published += 1;
        }
        delete pendingByChat[chatKey];
      } else if (result.status === 'needs_details') {
        pendingByChat[chatKey] = { url: affiliateUrl, metadata };
        await reply(settings.token, message.chat.id, `He encontrado el enlace, pero la ficha no muestra ${result.missing.join(', ')}. Respóndeme solo con “Precio: 19,99 €” y, si lo tienes, “Antes: 29,99 €”.`);
      } else {
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
          metadata: { ...pending.metadata, ...amounts },
          partnerTag: settings.amazonPartnerTag,
        });
        if (result.status === 'ready') {
          const outcome = await publishIfNew(settings, result.offer, message);
          if (outcome.duplicate) {
            await reply(settings.token, message.chat.id, '♻️ Esa oferta o un producto equivalente ya está publicado. No la repito en el canal.');
          } else {
            await reply(settings.token, message.chat.id, `✅ Publicada en el canal y en Chollos al Día. Mensaje del canal: ${outcome.channelMessage.message_id}`);
            published += 1;
          }
          delete pendingByChat[chatKey];
        } else {
          await reply(settings.token, message.chat.id, `⚠️ Aún falta ${result.missing?.join(', ') || 'información'} para publicar.`);
        }
      }
      handled += 1;
    } else if (
      isAuthorizedChat
      && !/^\/publicar(?:@\w+)?\b/i.test(String(text).trim())
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
      const largestPhoto = Array.isArray(message.photo) ? message.photo.at(-1)?.file_id : '';
      const result = manualOfferFromMessage({
        text,
        photoFileId: largestPhoto,
        controlCode: settings.controlCode,
      });

      if (result.status === 'invalid') {
        await reply(settings.token, message.chat.id, `⚠️ ${result.message}`);
        handled += 1;
      } else if (result.status === 'ready') {
        const outcome = await publishIfNew(settings, result.offer, message);
        if (outcome.duplicate) {
          await reply(settings.token, message.chat.id, '♻️ Esa oferta o un producto equivalente ya está publicado. No la repito en el canal.');
        } else {
          await reply(settings.token, message.chat.id, `✅ Publicada en el canal y en Chollos al Día. Mensaje del canal: ${outcome.channelMessage.message_id}`);
          published += 1;
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
      await reply(settings.token, message.chat.id, '⚠️ No se pudo publicar la oferta. Revisa que el enlace, la foto y los precios estén completos e inténtalo de nuevo.');
    } catch {
      // Avoid failing the complete scheduled publication when Telegram cannot send a response.
    }
  }
  processed.add(updateId);
}

writeJson(STATE_FILE, {
  processedUpdateIds: Array.from(processed).sort((left, right) => left - right).slice(-MAX_PROCESSED_UPDATES),
  authorizedChatIds: Array.from(authorizedChatIds).slice(-20),
  pendingByChat,
  lastCheckedAt: new Date().toISOString(),
});
console.log(`Telegram private inbox handled ${handled} message(s) and published ${published} offer(s).`);
