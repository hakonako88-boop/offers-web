import fs from 'node:fs';
import path from 'node:path';
import {
  AMAZON_MARKETPLACE,
  formatAmazonCaption,
  formatAmazonTelegramCaption,
  normalizeAmazonItem,
  topicsForRun,
} from './amazon-offers.mjs';
import { filterDuplicateDeals } from './offer-deduplication.mjs';

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, 'data', 'amazon-discovery-state.json');
const PUBLISHED_FILE = path.join(ROOT, 'data', 'amazon-publications.json');
const WEB_OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const WEB_IMAGES_DIR = path.join(ROOT, 'public', 'tg');
const MAX_POSTS_PER_RUN = 1;
const MAX_PUBLICATION_ATTEMPTS = 8;
const MINIMUM_PUBLICATION_INTERVAL_MS = 4 * 60 * 60 * 1000;

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
    credentialId: process.env.AMAZON_CREATOR_CREDENTIAL_ID,
    credentialSecret: process.env.AMAZON_CREATOR_SECRET,
    version: process.env.AMAZON_CREATOR_VERSION,
    partnerTag: process.env.AMAZON_PARTNER_TAG || 'chollos00a-21',
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChannelId: process.env.TELEGRAM_CHANNEL_ID,
  };
}

function missingConfig(config) {
  return Object.entries({
    AMAZON_CREATOR_CREDENTIAL_ID: config.credentialId,
    AMAZON_CREATOR_SECRET: config.credentialSecret,
    AMAZON_PARTNER_TAG: config.partnerTag,
    TELEGRAM_BOT_TOKEN: config.telegramToken,
    TELEGRAM_CHANNEL_ID: config.telegramChannelId,
  }).filter(([, value]) => !value).map(([name]) => name);
}

function tokenEndpoints(version) {
  const endpoints = {
    '3.1': 'https://api.amazon.com/auth/o2/token',
    '3.2': 'https://api.amazon.co.uk/auth/o2/token',
    '3.3': 'https://api.amazon.co.jp/auth/o2/token',
  };
  // La tienda española usa la región europea (3.2). Se conserva la versión
  // configurada como preferencia y se intenta Europa como respaldo: así una
  // versión antigua o ausente no bloquea todas las publicaciones.
  return [...new Set([
    endpoints[String(version || '').trim()],
    endpoints['3.2'],
  ].filter(Boolean))];
}

async function getAmazonAccessToken(config) {
  let lastError = 'unknown authentication error';
  for (const endpoint of tokenEndpoints(config.version)) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: config.credentialId,
        client_secret: config.credentialSecret,
        scope: 'creatorsapi::default',
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.access_token) return data.access_token;
    lastError = data.error_description || data.error || String(response.status);
  }
  throw new Error(`Amazon authentication failed: ${lastError}`);
}

async function searchAmazon(accessToken, config, topic) {
  const response = await fetch('https://creatorsapi.amazon/catalog/v1/searchItems', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'x-marketplace': AMAZON_MARKETPLACE,
    },
    body: JSON.stringify({
      marketplace: AMAZON_MARKETPLACE,
      partnerTag: config.partnerTag,
      keywords: topic.keywords,
      searchIndex: topic.searchIndex,
      condition: 'New',
      itemCount: 10,
      resources: [
        'images.primary.large',
        'images.primary.medium',
        'itemInfo.title',
        'offersV2.listings.availability',
        'offersV2.listings.condition',
        'offersV2.listings.dealDetails',
        'offersV2.listings.isBuyBoxWinner',
        'offersV2.listings.price',
        'offersV2.listings.type',
      ],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.errors?.[0]?.message || data?.message || response.status;
    throw new Error(`Amazon search failed: ${detail}`);
  }
  return data.searchResult?.items || [];
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
    caption: formatAmazonTelegramCaption(offer),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: '👉🏻 VER OFERTA', url: offer.url }]],
    },
  });
}

