import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import sharp from 'sharp';
import { offerReplyMarkup } from './offer-presentation.mjs';
import {
  formatMiraviaCaption,
  formatMiraviaTelegramCaption,
  highResolutionMiraviaImage,
  isMiraviaProductImageLargeEnough,
  isGzipFeed,
  MIRAVIA_QUALITY_POLICY_VERSION,
  miraviaFeedEntries,
  miraviaRecordFromColumns,
  normalizeMiraviaProduct,
  miraviaCommunityQualityScore,
  parseFeedList,
  productImageFromPage,
  selectMiraviaFeed,
} from './miravia-offers.mjs';
import { filterDuplicateDeals } from './offer-deduplication.mjs';
import { communityMatchForTitle, discoverCommunitySignals } from './community-signals.mjs';
import { createDealImageCard, dealImageCardFilename } from './deal-image-card.mjs';
import { miraviaAffiliateUrl, miraviaProductIdFromUrl } from './miravia-affiliate-resolver.mjs';
import { resolveMiraviaFeedMetadata } from './miravia-link-metadata.mjs';
import { extractProductMetadata } from './link-offer-extractor.mjs';
import { publicationAllowance, scheduleBypassEnabled } from './publication-policy.mjs';

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, 'data', 'miravia-discovery-state.json');
const PUBLISHED_FILE = path.join(ROOT, 'data', 'miravia-publications.json');
const WEB_OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const WEB_IMAGES_DIR = path.join(ROOT, 'public', 'tg');
const COMMUNITY_STATE_FILE = path.join(ROOT, 'data', 'miravia-community-signal-state.json');
const MAX_POSTS_PER_RUN = process.env.TELEGRAM_SOURCE_QUEUE_MODE === 'true' ? 3 : 1;
const MAX_PUBLICATION_ATTEMPTS = 12;
const MAX_PRODUCTS_SCANNED = 40000;
const MAX_CANDIDATES = 60;
const MINIMUM_PUBLICATION_INTERVAL_MS = 3 * 60 * 60 * 1000;
const COMMUNITY_REFRESH_MS = 2 * 60 * 60 * 1000;
const COMMUNITY_SIGNAL_RETENTION_MS = 48 * 60 * 60 * 1000;

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

function getConfig() {
  return {
    feedListUrl: process.env.AWIN_FEED_LIST_URL,
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChannelId: process.env.TELEGRAM_CHANNEL_ID,
  };
}

function missingConfig(config) {
  return Object.entries({
    AWIN_FEED_LIST_URL: config.feedListUrl,
    TELEGRAM_BOT_TOKEN: config.telegramToken,
    TELEGRAM_CHANNEL_ID: config.telegramChannelId,
  }).filter(([, value]) => !value).map(([name]) => name);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function euro(value) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

async function resolvedMiraviaSignalUrl(signal) {
  const submitted = String(signal.merchantUrl || '');
  try {
    const response = await fetch(submitted, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ChollosAlDiaBot/1.0; +https://chollosaldia.com)' },
      signal: AbortSignal.timeout(15_000),
    });
    const finalUrl = new URL(response.url);
    const host = finalUrl.hostname.toLowerCase();
    return host === 'miravia.es' || host.endsWith('.miravia.es') ? finalUrl.toString() : '';
  } catch {
    return '';
  }
}

function exactMiraviaOffer(metadata, signal, destinationUrl) {
  const id = String(metadata.productId || '').trim();
  const title = String(metadata.title || '').trim();
  const image = String(metadata.imageUrl || '').trim();
  const price = Number(metadata.price) || Number(signal.price) || 0;
  const previousPrice = Number(metadata.previousPrice) || Number(signal.previousPrice) || 0;
  const url = miraviaAffiliateUrl({ productId: id, destinationUrl });
  if (!id || !title || !image || !price || !url) return null;
  const discount = previousPrice > price ? Math.round(((previousPrice - price) / previousPrice) * 100) : 0;
  const editorialScore = miraviaCommunityQualityScore({
    title,
    price,
    oldPrice: previousPrice,
    sourceWeight: signal.sourceWeight,
  });
  if (!editorialScore) return null;
  return {
    id: `miravia-${id}`,
    sourceProductId: id,
    store: 'Miravia',
    title,
    image,
    url,
    price,
    priceLabel: euro(price),
    previousPrice: previousPrice > price ? previousPrice : 0,
    previousPriceLabel: previousPrice > price ? euro(previousPrice) : '',
    discount,
    category: signal.category || 'Miravia',
    titleTerms: signal.terms || [],
    score: 2_000 + editorialScore,
    communitySignalId: signal.id,
    communitySource: signal.source,
    communitySourceUrl: signal.sourceUrl,
  };
}

