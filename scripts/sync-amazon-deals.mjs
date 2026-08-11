import fs from 'node:fs';
import path from 'node:path';
import {
  AMAZON_MARKETPLACE,
  formatAmazonCaption,
  normalizeAmazonItem,
  topicsForRun,
} from './amazon-offers.mjs';

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, 'data', 'amazon-discovery-state.json');
const PUBLISHED_FILE = path.join(ROOT, 'data', 'amazon-publications.json');
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
    AMAZON_CREATOR_VERSION: config.version,
    AMAZON_PARTNER_TAG: config.partnerTag,
    TELEGRAM_BOT_TOKEN: config.telegramToken,
    TELEGRAM_CHANNEL_ID: config.telegramChannelId,
  }).filter(([, value]) => !value).map(([name]) => name);
}

function tokenEndpoint(version) {
  const endpoints = {
    '2.1': 'https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token',
    '2.2': 'https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token',
    '2.3': 'https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token',
    '3.1': 'https://api.amazon.com/auth/o2/token',
    '3.2': 'https://api.amazon.co.uk/auth/o2/token',
    '3.3': 'https://api.amazon.co.jp/auth/o2/token',
  };
  const endpoint = endpoints[String(version || '').trim()];
  if (!endpoint) throw new Error(`Unsupported Amazon credential version: ${version || 'missing'}`);
  return endpoint;
}

async function getAmazonAccessToken(config) {
  const version = String(config.version).trim();
  const isV3 = version.startsWith('3.');
  const response = await fetch(tokenEndpoint(version), {
    method: 'POST',
    headers: { 'content-type': isV3 ? 'application/json' : 'application/x-www-form-urlencoded' },
    body: isV3
      ? JSON.stringify({
          grant_type: 'client_credentials',
          client_id: config.credentialId,
          client_secret: config.credentialSecret,
          scope: 'creatorsapi::default',
        })
      : new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.credentialId,
          client_secret: config.credentialSecret,
          scope: 'creatorsapi/default',
        }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(`Amazon authentication failed: ${data.error_description || data.error || response.status}`);
  }
  return data.access_token;
}

async function searchAmazon(accessToken, config, topic) {
  const version = String(config.version).trim();
  const authorization = version.startsWith('3.')
    ? `Bearer ${accessToken}`
    : `Bearer ${accessToken}, Version ${version}`;
  const response = await fetch('https://creatorsapi.amazon/catalog/v1/searchItems', {
    method: 'POST',
    headers: {
      authorization,
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
    caption: formatAmazonCaption(offer),
    reply_markup: {
      inline_keyboard: [[{ text: '🛒 Ver chollo', url: offer.url }]],
    },
  });
}

const config = getConfig();
const missing = missingConfig(config);
if (missing.length) {
  console.log(`Amazon discovery skipped: missing ${missing.join(', ')}`);
  process.exit(0);
}

const state = readJson(STATE_FILE, { nextTopic: 0 });
const publicationState = readJson(PUBLISHED_FILE, { published: [] });
const cutoff = Date.now() - 120 * 24 * 60 * 60 * 1000;
const published = (publicationState.published || []).filter((entry) => Date.parse(entry.publishedAt || '') > cutoff);
const seenAsins = new Set(published.map((entry) => entry.asin));
const accessToken = await getAmazonAccessToken(config);
const topics = topicsForRun(Number(state.nextTopic || 0), 2);
const candidates = [];

for (const topic of topics) {
  const items = await searchAmazon(accessToken, config, topic);
  for (const item of items) {
    const offer = normalizeAmazonItem(item, topic.category);
    if (offer && !seenAsins.has(offer.asin)) candidates.push(offer);
  }
}

const uniqueCandidates = Array.from(new Map(
  candidates.sort((a, b) => b.score - a.score).map((offer) => [offer.asin, offer])
).values()).slice(0, MAX_POSTS_PER_RUN);

let sent = 0;
for (const offer of uniqueCandidates) {
  try {
    const message = await publishOffer(config, offer);
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
});
writeJson(PUBLISHED_FILE, { published });
console.log(`Amazon discovery checked ${topics.map((topic) => topic.keywords).join(', ')} and published ${sent} offer(s).`);
