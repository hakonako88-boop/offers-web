import { selectInterestingOffers } from './editorial-interest.mjs';
import { offerQuality } from './offer-quality-score.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import sharp from 'sharp';
import { createDealImageCard, dealImageCardFilename } from './deal-image-card.mjs';
import { mirrorTelegramMessage } from './telegram-mirror.mjs';
import { filterDuplicateDeals } from './offer-deduplication.mjs';
import { improveOfferTitle, offerReplyMarkup } from './offer-presentation.mjs';
import { isGzipFeed, parseFeedList } from './miravia-offers.mjs';
import { publicationAllowance, scheduleBypassEnabled } from './publication-policy.mjs';
import { communityMatchForTitle, discoverCommunitySignals } from './community-signals.mjs';
import { isSourceRetryReady } from './source-retry-policy.mjs';
import {
  AWIN_RETAILERS,
  AWIN_RETAIL_QUALITY_POLICY_VERSION,
  convertAwinProductLink,
  formatRetailCaption,
  formatRetailTelegramCaption,
  normalizeRetailProduct,
  recordFromColumns,
  retailQualityScore,
  retailerFeedEntries,
  selectRetailerFeed,
  socialImageFromHtml,
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

async function preferredOriginalImage(offer, retailer) {
  try {
    return { url: offer.image, buffer: await verifiedImage(offer.image) };
  } catch (thumbnailError) {
    const response = await fetch(offer.url, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ChollosAlDiaBot/1.0; +https://chollosaldia.com/aviso-legal)' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw thumbnailError;
    const finalUrl = new URL(response.url);
    const officialPage = retailer.domains.some((domain) => finalUrl.hostname === domain || finalUrl.hostname.endsWith(`.${domain}`));
    if (!officialPage) throw thumbnailError;
    const image = socialImageFromHtml(await response.text());
    if (!image || image === offer.image) throw thumbnailError;
    return { url: image, buffer: await verifiedImage(image) };
  }
}

async function publish(config, offer, originalImage) {
  const payload = { chat_id: config.channel, caption: formatRetailTelegramCaption(offer), parse_mode: 'HTML', reply_markup: offerReplyMarkup(offer) };
  try {
    const card = await createDealImageCard({ imageBuffer: originalImage, imageUrl: offer.image, store: offer.store, price: offer.priceLabel, previousPrice: offer.previousPriceLabel, discount: offer.discount, coupon: offer.coupon });
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
    source: offer.communitySource || `awin-${offer.storeSlug}-feed`,
    source_url: offer.communitySourceUrl || '',
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
const noloSignalRetryAfter = Object.fromEntries(Object.entries(state.noloSignalRetryAfter || {})
  .filter(([, retryAt]) => Date.parse(retryAt) > Date.now()));
const communityDiscovery = await discoverCommunitySignals({ state: { seen: [] }, includeAmazon: false, includeTelegramQueue: false });
const recentlyPublishedSignalIds = new Set(published.map((entry) => entry.communitySignalId).filter(Boolean));
const pendingNoloSignals = communityDiscovery.signals
  .filter((signal) => signal.source === 'nolodejesescapar'
    && signal.merchantUrl
    && !recentlyPublishedSignalIds.has(signal.id)
    && (process.env.FORCE_AUTOMATIC_PUBLICATION === 'true' || isSourceRetryReady(noloSignalRetryAfter[signal.id])))
  // Publish the newest source post first. Processing the oldest item in the
  // seven-day recovery window made a fresh deal wait behind stale failures.
  .sort((left, right) => Date.parse(right.publishedAt || '') - Date.parse(left.publishedAt || ''));
function awinSourceProductId(signal) {
  try {
    const url = new URL(signal.merchantUrl);
    const host = url.hostname.toLowerCase();
    if (host !== 'awin1.com' && host !== 'www.awin1.com') return '';
    return String(url.searchParams.get('p') || '').trim();
  } catch { return ''; }
}
const listResponse = await fetch(config.feedListUrl, { headers: { 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' } });
if (!listResponse.ok) throw new Error(`Awin feed list returned ${listResponse.status}`);
const feedList = parseFeedList(await listResponse.text());
const requestedRetailer = String(process.env.AWIN_RETAILER_SLUG || '').trim().toLowerCase();
const retailerForSignal = (signal) => AWIN_RETAILERS.find((entry) => entry.store === signal?.sourceStore);
const noloSignal = pendingNoloSignals.find((signal) => {
  const signalRetailer = retailerForSignal(signal);
  return signalRetailer && (!requestedRetailer || signalRetailer.slug === requestedRetailer) && awinSourceProductId(signal);
}) || null;
const retailer = AWIN_RETAILERS.find((entry) => entry.slug === requestedRetailer)
  || retailerForSignal(noloSignal)
  || AWIN_RETAILERS[Math.abs(Number(state.nextRetailer) || 0) % AWIN_RETAILERS.length];
const entries = retailerFeedEntries(feedList, retailer);
const feed = selectRetailerFeed(entries, state.feedCursors?.[retailer.merchantId] || 0);
if (!feed) throw new Error(`No Spanish ${retailer.store} feed is available in Awin publisher ${process.env.AWIN_PUBLISHER_ID || '2021553'}.`);
const retailerStateKey = retailer.merchantId;

const feedVersion = `${AWIN_RETAIL_QUALITY_POLICY_VERSION}:${feed.last_imported || feed.last_checked || 'unknown'}`;
const queued = (state.queuedOffers?.[retailerStateKey] || [])
  .filter((offer) => offer?.id && !seenIds.has(offer.id))
  .map((offer) => ({
    ...offer,
    score: retailQualityScore({ title: offer.title, category: offer.category, price: offer.price, oldPrice: offer.previousPrice }, retailer),
  }))
  .filter((offer) => offer.score > 0);
// A precise NoLo product id must be looked up in the current catalogue even
// when the generic editorial queue is already full. Otherwise a cached queue
// can never contain a newly published source product and the signal retries
// forever without being evaluated.
const discovered = noloSignal || state.feedVersions?.[feed.feed_id] !== feedVersion || queued.length < 5
  ? await discover(feed.url, retailer, seenIds)
  : { candidates: [], scanned: 0 };
const feedCandidates = [...new Map([...queued, ...discovered.candidates].map((offer) => [offer.id, offer])).values()];
const noloProductId = awinSourceProductId(noloSignal);
const matchedNoloCandidates = noloSignal
  ? feedCandidates.filter((offer) => {
      if (String(offer.sourceProductId) === noloProductId) return true;
      const match = communityMatchForTitle(offer.title, [noloSignal]);
      const sourcePrice = Number(noloSignal.price);
      const offerPrice = Number(offer.price);
      const priceTolerance = Math.max(0.5, sourcePrice * 0.03);
      return Boolean(match)
        && Number.isFinite(sourcePrice)
        && Number.isFinite(offerPrice)
        && Math.abs(offerPrice - sourcePrice) <= priceTolerance;
    }).map((offer) => ({
      ...offer,
      score: offer.score + 1_000,
      communitySignalId: noloSignal.id,
      communitySource: noloSignal.source,
      communitySourceUrl: noloSignal.sourceUrl,
    }))
  : [];
const directNoloUrl = noloSignal ? convertAwinProductLink(noloSignal.merchantUrl, retailer) : '';
const directNoloCandidate = noloSignal && directNoloUrl && noloSignal.sourceImageUrl && Number(noloSignal.price) > 0
  ? {
      id: `awin-${retailer.merchantId}-${noloProductId}`,
      sourceProductId: noloProductId,
      store: retailer.store,
      storeSlug: retailer.slug,
      merchantId: retailer.merchantId,
      title: improveOfferTitle(String(noloSignal.title || '').replace(/\s+(?:por|a)\s+\d+(?:[.,]\d{1,2})?\s*€\s*$/iu, '')),
      image: noloSignal.sourceImageUrl,
      url: directNoloUrl,
      price: Number(noloSignal.price),
      priceLabel: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(noloSignal.price)),
      previousPrice: Number(noloSignal.previousPrice) > Number(noloSignal.price) ? Number(noloSignal.previousPrice) : 0,
      previousPriceLabel: Number(noloSignal.previousPrice) > Number(noloSignal.price)
        ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(noloSignal.previousPrice))
        : '',
      discount: Number(noloSignal.previousPrice) > Number(noloSignal.price)
        ? Math.round(((Number(noloSignal.previousPrice) - Number(noloSignal.price)) / Number(noloSignal.previousPrice)) * 100)
        : 0,
      coupon: noloSignal.coupon || '',
      category: noloSignal.category || 'Tecnología',
      score: 1_000,
      communitySignalId: noloSignal.id,
      communitySource: noloSignal.source,
      communitySourceUrl: noloSignal.sourceUrl,
    }
  : null;
const noloCandidates = matchedNoloCandidates.length
  ? matchedNoloCandidates
  : (directNoloCandidate ? [directNoloCandidate] : []);
const merged = noloSignal ? noloCandidates : feedCandidates;
const candidates = selectInterestingOffers(filterDuplicateDeals(merged, existingWebOffers))
  .filter((offer) => offerQuality({ ...offer, date: Math.floor(Date.now() / 1000) }).publishable);
const publicationPolicy = publicationAllowance({ store: retailer.store, offers: existingWebOffers, bypass: scheduleBypassEnabled() });
const noloPublicationPolicy = noloSignal
  ? publicationAllowance({ store: retailer.store, offers: existingWebOffers, source: 'nolodejesescapar' })
  : publicationPolicy;
let sent = 0;
let attempts = 0;
const attempted = new Set();
for (const offer of ((noloSignal ? noloPublicationPolicy : publicationPolicy).allowed ? candidates : []).slice(0, MAX_PUBLICATION_ATTEMPTS)) {
  attempts += 1; attempted.add(offer.id);
  try {
    const preferredImage = await preferredOriginalImage(offer, retailer);
    offer.image = preferredImage.url;
    const originalImage = preferredImage.buffer;
    const message = await publish(config, offer, originalImage);
    await mirrorTelegramMessage({
      token: config.token,
      sourceChatId: config.channel,
      message,
      replyMarkup: offerReplyMarkup(offer),
    });
    await saveForWeb(offer, message, originalImage);
    published.push({ productId: offer.id, publishedAt: new Date().toISOString(), telegramMessageId: message.message_id, price: offer.price, url: offer.url, title: offer.title, store: offer.store, source: offer.communitySource || `awin-${offer.storeSlug}-feed`, sourceUrl: offer.communitySourceUrl || '', communitySignalId: offer.communitySignalId || '', status: 'PUBLICADO' });
    seenIds.add(offer.id); sent = 1; break;
  } catch (error) { console.warn(`Could not publish ${offer.id}: ${error.message}`); }
}

const queues = { ...(state.queuedOffers || {}), [retailerStateKey]: candidates.filter((offer) => !seenIds.has(offer.id) && !attempted.has(offer.id)).slice(0, MAX_CANDIDATES) };
const nextNoloSignalRetryAfter = { ...noloSignalRetryAfter };
if (noloSignal) {
  const wasPublished = published.some((entry) => entry.communitySignalId === noloSignal.id);
  if (wasPublished) delete nextNoloSignalRetryAfter[noloSignal.id];
  else nextNoloSignalRetryAfter[noloSignal.id] = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
}
writeJson(STATE_FILE, {
  nextRetailer: Number(state.nextRetailer || 0) + 1,
  feedCursors: { ...(state.feedCursors || {}), [retailerStateKey]: Number(state.feedCursors?.[retailerStateKey] || 0) + 1 },
  feedVersions: { ...(state.feedVersions || {}), [feed.feed_id]: feedVersion },
  queuedOffers: queues,
  noloSignalRetryAfter: Object.fromEntries(Object.entries(nextNoloSignalRetryAfter).slice(-500)),
  lastRunAt: new Date().toISOString(), lastStore: retailer.store, lastFeedId: feed.feed_id, lastProductsScanned: discovered.scanned,
});
writeJson(PUBLISHED_FILE, { published });
console.log(`${retailer.store}: feed ${feed.feed_id}, ${discovered.scanned} products scanned, ${candidates.length} qualified offers, ${attempts} attempted and ${sent} published.`);