async function telegram(method, token, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description || response.status}`);
  }
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

async function publishOffer(config, offer) {
  const payload = {
    chat_id: config.telegramChannelId,
    caption: formatMiraviaTelegramCaption(offer),
    parse_mode: 'HTML',
    reply_markup: offerReplyMarkup(offer),
  };
  try {
    const card = await createDealImageCard({
      imageUrl: offer.image,
      store: 'Miravia',
      price: offer.priceLabel,
      previousPrice: offer.previousPriceLabel,
      discount: offer.discount,
    });
    return telegramPhoto(config.telegramToken, payload, card, dealImageCardFilename('miravia', offer.id));
  } catch (error) {
    console.warn(`Could not build the branded Miravia image for ${offer.id}: ${error.message}`);
    return telegram('sendPhoto', config.telegramToken, { ...payload, photo: offer.image });
  }
}

async function preferredMiraviaImage(offer) {
  let imageUrl = highResolutionMiraviaImage(offer.image);
  try {
    const response = await fetch(offer.url, {
      headers: { 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`product page status ${response.status}`);
    const productHost = new URL(response.url).hostname.toLowerCase();
    const isOfficialProductPage = productHost === 'miravia.es' || productHost.endsWith('.miravia.es');
    imageUrl = productImageFromPage(
      await response.text(),
      highResolutionMiraviaImage(offer.image),
      { allowExternalCdn: isOfficialProductPage },
    );
  } catch (error) {
    console.warn(`Could not obtain a high-resolution Miravia image for ${offer.sourceProductId}: ${error.message}`);
  }

  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.toLowerCase().startsWith('image/')) throw new Error(`Miravia image status ${response.status}`);
  const image = Buffer.from(await response.arrayBuffer());
  const dimensions = await sharp(image, { failOn: 'none' }).metadata();
  if (!isMiraviaProductImageLargeEnough(image.byteLength, dimensions)) {
    throw new Error(`Miravia image is too small (${image.byteLength} bytes, ${dimensions.width || 0}x${dimensions.height || 0}px)`);
  }
  return imageUrl;
}

async function mirrorImageForWeb(offer, imageUrl = offer.image) {
  const filename = `miravia-${offer.sourceProductId}.jpg`;
  const localImage = path.join(WEB_IMAGES_DIR, filename);
  const existingBytes = fs.existsSync(localImage) ? fs.statSync(localImage).size : 0;
  // Do not repeatedly download good originals, but give old catalogue
  // thumbnails a chance to be replaced when a better rendition is available.
  if (existingBytes) {
    try {
      const existingDimensions = await sharp(localImage, { failOn: 'none' }).metadata();
      if (isMiraviaProductImageLargeEnough(existingBytes, existingDimensions)) return `/tg/${filename}`;
    } catch {
      // A corrupt legacy cache entry is replaced by the verified download.
    }
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`image status ${response.status}`);
    const image = Buffer.from(await response.arrayBuffer());
    const dimensions = await sharp(image, { failOn: 'none' }).metadata();
    if (!isMiraviaProductImageLargeEnough(image.length, dimensions)) {
      throw new Error(`image too small (${image.length} bytes, ${dimensions.width || 0}x${dimensions.height || 0}px)`);
    }
    fs.mkdirSync(WEB_IMAGES_DIR, { recursive: true });
    fs.writeFileSync(localImage, image);
    return `/tg/${filename}`;
  } catch (error) {
    console.warn(`Could not mirror Miravia image ${offer.sourceProductId}: ${error.message}`);
    return imageUrl;
  }
}

async function saveOfferForWeb(offer, message) {
  const existingOffers = readJson(WEB_OFFERS_FILE, []);
  const image = await mirrorImageForWeb(offer, offer.image);
  const record = {
    message_id: message.message_id,
    source_product_id: offer.id,
    date: Math.floor(Date.now() / 1000),
    title: offer.title,
    text: formatMiraviaCaption(offer),
    image,
    url: offer.url,
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    store: 'Miravia',
    source: offer.communitySource || 'miravia-awin-feed',
    source_url: offer.communitySourceUrl || '',
    category: offer.category,
    description: offer.title,
  };
  const withoutPreviousVersion = existingOffers.filter((entry) => String(entry.source_product_id || '') !== offer.id);
  writeJson(WEB_OFFERS_FILE, [record, ...withoutPreviousVersion]);
}

class CsvChunkReader {
  constructor(onRow) {
    this.onRow = onRow;
    this.field = '';
    this.row = [];
    this.inQuotes = false;
    this.closedQuote = false;
    this.stopped = false;
  }

  push(text) {
    for (const char of text) {
      if (this.inQuotes) {
        if (char === '"') {
          this.inQuotes = false;
          this.closedQuote = true;
        } else {
          this.field += char;
        }
        continue;
      }

      if (this.closedQuote) {
        if (char === '"') {
          this.field += '"';
          this.inQuotes = true;
          this.closedQuote = false;
          continue;
        }
        this.closedQuote = false;
      }

      if (char === '"' && this.field === '') {
        this.inQuotes = true;
      } else if (char === ',') {
        this.row.push(this.field);
        this.field = '';
      } else if (char === '\n') {
        this.row.push(this.field.replace(/\r$/, ''));
        this.field = '';
        this.stopped = this.onRow(this.row) === false;
        this.row = [];
        if (this.stopped) return;
      } else {
        this.field += char;
      }
    }
  }

  finish() {
    if (this.stopped || !this.field && !this.row.length) return;
    this.row.push(this.field.replace(/\r$/, ''));
    this.onRow(this.row);
    this.field = '';
    this.row = [];
  }
}

async function discoverCandidates(feedUrl, seenProductIds) {
  const response = await fetch(feedUrl, {
    headers: { 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' },
  });
  if (!response.ok || !response.body) throw new Error(`Awin product feed returned ${response.status}`);

  const decoder = new TextDecoder('utf-8');
  const candidates = [];
  let headers = null;
  let productsScanned = 0;
  const reader = new CsvChunkReader((row) => {
    if (!headers) {
      headers = row.map((header) => String(header || '').replace(/^\uFEFF/, ''));
      return true;
    }
    productsScanned += 1;
    const offer = normalizeMiraviaProduct(miraviaRecordFromColumns(headers, row));
    if (offer && !seenProductIds.has(offer.id)) {
      candidates.push(offer);
      candidates.sort((left, right) => right.score - left.score);
      if (candidates.length > MAX_CANDIDATES) candidates.length = MAX_CANDIDATES;
    }
    return productsScanned < MAX_PRODUCTS_SCANNED;
  });

  const rawStream = Readable.fromWeb(response.body);
  const feedStream = isGzipFeed(feedUrl, response.headers.get('content-encoding'))
    ? rawStream.pipe(createGunzip())
    : rawStream;

  for await (const chunk of feedStream) {
    reader.push(decoder.decode(chunk, { stream: true }));
    if (reader.stopped) break;
  }
  reader.push(decoder.decode());
  reader.finish();
  return { candidates, productsScanned };
}

const config = getConfig();
const missing = missingConfig(config);
if (missing.length) {
  console.log(`Miravia discovery skipped: missing ${missing.join(', ')}`);
  process.exit(0);
}

// Awin recommends avoiding the exact start of the hour; this small stagger prevents
// the scheduled workflow from hitting its product servers at their busiest point.
await sleep(10000 + Math.floor(Math.random() * 15000));

const state = readJson(STATE_FILE, { nextFeed: 0, feedVersions: {} });
const publicationState = readJson(PUBLISHED_FILE, { published: [] });
const storedCommunityState = readJson(COMMUNITY_STATE_FILE, { recentSignals: [] });
const existingWebOffers = readJson(WEB_OFFERS_FILE, []);
const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
const published = (publicationState.published || []).filter((entry) => Date.parse(entry.publishedAt || '') > cutoff);
const seenProductIds = new Set(published.map((entry) => entry.productId));
const lastPublicationAt = published.reduce((latest, entry) => Math.max(latest, Date.parse(entry.publishedAt || '') || 0), 0);
const canPublishToday = process.env.FORCE_AUTOMATIC_PUBLICATION === 'true'
  || !lastPublicationAt
  || (Date.now() - lastPublicationAt) >= MINIMUM_PUBLICATION_INTERVAL_MS;
const publicationPolicy = publicationAllowance({ store: 'Miravia', offers: existingWebOffers, bypass: scheduleBypassEnabled() });

const signalCutoff = Date.now() - COMMUNITY_SIGNAL_RETENTION_MS;
const pendingMiraviaQueueIds = new Set(readJson(path.join(ROOT, 'data', 'telegram-source-queue.json'), { items: [] }).items
  .filter((item) => item.status === 'pending' && item.store === 'Miravia')
  .map((item) => item.id));
let communitySignals = (storedCommunityState.recentSignals || [])
  .filter((signal) => !signal.queueItemId || signal.sourceStore === 'Miravia')
  .filter((signal) => !Number.isFinite(Date.parse(signal.publishedAt || '')) || Date.parse(signal.publishedAt) > signalCutoff);
const lastCommunityCheck = Date.parse(storedCommunityState.lastCheckedAt || '');
let communityHealth = storedCommunityState.sourceHealth || [];
let micholloLastCheckedAt = storedCommunityState.micholloLastCheckedAt;
if (process.env.TELEGRAM_SOURCE_QUEUE_MODE === 'true' || !Number.isFinite(lastCommunityCheck) || Date.now() - lastCommunityCheck >= COMMUNITY_REFRESH_MS) {
  const discovery = await discoverCommunitySignals({ state: { ...storedCommunityState, seen: [] } });
  const mergedSignals = new Map(communitySignals.map((signal) => [signal.id, signal]));
  for (const signal of discovery.signals.filter((entry) => !entry.queueItemId || entry.sourceStore === 'Miravia')) mergedSignals.set(signal.id, signal);
  communitySignals = [...mergedSignals.values()]
    .filter((signal) => !Number.isFinite(Date.parse(signal.publishedAt || '')) || Date.parse(signal.publishedAt) > signalCutoff)
    .sort((left, right) => Number(right.sourceWeight || 0) - Number(left.sourceWeight || 0))
    .slice(0, 80);
  communityHealth = discovery.sourceHealth;
  if (discovery.sourceHealth.some((entry) => entry.source === 'michollo' && entry.status !== 'deferred')) {
    micholloLastCheckedAt = discovery.checkedAt;
  }
  writeJson(COMMUNITY_STATE_FILE, {
    recentSignals: communitySignals,
    lastCheckedAt: discovery.checkedAt,
    micholloLastCheckedAt,
    sourceHealth: communityHealth,
  });
}

const listResponse = await fetch(config.feedListUrl, {
  headers: { 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' },
});
if (!listResponse.ok) throw new Error(`Awin feed list returned ${listResponse.status}`);

const entries = miraviaFeedEntries(parseFeedList(await listResponse.text()));
const feed = selectMiraviaFeed(entries, state.nextFeed);
if (!feed) throw new Error('No Spanish Miravia product feed is available for this publisher account.');

// Resolve every queued tidd.ly link to the official Miravia product first.
// The exact identities embedded in /p/i…-s….html are then looked up in this
// publisher's private Awin feeds, so neither another channel's photo nor its
// affiliate tracking is reused.
const exactQueueCandidates = [];
for (const signal of communitySignals.filter((entry) => pendingMiraviaQueueIds.has(entry.queueItemId)).slice(0, 3)) {
  try {
    const destinationUrl = await resolvedMiraviaSignalUrl(signal);
    let metadata = destinationUrl ? await extractProductMetadata(destinationUrl).catch(() => ({})) : {};
    if (destinationUrl && (!metadata.title || !metadata.imageUrl || !metadata.price)) {
      const feedMetadata = await resolveMiraviaFeedMetadata(destinationUrl, config.feedListUrl);
      metadata = {
        ...metadata,
        ...Object.fromEntries(Object.entries(feedMetadata).filter(([, value]) => value)),
      };
    }
    if (!metadata.productId) metadata.productId = miraviaProductIdFromUrl(metadata.finalUrl || destinationUrl);
    const exactOffer = exactMiraviaOffer(metadata, signal, metadata.finalUrl || destinationUrl);
    if (exactOffer && !seenProductIds.has(exactOffer.id)) exactQueueCandidates.push(exactOffer);
    else console.warn(`Exact Miravia queue item ${signal.id} could not be verified in the Awin feed.`);
  } catch (error) {
    console.warn(`Exact Miravia queue item ${signal.id} failed: ${error.message}`);
  }
}

// Al cambiar la política editorial volvemos a evaluar cada feed una vez, sin
// olvidar los productos que ya se publicaron durante el último año.
const feedVersion = `${MIRAVIA_QUALITY_POLICY_VERSION}:${String(feed.last_imported || feed.last_checked || 'unknown')}`;
const alreadyChecked = state.feedVersions?.[feed.feed_id] === feedVersion;
let discovered = { candidates: [], productsScanned: 0 };
const queuedOffers = (state.queuedOffers || []).filter((offer) => offer?.id && !seenProductIds.has(offer.id));
if (!alreadyChecked || queuedOffers.length < 5) {
  discovered = await discoverCandidates(feed.url, seenProductIds);
} else {
  console.log(`Miravia feed ${feed.feed_id} is unchanged; using ${queuedOffers.length} validated queued candidates.`);
}

const mergedCandidates = Array.from(new Map(
  [...exactQueueCandidates, ...queuedOffers, ...discovered.candidates].map((offer) => [offer.id, offer]),
).values()).map((offer) => {
  const exactCommunityMatch = communitySignals.find((signal) => {
    const linkedProductId = miraviaProductIdFromUrl(signal.merchantUrl || '');
    return linkedProductId && linkedProductId === String(offer.sourceProductId || offer.id || '');
  });
  const communityMatch = exactCommunityMatch
    ? {
        id: exactCommunityMatch.id,
        source: exactCommunityMatch.source,
        sourceUrl: exactCommunityMatch.sourceUrl,
        score: 100 + Number(exactCommunityMatch.sourceWeight || 0),
      }
    : communityMatchForTitle(offer.title, communitySignals);
  return communityMatch ? {
    ...offer,
    score: offer.score + 1_000 + communityMatch.score,
    communitySignalId: communityMatch.id,
    communitySource: communityMatch.source,
    communitySourceUrl: communityMatch.sourceUrl,
  } : offer;
});

const eligibleCandidates = filterDuplicateDeals(mergedCandidates, existingWebOffers)
  .sort((left, right) => right.score - left.score);
const candidates = canPublishToday && publicationPolicy.allowed ? eligibleCandidates : [];

let sent = 0;
let attempted = 0;
const attemptedProductIds = new Set();
for (const offer of candidates.slice(0, MAX_PUBLICATION_ATTEMPTS)) {
  if (sent >= Math.min(MAX_POSTS_PER_RUN, publicationPolicy.remaining)) break;
  attempted += 1;
  attemptedProductIds.add(offer.id);
  try {
    offer.image = await preferredMiraviaImage(offer);
    const message = await publishOffer(config, offer);
    await saveOfferForWeb(offer, message);
    published.push({
      productId: offer.id,
      publishedAt: new Date().toISOString(),
      telegramMessageId: message.message_id,
      price: offer.price,
      url: offer.url,
      title: offer.title,
      store: 'Miravia',
      source: offer.communitySource || 'miravia-awin-feed',
      sourceUrl: offer.communitySourceUrl || '',
      communitySignalId: offer.communitySignalId || '',
      status: 'PUBLICADO',
    });
    seenProductIds.add(offer.id);
    sent += 1;
  } catch (error) {
    console.warn(`Could not publish Miravia product ${offer.sourceProductId}: ${error.message}`);
  }
}

writeJson(STATE_FILE, {
  nextFeed: Number(state.nextFeed || 0) + 1,
  feedVersions: { ...state.feedVersions, [feed.feed_id]: feedVersion },
  queuedOffers: eligibleCandidates
    .filter((offer) => !seenProductIds.has(offer.id) && !attemptedProductIds.has(offer.id))
    .slice(0, MAX_CANDIDATES),
  lastRunAt: new Date().toISOString(),
  lastFeedId: feed.feed_id,
  lastFeedName: feed.feed_name,
  lastProductsScanned: discovered.productsScanned,
});
writeJson(PUBLISHED_FILE, { published });
console.log(`Miravia checked feed ${feed.feed_id} (${feed.feed_name}), scanned ${discovered.productsScanned} products, retained ${communitySignals.length} priority source signal(s), found ${candidates.length} publishable candidate(s), attempted ${attempted}, and published ${sent} curated offer(s).${canPublishToday ? '' : ' Publication interval is still active.'}`);
