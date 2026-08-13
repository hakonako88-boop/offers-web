import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
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
  parseFeedList,
  productImageFromPage,
  selectMiraviaFeed,
} from './miravia-offers.mjs';
import { filterDuplicateDeals } from './offer-deduplication.mjs';

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, 'data', 'miravia-discovery-state.json');
const PUBLISHED_FILE = path.join(ROOT, 'data', 'miravia-publications.json');
const WEB_OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const WEB_IMAGES_DIR = path.join(ROOT, 'public', 'tg');
const MAX_POSTS_PER_RUN = 1;
const MAX_PRODUCTS_SCANNED = 40000;
const MAX_CANDIDATES = 60;
const MINIMUM_PUBLICATION_INTERVAL_MS = 8 * 60 * 60 * 1000;

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

async function publishOffer(config, offer) {
  return telegram('sendPhoto', config.telegramToken, {
    chat_id: config.telegramChannelId,
    photo: offer.image,
    caption: formatMiraviaTelegramCaption(offer),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: '👉🏻 VER OFERTA', url: offer.url }]],
    },
  });
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
  const image = await response.arrayBuffer();
  if (!isMiraviaProductImageLargeEnough(image.byteLength)) {
    throw new Error(`Miravia image is too small (${image.byteLength} bytes)`);
  }
  return imageUrl;
}

async function mirrorImageForWeb(offer, imageUrl = offer.image) {
  const filename = `miravia-${offer.sourceProductId}.jpg`;
  const localImage = path.join(WEB_IMAGES_DIR, filename);
  const existingBytes = fs.existsSync(localImage) ? fs.statSync(localImage).size : 0;
  // Do not repeatedly download good originals, but give old catalogue
  // thumbnails a chance to be replaced when a better rendition is available.
  if (isMiraviaProductImageLargeEnough(existingBytes)) return `/tg/${filename}`;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`image status ${response.status}`);
    const image = Buffer.from(await response.arrayBuffer());
    if (!isMiraviaProductImageLargeEnough(image.length)) throw new Error(`image too small (${image.length} bytes)`);
    if (existingBytes && image.length <= existingBytes) return `/tg/${filename}`;
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
const existingWebOffers = readJson(WEB_OFFERS_FILE, []);
const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
const published = (publicationState.published || []).filter((entry) => Date.parse(entry.publishedAt || '') > cutoff);
const seenProductIds = new Set(published.map((entry) => entry.productId));
const lastPublicationAt = published.reduce((latest, entry) => Math.max(latest, Date.parse(entry.publishedAt || '') || 0), 0);
const canPublishToday = !lastPublicationAt || (Date.now() - lastPublicationAt) >= MINIMUM_PUBLICATION_INTERVAL_MS;

const listResponse = await fetch(config.feedListUrl, {
  headers: { 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' },
});
if (!listResponse.ok) throw new Error(`Awin feed list returned ${listResponse.status}`);

const entries = miraviaFeedEntries(parseFeedList(await listResponse.text()));
const feed = selectMiraviaFeed(entries, state.nextFeed);
if (!feed) throw new Error('No Spanish Miravia product feed is available for this publisher account.');

// Al cambiar la política editorial volvemos a evaluar cada feed una vez, sin
// olvidar los productos que ya se publicaron durante el último año.
const feedVersion = `${MIRAVIA_QUALITY_POLICY_VERSION}:${String(feed.last_imported || feed.last_checked || 'unknown')}`;
const alreadyChecked = state.feedVersions?.[feed.feed_id] === feedVersion;
let discovered = { candidates: [], productsScanned: 0 };
if (!alreadyChecked) {
  discovered = await discoverCandidates(feed.url, seenProductIds);
} else {
  console.log(`Miravia feed ${feed.feed_id} is unchanged; skipping download.`);
}

const candidates = (canPublishToday ? filterDuplicateDeals(Array.from(new Map(
  discovered.candidates.map((offer) => [offer.id, offer]),
).values()), existingWebOffers) : []).sort((left, right) => right.score - left.score).slice(0, MAX_POSTS_PER_RUN);

let sent = 0;
for (const offer of candidates) {
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
  lastRunAt: new Date().toISOString(),
  lastFeedId: feed.feed_id,
  lastFeedName: feed.feed_name,
  lastProductsScanned: discovered.productsScanned,
});
writeJson(PUBLISHED_FILE, { published });
console.log(`Miravia checked feed ${feed.feed_id} (${feed.feed_name}), scanned ${discovered.productsScanned} products, and published ${sent} curated offer(s).`);