async function mirrorImageForWeb(offer) {
  const filename = `amazon-${offer.asin}.jpg`;
  const localImage = path.join(WEB_IMAGES_DIR, filename);
  if (fs.existsSync(localImage)) return `/tg/${filename}`;
  try {
    const response = await fetch(offer.image, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`image status ${response.status}`);
    fs.mkdirSync(WEB_IMAGES_DIR, { recursive: true });
    fs.writeFileSync(localImage, Buffer.from(await response.arrayBuffer()));
    return `/tg/${filename}`;
  } catch (error) {
    console.warn(`Could not mirror Amazon image ${offer.asin}: ${error.message}`);
    return offer.image;
  }
}

async function saveOfferForWeb(offer, message) {
  const existingOffers = readJson(WEB_OFFERS_FILE, []);
  const image = await mirrorImageForWeb(offer);
  const record = {
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
    category: offer.category,
    description: offer.title,
  };
  const withoutPreviousVersion = existingOffers.filter((entry) => String(entry.source_product_id || '') !== record.source_product_id);
  writeJson(WEB_OFFERS_FILE, [record, ...withoutPreviousVersion]);
}

const config = getConfig();
const missing = missingConfig(config);
if (missing.length) {
  console.log(`Amazon discovery skipped: missing ${missing.join(', ')}`);
  process.exit(0);
}

const state = readJson(STATE_FILE, { nextTopic: 0 });
const publicationState = readJson(PUBLISHED_FILE, { published: [] });
const existingWebOffers = readJson(WEB_OFFERS_FILE, []);
const cutoff = Date.now() - 120 * 24 * 60 * 60 * 1000;
const published = (publicationState.published || []).filter((entry) => Date.parse(entry.publishedAt || '') > cutoff);
const seenAsins = new Set(published.map((entry) => entry.asin));
const lastPublicationAt = published.reduce((latest, entry) => Math.max(latest, Date.parse(entry.publishedAt || '') || 0), 0);
const canPublishNow = process.env.FORCE_AUTOMATIC_PUBLICATION === 'true'
  || !lastPublicationAt
  || (Date.now() - lastPublicationAt) >= MINIMUM_PUBLICATION_INTERVAL_MS;
const topics = topicsForRun(Number(state.nextTopic || 0), 2);
const candidates = [];
const searchErrors = [];

let accessToken = '';
try {
  accessToken = await getAmazonAccessToken(config);
} catch (error) {
  searchErrors.push(error instanceof Error ? error.message : 'Amazon authentication failed');
}

if (accessToken) {
  for (const topic of topics) {
    try {
      const items = await searchAmazon(accessToken, config, topic);
      for (const item of items) {
        const offer = normalizeAmazonItem(item, topic.category);
        if (offer && !seenAsins.has(offer.asin)) candidates.push(offer);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Amazon search failed';
      searchErrors.push(detail);
      console.warn(detail);
      if (/eligibility requirements/i.test(detail)) break;
    }
  }
}

const uniqueCandidates = (canPublishNow ? filterDuplicateDeals(Array.from(new Map(
  candidates.sort((a, b) => b.score - a.score).map((offer) => [offer.asin, offer])
).values()), existingWebOffers) : []);

let sent = 0;
let attempted = 0;
for (const offer of uniqueCandidates.slice(0, MAX_PUBLICATION_ATTEMPTS)) {
  if (sent >= MAX_POSTS_PER_RUN) break;
  attempted += 1;
  try {
    const message = await publishOffer(config, offer);
    await saveOfferForWeb(offer, message);
    published.push({
      asin: offer.asin,
      publishedAt: new Date().toISOString(),
      telegramMessageId: message.message_id,
      price: offer.price,
      url: offer.url,
    });
    seenAsins.add(offer.asin);
    sent += 1;
  } catch (error) {
    console.warn(`Could not publish ${offer.asin}: ${error.message}`);
  }
}

writeJson(STATE_FILE, {
  nextTopic: (Number(state.nextTopic || 0) + topics.length) % 10,
  lastRunAt: new Date().toISOString(),
  lastError: searchErrors[0] || '',
});
writeJson(PUBLISHED_FILE, { published });
console.log(`Amazon discovery checked ${topics.map((topic) => topic.keywords).join(', ')}, found ${uniqueCandidates.length} publishable candidate(s), attempted ${attempted}, and published ${sent} offer(s).${searchErrors.length ? ` Source warning: ${searchErrors[0]}` : ''}`);
