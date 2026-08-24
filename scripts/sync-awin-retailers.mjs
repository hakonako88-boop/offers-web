import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import sharp from 'sharp';
import { createDealImageCard, dealImageCardFilename } from './deal-image-card.mjs';
import { filterDuplicateDeals } from './offer-deduplication.mjs';
import { isGzipFeed, parseFeedList } from './miravia-offers.mjs';
import {
  AWIN_RETAILERS,
  AWIN_RETAIL_QUALITY_POLICY_VERSION,
  formatRetailCaption,
  formatRetailTelegramCaption,
  normalizeRetailProduct,
  recordFromColumns,
  retailerFeedEntries,
  selectRetailerFeed,
} from './awin-retailers.mjs';

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, 'data', 'awin-retailers-discovery-state.json');
const PUBLISHED_FILE = path.join(ROOT, 'data', 'awin-retailers-publications.json');
const WEB_OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const WEB_IMAGES_DIR = path.join(ROOT, 'public', 'tg');
const MAX_PRODUCTS_SCANNED = 60_000;
const MAX_CANDIDATES = 50;
const MAX_PUBLICATION_ATTEMPTS = 15;
const MIN_IMAGE_DIMENSION = 500;

function readJson(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; } catch { return fallback; }
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function telegram(method, token, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
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
  const response = await fetch(url, { headers: { 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' }, signal: AbortSignal.timeout(20_000) });
  const type = response.headers.get('content-type') || '';
  if (!response.ok || !type.toLowerCase().startsWith('image/')) throw new Error(`image status ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const dimensions = await sharp(buffer, { failOn: 'none' }).metadata();
  if ((dimensions.width || 0) < MIN_IMAGE_DIMENSION || (dimensions.height || 0) < MIN_IMAGE_DIMENSION) throw new Error(`image too small (${dimensions.width || 0}x${dimensions.height || 0})`);
  return buffer;
}

async function publish(config, offer, originalImage) {
  const payload = { chat_id: config.channel, caption: formatRetailTelegramCaption(offer), parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '👉🏻 VER OFERTA', url: offer.url }]] } };
  try {
    const card = await createDealImageCard({ imageBuffer: originalImage, imageUrl: offer.image, store: offer.store, price: offer.priceLabel, previousPrice: offer.previousPriceLabel, discount: offer.discount });
    return telegramPhoto(config.token, payload, card, dealImageCardFilename(offer.storeSlug, offer.sourceProductId));
  } catch (error) {
    console.warn(`Could not create branded image for ${offer.id}: ${error.message}`);
    return telegram('sendPhoto', config.token, { ...payload, photo: offer.image });
  }
}

async function saveForWeb(offer, message, originalImage) {
  const filename = `awin-${offer.merchantId}-${String(offer.sourceProductId).replace(/[^a-z0-9_-]/gi, '-')}.jpg`;
  fs.mkdirSync(WEB_IMAGES_DIR, { recursive: true });
  await sharp(originalImage, { failOn: 'none' }).rotate().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toFile(path.join(WEB_IMAGES_DIR, filename));
  const existing = readJson(WEB_OFFERS_FILE, []);
  const record = {
    message_id: message.message_id,
    source_product_id: offer.id,
    date: Math.floor(Date.now() / 1000),
    title: offer.title,
    text: formatRetailCaption(offer),
    image: `/tg/${filename}`,
    url: offer.url,
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    store: offer.store,
    source: `awin-${offer.storeSlug}-feed`,
    source_url: '',
    category: offer.category,
    description: offer.title,
  };
  writeJson(WEB_OFFERS_FILE, [record, ...existing.filter((entry) => String(entry.source_product_id || '') !== offer.id)]);
}

class CsvChunkReader {
  constructor(onRow) { this.onRow = onRow; this.field = ''; this.row = []; this.inQuotes = false; this.closedQuote = false; this.stopped = false; }
  push(text) {
    for (const char of text) {
      if (this.inQuotes) { if (char === '"') { this.inQuotes = false; this.closedQuote = true; } else this.field += char; continue; }
      if (this.closedQuote) { if (char === '"') { this.field += '"'; this.inQuotes = true; this.closedQuote = false; continue; } this.closedQuote = false; }
      if (char === '"' && this.field === '') this.inQuotes = true;
      else if (char === ',') { this.row.push(this.field); this.field = ''; }
      else if (char === '\n') { this.row.push(this.field.replace(/\r$/, '')); this.field = ''; this.stopped = this.onRow(this.row) === false; this.row = []; if (this.stopped) return; }
      else this.field += char;
    }
  }
  finish() { if (this.stopped || (!this.field && !this.row.length)) return; this.row.push(this.field.replace(/\r$/, '')); this.onRow(this.row); }
}

async function discover(feedUrl, retailer, seenIds) {
  const response = await fetch(feedUrl, { headers: { 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' } });
  if (!response.ok || !response.body) throw new Error(`Awin product feed returned ${response.status}`);
  const candidates = [];
  let headers;
  let scanned = 0;
  const parser = new CsvChunkReader((row) => {
    if (!headers) { headers = row.map((header) => String(header || '').replace(/^\uFEFF/, '')); return true; }
    scanned += 1;
    const offer = normalizeRetailProduct(recordFromColumns(headers, row), retailer);
    if (offer && !seenIds.has(offer.id)) {
      candidates.push(offer);
      candidates.sort((a, b) => b.score - a.score);
      if (candidates.length > MAX_CANDIDATES) candidates.length = MAX_CANDIDATES;
    }
    return scanned < MAX_PRODUCTS_SCANNED;
  });
  const raw = Readable.fromWeb(response.body);
  const stream = isGzipFeed(feedUrl, response.headers.get('content-encoding')) ? raw.pipe(createGunzip()) : raw;
  const decoder = new TextDecoder();
  for await (const chunk of stream) { parser.push(decoder.decode(chunk, { stream: true })); if (parser.stopped) break; }
  parser.push(decoder.decode()); parser.finish();
  return { candidates, scanned };
}

const config = { feedListUrl: process.env.AWIN_FEED_LIST_URL_2021553, token: process.env.TELEGRAM_BOT_TOKEN, channel: process.env.TELEGRAM_CHANNEL_ID };
const missing = Object.entries({ AWIN_FEED_LIST_URL_2021553: config.feedListUrl, TELEGRAM_BOT_TOKEN: config.token, TELEGRAM_CHANNEL_ID: config.channel }).filter(([, value]) => !value).map(([key]) => key);
if (missing.length) { console.log(`Awin retailer discovery skipped: missing ${missing.join(', ')}`); process.exit(0); }

const state = readJson(STATE_FILE, { nextRetailer: 0, feedCursors: {}, feedVersions: {}, queuedOffers: {} });
const publicationState = readJson(PUBLISHED_FILE, { published: [] });
const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
const published = (publicationState.published || []).filter((entry) => Date.parse(entry.publishedAt || '') > cutoff);
const seenIds = new Set(published.map((entry) => entry.productId));
const existingWebOffers = readJson(WEB_OFFERS_FILE, []);
const listResponse = await fetch(config.feedListUrl, { headers: { 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' } });
if (!listResponse.ok) throw new Error(`Awin feed list returned ${listResponse.status}`);
const feedList = parseFeedList(await listResponse.text());
const retailer = AWIN_RETAILERS[Math.abs(Number(state.nextRetailer) || 0) % AWIN_RETAILERS.length];
const entries = retailerFeedEntries(feedList, retailer);
const feed = selectRetailerFeed(entries, state.feedCursors?.[retailer.merchantId] || 0);
if (!feed) throw new Error(`No Spanish ${retailer.store} feed is available in Awin publisher ${process.env.AWIN_PUBLISHER_ID || '2021553'}.`);

const feedVersion = `${AWIN_RETAIL_QUALITY_POLICY_VERSION}:${feed.last_imported || feed.last_checked || 'unknown'}`;
const queued = (state.queuedOffers?.[retailer.merchantId] || []).filter((offer) => offer?.id && !seenIds.has(offer.id));
const discovered = state.feedVersions?.[feed.feed_id] !== feedVersion || queued.length < 5 ? await discover(feed.url, retailer, seenIds) : { candidates: [], scanned: 0 };
const merged = [...new Map([...queued, ...discovered.candidates].map((offer) => [offer.id, offer])).values()];
const candidates = filterDuplicateDeals(merged, existingWebOffers).sort((a, b) => b.score - a.score);
let sent = 0;
let attempts = 0;
const attempted = new Set();
for (const offer of candidates.slice(0, MAX_PUBLICATION_ATTEMPTS)) {
  attempts += 1; attempted.add(offer.id);
  try {
    const originalImage = await verifiedImage(offer.image);
    const message = await publish(config, offer, originalImage);
    await saveForWeb(offer, message, originalImage);
    published.push({ productId: offer.id, publishedAt: new Date().toISOString(), telegramMessageId: message.message_id, price: offer.price, url: offer.url, title: offer.title, store: offer.store, source: `awin-${offer.storeSlug}-feed`, status: 'PUBLICADO' });
    seenIds.add(offer.id); sent = 1; break;
  } catch (error) { console.warn(`Could not publish ${offer.id}: ${error.message}`); }
}

const queues = { ...(state.queuedOffers || {}), [retailer.merchantId]: candidates.filter((offer) => !seenIds.has(offer.id) && !attempted.has(offer.id)).slice(0, MAX_CANDIDATES) };
writeJson(STATE_FILE, {
  nextRetailer: Number(state.nextRetailer || 0) + 1,
  feedCursors: { ...(state.feedCursors || {}), [retailer.merchantId]: Number(state.feedCursors?.[retailer.merchantId] || 0) + 1 },
  feedVersions: { ...(state.feedVersions || {}), [feed.feed_id]: feedVersion },
  queuedOffers: queues,
  lastRunAt: new Date().toISOString(), lastStore: retailer.store, lastFeedId: feed.feed_id, lastProductsScanned: discovered.scanned,
});
writeJson(PUBLISHED_FILE, { published });
console.log(`${retailer.store}: feed ${feed.feed_id}, ${discovered.scanned} products scanned, ${candidates.length} qualified offers, ${attempts} attempted and ${sent} published.`);
