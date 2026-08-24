import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { createDealImageCard, dealImageCardFilename } from './deal-image-card.mjs';
import { filterDuplicateDeals } from './offer-deduplication.mjs';
import {
  TRADEDOUBLER_MEDIAMARKT,
  TRADEDOUBLER_QUALITY_POLICY_VERSION,
  extractMediaMarktCandidates,
  formatMediaMarktTelegramCaption,
  formatMediaMarktWebsiteText,
  tradeDoublerProductsUrl,
} from './tradedoubler-mediamarkt.mjs';

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, 'data', 'tradedoubler-mediamarkt-discovery-state.json');
const PUBLISHED_FILE = path.join(ROOT, 'data', 'tradedoubler-mediamarkt-publications.json');
const WEB_OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const WEB_IMAGES_DIR = path.join(ROOT, 'public', 'tg');
const MAX_CANDIDATES = 60;
const MAX_PUBLICATION_ATTEMPTS = 15;
const MIN_IMAGE_DIMENSION = 600;

function readJson(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; } catch { return fallback; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function telegram(method, token, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`Telegram ${method} failed: ${data.description || response.status}`);
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
  if (!response.ok || !data.ok) throw new Error(`Telegram sendPhoto failed: ${data.description || response.status}`);
  return data.result;
}

async function verifiedImage(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' },
    signal: AbortSignal.timeout(20_000),
  });
  const type = response.headers.get('content-type') || '';
  if (!response.ok || !type.toLowerCase().startsWith('image/')) throw new Error(`image status ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const dimensions = await sharp(buffer, { failOn: 'none' }).metadata();
  if ((dimensions.width || 0) < MIN_IMAGE_DIMENSION || (dimensions.height || 0) < MIN_IMAGE_DIMENSION) {
    throw new Error(`image too small (${dimensions.width || 0}x${dimensions.height || 0})`);
  }
  return buffer;
}

async function publish(config, offer, originalImage) {
  const payload = {
    chat_id: config.channel,
    caption: formatMediaMarktTelegramCaption(offer),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: '👉🏻 VER OFERTA', url: offer.url }]] },
  };
  const card = await createDealImageCard({
    imageBuffer: originalImage,
    imageUrl: offer.image,
    store: offer.store,
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    discount: offer.discount,
  });
  return telegramPhoto(config.token, payload, card, dealImageCardFilename(offer.storeSlug, offer.sourceProductId));
}

async function saveForWeb(offer, message, originalImage) {
  const filename = `tradedoubler-${TRADEDOUBLER_MEDIAMARKT.programId}-${String(offer.sourceProductId).replace(/[^a-z0-9_-]/giu, '-')}.jpg`;
  fs.mkdirSync(WEB_IMAGES_DIR, { recursive: true });
  await sharp(originalImage, { failOn: 'none' }).rotate().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toFile(path.join(WEB_IMAGES_DIR, filename));
  const existing = readJson(WEB_OFFERS_FILE, []);
  const record = {
    message_id: message.message_id,
    source_product_id: offer.id,
    date: Math.floor(Date.now() / 1000),
    title: offer.title,
    text: formatMediaMarktWebsiteText(offer),
    image: `/tg/${filename}`,
    url: offer.url,
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    store: offer.store,
    source: 'tradedoubler-mediamarkt-feed',
    source_url: '',
    category: offer.category,
    description: offer.description,
  };
  writeJson(WEB_OFFERS_FILE, [record, ...existing.filter((entry) => String(entry.source_product_id || '') !== offer.id)]);
}

const config = {
  productsToken: process.env.TRADEDOUBLER_PRODUCTS_TOKEN,
  token: process.env.TELEGRAM_BOT_TOKEN,
  channel: process.env.TELEGRAM_CHANNEL_ID,
};
const missing = Object.entries({
  TRADEDOUBLER_PRODUCTS_TOKEN: config.productsToken,
  TELEGRAM_BOT_TOKEN: config.token,
  TELEGRAM_CHANNEL_ID: config.channel,
}).filter(([, value]) => !value).map(([key]) => key);
if (missing.length) {
  console.log(`MediaMarkt discovery skipped: missing ${missing.join(', ')}`);
  process.exit(0);
}

const state = readJson(STATE_FILE, { feedVersion: '', queuedOffers: [] });
const publicationState = readJson(PUBLISHED_FILE, { published: [] });
const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
const published = (publicationState.published || []).filter((entry) => Date.parse(entry.publishedAt || '') > cutoff);
const seenIds = new Set(published.map((entry) => entry.productId));
const existingWebOffers = readJson(WEB_OFFERS_FILE, []);

const response = await fetch(tradeDoublerProductsUrl(config.productsToken), {
  headers: { accept: 'application/json', 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' },
  signal: AbortSignal.timeout(45_000),
});
if (!response.ok) throw new Error(`TradeDoubler Products API returned ${response.status}`);
const payload = await response.json();
const feedVersion = `${TRADEDOUBLER_QUALITY_POLICY_VERSION}:${payload.productHeader?.totalHits || 0}:${payload.products?.[0]?.offers?.[0]?.modified || 'unknown'}`;
const queued = (state.queuedOffers || []).filter((offer) => offer?.id && !seenIds.has(offer.id));
const discovered = feedVersion === state.feedVersion ? [] : extractMediaMarktCandidates(payload, seenIds);
const candidates = [...queued, ...discovered]
  .filter((offer, index, list) => list.findIndex((entry) => entry.id === offer.id) === index)
  .sort((left, right) => right.score - left.score)
  .slice(0, MAX_CANDIDATES);

let sent = 0;
let attempts = 0;
const attempted = new Set();
for (const offer of candidates.slice(0, MAX_PUBLICATION_ATTEMPTS)) {
  attempts += 1;
  attempted.add(offer.id);
  const duplicate = filterDuplicateDeals([offer], existingWebOffers)[0];
  if (!duplicate) continue;
  try {
    const originalImage = await verifiedImage(offer.image);
    const message = await publish(config, offer, originalImage);
    await saveForWeb(offer, message, originalImage);
    published.push({ productId: offer.id, publishedAt: new Date().toISOString(), telegramMessageId: message.message_id, price: offer.price, url: offer.url, title: offer.title, store: offer.store, source: 'tradedoubler-mediamarkt-feed', status: 'PUBLICADO' });
    seenIds.add(offer.id);
    sent = 1;
    break;
  } catch (error) {
    console.warn(`MediaMarkt candidate ${offer.id} skipped: ${error.message}`);
  }
}

writeJson(STATE_FILE, {
  feedVersion,
  queuedOffers: candidates.filter((offer) => !seenIds.has(offer.id) && !attempted.has(offer.id)).slice(0, MAX_CANDIDATES),
  lastCheckedAt: new Date().toISOString(),
  lastResult: { totalHits: payload.productHeader?.totalHits || 0, qualified: candidates.length, attempted: attempts, published: sent },
});
writeJson(PUBLISHED_FILE, { published: published.slice(-1000) });
console.log(`MediaMarkt feed ${TRADEDOUBLER_MEDIAMARKT.feedId}: ${payload.productHeader?.totalHits || 0} total products, ${candidates.length} qualified offers, ${attempts} attempted and ${sent} published.`);
