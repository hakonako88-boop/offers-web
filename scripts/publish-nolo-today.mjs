import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { AMAZON_MARKETPLACE, formatAmazonCaption, formatAmazonTelegramCaption } from './amazon-offers.mjs';
import { amazonPageImage, canonicalAmazonAffiliateUrl, resolveAmazonAsin } from './amazon-review-drafts.mjs';
import { COMMUNITY_SOURCES, fetchRecentWordPressPosts, parseWordPressSignals } from './community-signals.mjs';
import { createDealImageCard, dealImageCardFilename } from './deal-image-card.mjs';
import { improveOfferTitle, offerReplyMarkup } from './offer-presentation.mjs';
import { amazonProductImageFromUrl } from './telegram-inbox-commands.mjs';
import { mirrorTelegramMessage } from './telegram-mirror.mjs';

const ROOT = process.cwd();
const OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const PUBLICATIONS_FILE = path.join(ROOT, 'data', 'amazon-publications.json');
const SOURCE = COMMUNITY_SOURCES.find((entry) => entry.id === 'nolodejesescapar');
const MADRID_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
});

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function euro(value) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value));
}

function sameMadridDay(value, now = Date.now()) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) && MADRID_DAY.format(new Date(time)) === MADRID_DAY.format(new Date(now));
}

function cleanSourceTitle(value = '') {
  return improveOfferTitle(String(value)
    .replace(/&#(\d+);/gu, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/giu, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/^(?:ofert[oó]n|chollazo|chollo|oferta|preciazo|rebaja|descuento|m[ií]nimo\s+hist[oó]rico)\s+(?:amazon\s*)?[!·:—-]*\s*/iu, '')
    .replace(/\s+(?:por|a)\s+\d+(?:[.,]\d{1,2})?\s*€\s*$/iu, '')
    .trim());
}

export async function todayNoloAmazonCandidates({ fetchImpl = fetch, now = Date.now(), posts } = {}) {
  const sourcePosts = posts || await fetchRecentWordPressPosts({ fetchImpl, now, maxPages: 2 });
  const signals = parseWordPressSignals(SOURCE, sourcePosts, 500)
    .filter((signal) => signal.sourceStore === 'Amazon' && sameMadridDay(signal.publishedAt, now) && signal.price > 0);
  const candidates = [];
  for (const signal of signals) {
    const asin = await resolveAmazonAsin(signal.merchantUrl, fetchImpl);
    if (!asin) continue;
    candidates.push({
      asin,
      title: cleanSourceTitle(signal.title),
      priceAmount: signal.price,
      price: euro(signal.price),
      previousPrice: signal.previousPrice > signal.price ? euro(signal.previousPrice) : '',
      previousPriceAmount: signal.previousPrice > signal.price ? signal.previousPrice : 0,
      discount: signal.previousPrice > signal.price
        ? Math.round(((signal.previousPrice - signal.price) / signal.previousPrice) * 100)
        : 0,
      coupon: signal.coupon || '',
      category: signal.category,
      sourceUrl: signal.sourceUrl,
      sourceImageUrl: signal.sourceImageUrl,
      sourceSignalId: signal.id,
      publishedAt: signal.publishedAt,
    });
  }
  return [...new Map(candidates.map((offer) => [offer.asin, offer])).values()];
}

async function telegramJson(method, token, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`Telegram ${method}: ${data.description || response.status}`);
  return data.result;
}

async function telegramPhoto(token, payload, photo, filename) {
  const form = new FormData();
  form.set('chat_id', String(payload.chat_id));
  form.set('caption', payload.caption);
  form.set('parse_mode', payload.parse_mode);
  form.set('reply_markup', JSON.stringify(payload.reply_markup));
  form.set('photo', new Blob([photo], { type: 'image/jpeg' }), filename);
  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`Telegram sendPhoto: ${data.description || response.status}`);
  return data.result;
}

