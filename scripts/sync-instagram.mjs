import fs from 'node:fs';
import path from 'node:path';
import {
  instagramCaption,
  instagramImageUrl,
  instagramPublicationWindow,
  publicOfferId,
  selectInstagramOffer,
} from './instagram-publication.mjs';

const ROOT = process.cwd();
const OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const STATE_FILE = path.join(ROOT, 'data', 'instagram-publications.json');

function readJson(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; } catch { return fallback; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

const config = {
  userId: process.env.INSTAGRAM_USER_ID,
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
  graphVersion: process.env.INSTAGRAM_GRAPH_VERSION || 'v25.0',
  siteUrl: process.env.SITE_URL || 'https://chollosaldia.com',
};
const missing = Object.entries({
  INSTAGRAM_USER_ID: config.userId,
  INSTAGRAM_ACCESS_TOKEN: config.accessToken,
}).filter(([, value]) => !value).map(([key]) => key);
if (missing.length) {
  console.log(`Instagram publication skipped: missing ${missing.join(', ')}.`);
  process.exit(0);
}

const graphBase = `https://graph.instagram.com/${config.graphVersion}`;
async function graph(pathname, { method = 'GET', parameters } = {}) {
  const response = await fetch(`${graphBase}/${pathname.replace(/^\//u, '')}`, {
    method,
    headers: {
      authorization: `Bearer ${config.accessToken}`,
      ...(parameters ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: parameters ? new URLSearchParams(parameters) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `Instagram Graph API returned ${response.status}`);
  }
  return payload;
}

async function verifyPublicImage(imageUrl) {
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(20_000) });
  const type = response.headers.get('content-type') || '';
  if (!response.ok || !type.toLowerCase().startsWith('image/')) {
    throw new Error(`La foto pública todavía no está disponible (${response.status}).`);
  }
  await response.body?.cancel();
}

const state = readJson(STATE_FILE, { published: [] });
const force = String(process.env.INSTAGRAM_FORCE || '').toLowerCase() === 'true';
const window = instagramPublicationWindow(state, { force });
if (!window.allowed) {
  console.log(`Instagram publication deferred: ${window.reason}.`);
  process.exit(0);
}

const offer = selectInstagramOffer(readJson(OFFERS_FILE, []), state, { siteUrl: config.siteUrl });
if (!offer) {
  console.log('Instagram publication skipped: no recent unpublished offer with a public photo.');
  process.exit(0);
}

const imageUrl = instagramImageUrl(offer, config.siteUrl);
await verifyPublicImage(imageUrl);
const container = await graph(`${config.userId}/media`, {
  method: 'POST',
  parameters: { image_url: imageUrl, caption: instagramCaption(offer, config.siteUrl) },
});
if (!container.id) throw new Error('Instagram did not return a media container id.');
const publishedMedia = await graph(`${config.userId}/media_publish`, {
  method: 'POST',
  parameters: { creation_id: container.id },
});
if (!publishedMedia.id) throw new Error('Instagram did not confirm the publication id.');

const publishedAt = new Date().toISOString();
writeJson(STATE_FILE, {
  published: [
    ...(state.published || []),
    {
      offerId: publicOfferId(offer),
      mediaId: publishedMedia.id,
      containerId: container.id,
      publishedAt,
      store: offer.store || '',
      title: offer.title || '',
    },
  ].slice(-500),
  lastRunAt: publishedAt,
  lastResult: 'published',
});
console.log(`Instagram published offer ${publicOfferId(offer)} as media ${publishedMedia.id}.`);
