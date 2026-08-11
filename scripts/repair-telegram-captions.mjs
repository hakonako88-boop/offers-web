import fs from 'node:fs';
import path from 'node:path';
import { formatTelegramDealCard } from './offer-presentation.mjs';

const ROOT = process.cwd();
const OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const WAIT_BETWEEN_EDITS_MS = 1150;

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function parseAmount(value = '') {
  const compact = String(value)
    .replace(/\u00a0/g, '')
    .replace(/\s/g, '')
    .replace(/[^0-9,.-]/g, '');
  if (!compact) return 0;
  const comma = compact.lastIndexOf(',');
  const dot = compact.lastIndexOf('.');
  const normalized = comma >= 0 && dot >= 0
    ? (comma > dot ? compact.replaceAll('.', '').replace(',', '.') : compact.replaceAll(',', ''))
    : compact.replace(',', '.');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function euro(amount) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function telegram(token, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.description || `Telegram devolvió ${response.status}`);
  return result.result;
}

const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const channelId = String(process.env.TELEGRAM_CHANNEL_ID || '').trim();
if (!token || !channelId) throw new Error('Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHANNEL_ID.');

const offers = readJson(OFFERS_FILE, []);
const editableOffers = offers
  .filter((offer) => offer?.message_id && offer?.title && offer?.price && offer?.url)
  .sort((left, right) => Number(left.date || 0) - Number(right.date || 0));

let repaired = 0;
let unchanged = 0;
const failures = [];

for (const [index, offer] of editableOffers.entries()) {
  const price = parseAmount(offer.price);
  const oldPrice = parseAmount(offer.previousPrice);
  const previousPrice = oldPrice > price ? String(offer.previousPrice) : '';
  const savings = oldPrice > price ? euro(oldPrice - price) : '';
  const discount = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  const caption = formatTelegramDealCard({
    title: offer.title,
    store: offer.store || 'Tienda',
    category: offer.category || 'Ofertas',
    price: offer.price,
    previousPrice,
    savings,
    discount,
    url: offer.url,
    description: offer.description,
  });

  try {
    await telegram(token, 'editMessageCaption', {
      chat_id: channelId,
      message_id: offer.message_id,
      caption,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '👉🏻 VER OFERTA', url: offer.url }]] },
    });
    repaired += 1;
    console.log(`Actualizada publicación ${offer.message_id} (${offer.store || 'Tienda'}).`);
  } catch (error) {
    if (/message is not modified/i.test(String(error.message))) {
      unchanged += 1;
      continue;
    }
    failures.push(`${offer.message_id}: ${error.message}`);
    console.warn(`No se pudo actualizar ${offer.message_id}: ${error.message}`);
  }

  if (index < editableOffers.length - 1) await delay(WAIT_BETWEEN_EDITS_MS);
}

console.log(`Reparación terminada: ${repaired} actualizadas, ${unchanged} ya correctas, ${failures.length} con error.`);
if (failures.length) throw new Error(`No se pudieron reparar ${failures.length} publicaciones: ${failures.join(' | ')}`);