async function firstWorkingCard(offer, imageCandidates) {
  let lastError;
  for (const imageUrl of imageCandidates) {
    try {
      const card = await createDealImageCard({
        imageUrl, store: 'Amazon', price: offer.price, previousPrice: offer.previousPrice,
        discount: offer.discount, coupon: offer.coupon,
      });
      return { card, imageUrl };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('No se encontró una fotografía válida.');
}

function webRecord(offer, message, image) {
  return {
    message_id: message.message_id,
    source_product_id: `amazon-${offer.asin}`,
    date: Math.floor(Date.now() / 1000),
    title: offer.title,
    text: formatAmazonCaption(offer),
    image,
    url: offer.url,
    price: offer.price,
    previousPrice: offer.previousPrice,
    store: 'Amazon',
    source: 'nolodejesescapar',
    source_url: offer.sourceUrl,
    category: offer.category,
    description: offer.title,
  };
}

export async function main() {
  const config = {
    token: process.env.TELEGRAM_BOT_TOKEN,
    channelId: process.env.TELEGRAM_CHANNEL_ID,
    partnerTag: process.env.AMAZON_PARTNER_TAG || 'chollos00a-21',
    gapMs: Math.max(1_500, Number(process.env.NOLO_BATCH_GAP_MS) || 8_000),
  };
  const dryRun = process.argv.includes('--dry-run');
  if (!dryRun && (!config.token || !config.channelId || !config.partnerTag)) {
    throw new Error('Faltan TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID o AMAZON_PARTNER_TAG.');
  }

  const candidates = await todayNoloAmazonCandidates();
  const offers = readJson(OFFERS_FILE, []);
  const publicationState = readJson(PUBLICATIONS_FILE, { published: [] });
  const knownAsins = new Set([
    ...offers.map((entry) => String(entry.source_product_id || '').match(/amazon[:-]([a-z0-9]{10})/iu)?.[1]?.toUpperCase()).filter(Boolean),
    ...(publicationState.published || []).map((entry) => String(entry.asin || '').toUpperCase()).filter(Boolean),
  ]);
  const pending = candidates.filter((offer) => !knownAsins.has(offer.asin));
  console.log(`NoLoDejesEscapar hoy: ${candidates.length} productos directos; ${pending.length} pendientes; ${candidates.length - pending.length} duplicados.`);
  if (dryRun) {
    for (const offer of pending) console.log(`${offer.asin} | ${offer.price} | ${offer.title}`);
    return;
  }

  let sent = 0;
  for (const candidate of pending) {
    const url = canonicalAmazonAffiliateUrl(candidate.asin, config.partnerTag);
    const pageImage = await amazonPageImage(url);
    const imageCandidates = [...new Set([
      pageImage,
      amazonProductImageFromUrl(url),
      candidate.sourceImageUrl,
    ].filter(Boolean))];
    const offer = {
      ...candidate,
      url,
      image: imageCandidates[0] || '',
      checkedAt: new Date().toISOString(),
      marketplace: AMAZON_MARKETPLACE,
      communitySource: 'nolodejesescapar',
      communitySourceUrl: candidate.sourceUrl,
    };
    try {
      const { card, imageUrl } = await firstWorkingCard(offer, imageCandidates);
      offer.image = imageUrl;
      const presentation = { ...offer, id: `amazon-${offer.asin}`, store: 'Amazon', storeSlug: 'amazon' };
      const replyMarkup = offerReplyMarkup(presentation);
      const message = await telegramPhoto(config.token, {
        chat_id: config.channelId,
        caption: formatAmazonTelegramCaption(offer),
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }, card, dealImageCardFilename('amazon', offer.asin));
      await mirrorTelegramMessage({
        token: config.token, sourceChatId: config.channelId, message, replyMarkup,
      });

      offers.unshift(webRecord(offer, message, imageUrl));
      publicationState.published ||= [];
      publicationState.published.push({
        asin: offer.asin,
        publishedAt: new Date().toISOString(),
        telegramMessageId: message.message_id,
        price: offer.price,
        url: offer.url,
        source: 'nolodejesescapar',
        sourceUrl: offer.sourceUrl,
        communitySignalId: offer.sourceSignalId,
      });
      knownAsins.add(offer.asin);
      writeJson(OFFERS_FILE, offers);
      writeJson(PUBLICATIONS_FILE, publicationState);
      sent += 1;
      console.log(`Publicado ${sent}/${pending.length}: ${offer.asin} · Telegram ${message.message_id}`);
      if (sent < pending.length) await new Promise((resolve) => setTimeout(resolve, config.gapMs));
    } catch (error) {
      console.warn(`Omitido ${candidate.asin}: ${error instanceof Error ? error.message : error}`);
    }
  }
  console.log(`Lote terminado: ${sent} nuevas ofertas publicadas de ${pending.length} pendientes.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
