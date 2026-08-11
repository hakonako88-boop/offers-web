import fs from 'node:fs';
import path from 'node:path';
import {
  ALIEXPRESS_ENDPOINT,
  ALIEXPRESS_SEARCH_TOPICS,
  createAliExpressSignature,
  formatAliExpressCaption,
  normalizeAliExpressProduct,
  topicsForAliExpressRun,
} from './aliexpress-offers.mjs';

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, 'data', 'aliexpress-discovery-state.json');
const PUBLISHED_FILE = path.join(ROOT, 'data', 'aliexpress-publications.json');
const WEB_OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const WEB_IMAGES_DIR = path.join(ROOT, 'public', 'tg');
const MAX_POSTS_PER_RUN = 2;

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
    appKey: process.env.ALIEXPRESS_APP_KEY,
    appSecret: process.env.ALIEXPRESS_APP_SECRET,
    trackingId: process.env.ALIEXPRESS_TRACKING_ID,
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChannelId: process.env.TELEGRAM_CHANNEL_ID,
  };
}

function missingConfig(config) {
  return Object.entries({
    ALIEXPRESS_APP_KEY: config.appKey,
    ALIEXPRESS_APP_SECRET: config.appSecret,
    ALIEXPRESS_TRACKING_ID: config.trackingId,
    TELEGRAM_BOT_TOKEN: config.telegramToken,
    TELEGRAM_CHANNEL_ID: config.telegramChannelId,
  }).filter(([, value]) => !value).map(([name]) => name);
}

function timestamp() {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function signedRequestParams(config, params) {
  const unsigned = {
    app_key: config.appKey,
    format: 'json',
    sign_method: 'sha256',
    timestamp: timestamp(),
    v: '2.0',
    ...params,
  };
  return {
    ...unsigned,
    sign: createAliExpressSignature(unsigned, config.appSecret),
  };
}

async function searchAliExpress(config, topic) {
  const params = signedRequestParams(config, {
    method: 'aliexpress.affiliate.product.query',
    tracking_id: config.trackingId,
    target_currency: 'EUR',
    target_language: 'ES',
    country: 'ES',
    keywords: topic.keywords,
    page_no: '1',
    page_size: '12',
    fields: [
      'product_id',
      'product_title',
      'target_sale_price',
      'target_original_price',
      'discount',
      'product_main_image_url',
      'promotion_link',
      'lastest_volume',
      'commission_rate',
      'first_level_category_name',
    ].join(','),
  });
  const response = await fetch(`${ALIEXPRESS_ENDPOINT}?${new URLSearchParams(params)}`);
  const data = await response.json().catch(() => ({}));
  const error = data?.error_response || data?.error;
  if (!response.ok || error) {
    throw new Error(`AliExpress search failed: ${error?.msg || error?.message || response.status}`);
  }
  return data?.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product || [];
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
    caption: formatAliExpressCaption(offer),
    reply_markup: {
      inline_keyboard: [[{ text: '🛍️ Ver oferta en AliExpress', url: offer.url }]],
    },
  });
}

async function mirrorImageForWeb(offer) {
  const filename = `aliexpress-${offer.id}.jpg`;
  const localImage = path.join(WEB_IMAGES_DIR, filename);
  if (fs.existsSync(localImage)) return `/tg/${filename}`;

  try {
    const response = await fetch(offer.image);
    if (!response.ok) throw new Error(`image status ${response.status}`);
    fs.mkdirSync(WEB_IMAGES_DIR, { recursive: true });
    fs.writeFileSync(localImage, Buffer.from(await response.arrayBuffer()));
    return `/tg/${filename}`;
  } catch (error) {
    console.warn(`Could not mirror AliExpress image ${offer.id}: ${error.message}`);
    return offer.image;
  }
}

async function saveOfferForWeb(offer, message) {
  const existingOffers = readJson(WEB_OFFERS_FILE, []);
  const image = await mirrorImageForWeb(offer);
  const record = {
    message_id: message.message_id,
    source_product_id: offer.id,
    date: Math.floor(Date.now() / 1000),
    title: offer.title,
    text: formatAliExpressCaption(offer),
    image,
    url: offer.url,
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    store: 'AliExpress',
    category: offer.siteCategory,
    description: offer.title,
  };
  const withoutPreviousVersion = existingOffers.filter((entry) => String(entry.source_product_id || '') !== offer.id);
  writeJson(WEB_OFFERS_FILE, [record, ...withoutPreviousVersion]);
}

const config = getConfig();
const missing = missingConfig(config);
if (missing.length) {
  console.log(`AliExpress discovery skipped: missing ${missing.join(', ')}`);
  process.exit(0);
}

const state = readJson(STATE_FILE, { nextTopic: 0 });
const publicationState = readJson(PUBLISHED_FILE, { published: [] });
const cutoff = Date.now() - 120 * 24 * 60 * 60 * 1000;
const published = (publicationState.published || []).filter((entry) => Date.parse(entry.publishedAt || '') > cutoff);
const seenProductIds = new Set(published.map((entry) => entry.productId));
const topics = topicsForAliExpressRun(Number(state.nextTopic || 0), 2);
const candidates = [];

for (const topic of topics) {
  const products = await searchAliExpress(config, topic);
  for (const product of products) {
    const offer = normalizeAliExpressProduct(product, topic.category, topic.titleTerms);
    if (offer && !seenProductIds.has(offer.id)) candidates.push(offer);
  }
}

const uniqueCandidates = Array.from(new Map(
  candidates.sort((left, right) => right.score - left.score).map((offer) => [offer.id, offer]),
).values()).slice(0, MAX_POSTS_PER_RUN);

let sent = 0;
for (const offer of uniqueCandidates) {
  try {
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
    console.warn(`Could not publish AliExpress product ${offer.id}: ${error.message}`);
  }
}

writeJson(STATE_FILE, {
  nextTopic: (Number(state.nextTopic || 0) + topics.length) % ALIEXPRESS_SEARCH_TOPICS.length,
  lastRunAt: new Date().toISOString(),
});
writeJson(PUBLISHED_FILE, { published });
console.log(`AliExpress discovery checked ${topics.map((topic) => topic.keywords).join(', ')} and published ${sent} offer(s).`);
