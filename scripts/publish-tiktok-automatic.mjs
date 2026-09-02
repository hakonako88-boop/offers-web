import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const STATE_FILE = path.join(ROOT, 'data', 'tiktok-publications.json');
const SITE_URL = 'https://chollosaldia.com';
const TIME_ZONE = 'Europe/Madrid';
const MAX_PER_DAY = 4;

function readJson(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; } catch { return fallback; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function madridDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}

function priceNumber(value = '') {
  const raw = String(value).replace(/\s|\u00a0/gu, '').replace(/[^0-9,.-]/gu, '');
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  return Number(comma > dot ? raw.replaceAll('.', '').replace(',', '.') : raw.replaceAll(',', '')) || 0;
}

function cleanTitle(value = '', maximum = 90) {
  const text = String(value).replace(/[*_`<>#[\]]/gu, '').replace(/\s+/gu, ' ').trim();
  return text.length > maximum ? `${text.slice(0, maximum - 1).replace(/\s+\S*$/u, '')}…` : text;
}

function identity(offer) {
  return String(offer.source_product_id || offer.message_id || offer.url || '').trim();
}

function isAutomatic(offer) {
  const source = String(offer.source || '');
  return source !== 'removed'
    && source !== 'telegram-inbox'
    && source !== 'daily-summary'
    && !source.startsWith('manual-')
    && /telegram-|feed|api|automatic|community|discovery|chollometro/iu.test(source);
}

function qualityScore(offer) {
  const price = priceNumber(offer.price);
  const previous = priceNumber(offer.previousPrice);
  const discount = previous > price ? Math.round((1 - price / previous) * 100) : 0;
  const coupon = String(offer.coupon || '').trim() ? 25 : 0;
  const useful = /xiaomi|samsung|apple|robot|aspirador|portátil|tablet|móvil|gaming|playstation|televisor|cafetera|herramienta|lego/iu.test(String(offer.title || '')) ? 15 : 0;
  return discount * 2 + coupon + useful + Math.min(20, price / 25);
}

export function selectAutomaticTikTokOffer(offers, publications, now = new Date()) {
  const today = madridDate(now);
  const publishedIds = new Set(publications.filter((item) => item.status !== 'error').map((item) => String(item.offerId || '')));
  const todayCount = publications.filter((item) => item.date === today && item.status !== 'error').length;
  if (todayCount >= MAX_PER_DAY) return null;
  const newestAllowed = now.getTime() + 60_000;
  const oldestAllowed = now.getTime() - 36 * 60 * 60 * 1000;
  return offers
    .filter(isAutomatic)
    .filter((offer) => {
      const publishedAt = Number(offer.date) * 1000;
      const id = identity(offer);
      return id && !publishedIds.has(id) && publishedAt >= oldestAllowed && publishedAt <= newestAllowed
        && Number(offer.message_id) > 0 && cleanTitle(offer.title).length >= 12 && priceNumber(offer.price) > 0
        && /^\/tg\/[a-z0-9._-]+\.(?:jpe?g|png|webp)$/iu.test(String(offer.image || ''))
        && /^https?:\/\//iu.test(String(offer.url || ''));
    })
    .sort((left, right) => qualityScore(right) - qualityScore(left) || Number(right.date) - Number(left.date))[0] || null;
}

function descriptionFor(offer) {
  const previous = priceNumber(offer.previousPrice) > priceNumber(offer.price) ? `❌ Antes: ${offer.previousPrice}` : '';
  const coupon = String(offer.coupon || '').trim() ? `🎟 Cupón: ${offer.coupon}` : '';
  return [
    `🔥 ${cleanTitle(offer.title, 140)}`,
    '',
    `💶 Precio oferta: ${offer.price}`,
    previous,
    coupon,
    '',
    `🛒 Oferta completa en ${SITE_URL}`,
    'Precio y disponibilidad sujetos a cambios.',
    '',
    `#ChollosAlDia #Ofertas #${String(offer.store || 'Chollos').replace(/[^\p{L}\p{N}]/gu, '')}`,
  ].filter((line, index, lines) => line || (index > 0 && lines[index - 1])).join('\n').trim().slice(0, 2000);
}

async function workerRequest(workerUrl, secret, pathname, body) {
  const response = await fetch(`${workerUrl}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Chollos-Admin-Secret': secret },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || `TikTok worker respondió ${response.status}`);
  return data;
}

async function main() {
  const workerUrl = String(process.env.TIKTOK_WORKER_URL || '').replace(/\/$/u, '');
  const secret = String(process.env.TIKTOK_ADMIN_SECRET || '').trim();
  if (!workerUrl || !secret) {
    console.log('TikTok automático omitido: falta la conexión segura del Worker.');
    return;
  }
  const state = readJson(STATE_FILE, []);
  const offer = selectAutomaticTikTokOffer(readJson(OFFERS_FILE, []), state);
  if (!offer) {
    console.log('TikTok automático: no hay una oferta nueva apta o ya se alcanzó el límite diario.');
    return;
  }
  const imageUrl = `${SITE_URL}${offer.image}`;
  try {
    const image = await fetch(imageUrl, { method: 'HEAD', headers: { 'cache-control': 'no-cache' } });
    if (!image.ok) throw new Error(`La foto de TikTok todavía no está publicada (${image.status}).`);
    const preview = await workerRequest(workerUrl, secret, '/tiktok/preview', {
      title: cleanTitle(offer.title),
      description: descriptionFor(offer),
      photo_images: [imageUrl],
      privacy_level: 'PUBLIC_TO_EVERYONE',
      disable_comment: false,
      auto_add_music: true,
    });
    const direct = Boolean(preview.delivery?.public_direct_post_available);
    const result = await workerRequest(workerUrl, secret, direct ? '/tiktok/publish/photo' : '/tiktok/upload/photo', {
      confirmed: true,
      preview_id: preview.preview_id,
    });
    state.unshift({
      offerId: identity(offer), messageId: offer.message_id, date: madridDate(),
      publishedAt: new Date().toISOString(), status: direct ? 'published' : 'draft',
      publishId: result.publish_id || null, image: offer.image,
    });
    writeJson(STATE_FILE, state.slice(0, 180));
    console.log(direct ? 'Oferta publicada automáticamente en TikTok.' : 'Oferta enviada automáticamente a los borradores de TikTok.');
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).replace(/[A-Za-z0-9_-]{32,}/gu, '[dato protegido]').slice(0, 300);
    state.unshift({
      offerId: identity(offer), messageId: offer.message_id, date: madridDate(),
      attemptedAt: new Date().toISOString(), status: 'error', error: message, image: offer.image,
    });
    writeJson(STATE_FILE, state.slice(0, 180));
    throw new Error(`TikTok automático no completado: ${message}`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();

