import fs from 'node:fs';
import path from 'node:path';
import { pinterestPinPayload, pinterestPublicationWindow, selectPinterestOffer } from './pinterest-publication.mjs';

const ROOT = process.cwd();
const OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const STATE_FILE = path.join(ROOT, 'data', 'pinterest-publications.json');
const SITE_URL = String(process.env.SITE_URL || 'https://chollosaldia.com').replace(/\/$/u, '');

function readJson(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; } catch { return fallback; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function redact(value) {
  return String(value || '').replace(/[A-Za-z0-9_-]{28,}/gu, '[dato protegido]').slice(0, 300);
}

async function verifyPublicImage(imageUrl) {
  const response = await fetch(imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(20_000) });
  const type = response.headers.get('content-type') || '';
  if (!response.ok || !type.toLowerCase().startsWith('image/')) {
    throw new Error(`La imagen pública todavía no está disponible (${response.status}).`);
  }
}

async function main() {
  const token = String(process.env.PINTEREST_ACCESS_TOKEN || '').trim();
  const boardId = String(process.env.PINTEREST_BOARD_ID || '').trim();
  const enabled = String(process.env.PINTEREST_AUTO_PUBLISH || '').toLowerCase() === 'true';
  if (!enabled || !token || !boardId) {
    console.log('Pinterest automático pendiente: falta aprobación o configuración segura.');
    return;
  }
  const state = readJson(STATE_FILE, { published: [] });
  const force = String(process.env.PINTEREST_FORCE || '').toLowerCase() === 'true';
  const window = pinterestPublicationWindow(state, { force });
  if (!window.allowed) {
    console.log(`Pinterest automático aplazado: ${window.reason}.`);
    return;
  }
  const offer = selectPinterestOffer(readJson(OFFERS_FILE, []), state, { siteUrl: SITE_URL });
  if (!offer) {
    console.log('Pinterest automático: no hay una oferta nueva, completa y no repetida.');
    return;
  }
  const pin = pinterestPinPayload(offer, { boardId, siteUrl: SITE_URL });
  await verifyPublicImage(pin.media_source.url);
  const response = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(pin),
    signal: AbortSignal.timeout(35_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.id) throw new Error(payload?.message || payload?.code || `Pinterest API respondió ${response.status}.`);
  const publishedAt = new Date().toISOString();
  state.published = [
    ...(state.published || []),
    {
      offerId: String(offer.chollometroId || offer.source_product_id || offer.message_id || ''),
      pinId: payload.id,
      publishedAt,
      store: offer.store || '',
      image: offer.image || '',
      link: pin.link,
    },
  ].slice(-500);
  state.lastRunAt = publishedAt;
  state.lastResult = 'published';
  writeJson(STATE_FILE, state);
  console.log(`Oferta publicada en Pinterest: ${payload.id}`);
}

try {
  await main();
} catch (error) {
  throw new Error(`Pinterest automático no completado: ${redact(error instanceof Error ? error.message : error)}`);
}

export { main };
