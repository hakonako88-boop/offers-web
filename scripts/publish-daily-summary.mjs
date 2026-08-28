import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const POSTS_FILE = path.join(ROOT, 'data', 'posts.json');
const STATE_FILE = path.join(ROOT, 'data', 'daily-summary-state.json');
const TIME_ZONE = 'Europe/Madrid';
const MAX_OFFERS = 5;
const MAX_PER_STORE = 2;

function readJson(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; } catch { return fallback; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function madridParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

function previousMadridDate(now) {
  const cursor = new Date(now);
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  return madridParts(cursor).date;
}

function numericPrice(value = '') {
  const raw = String(value).replace(/\u00a0|\s/gu, '').replace(/[^0-9,.-]/gu, '');
  if (!raw) return 0;
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  return Number(comma > dot ? raw.replaceAll('.', '').replace(',', '.') : raw.replaceAll(',', '')) || 0;
}

function cleanTitle(value = '', maximum = 92) {
  const clean = String(value).replace(/[*_`<>#[\]]/gu, '').replace(/\s+/gu, ' ').trim();
  return clean.length > maximum ? `${clean.slice(0, maximum - 1).trimEnd()}…` : clean;
}

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function validHttpUrl(value = '') {
  try { return ['http:', 'https:'].includes(new URL(String(value)).protocol); } catch { return false; }
}

function offerScore(offer) {
  const price = numericPrice(offer.price);
  const previous = numericPrice(offer.previousPrice);
  const saving = previous > price ? previous - price : 0;
  const discount = saving > 0 ? (saving / previous) * 100 : 0;
  const couponBonus = String(offer.coupon || '').trim() ? 20 : 0;
  return Math.round(discount * 2 + Math.min(saving, 250) + couponBonus);
}

export function selectDailyOffers(offers, targetDate, maximum = MAX_OFFERS) {
  const eligible = offers
    .filter((offer) => madridParts(new Date(Number(offer.date) * 1000)).date === targetDate)
    .filter((offer) => cleanTitle(offer.title, 500).length >= 5 && numericPrice(offer.price) > 0
      && String(offer.image || '').trim() && validHttpUrl(offer.url))
    .map((offer) => ({ ...offer, summaryScore: offerScore(offer) }))
    .sort((left, right) => right.summaryScore - left.summaryScore || Number(right.date) - Number(left.date));

  const selected = [];
  const selectedIds = new Set();
  const storeCounts = new Map();
  const add = (offer) => {
    const identity = String(offer.source_product_id || offer.url);
    if (selectedIds.has(identity)) return false;
    const store = String(offer.store || 'Oferta');
    if ((storeCounts.get(store) || 0) >= MAX_PER_STORE) return false;
    selected.push(offer);
    selectedIds.add(identity);
    storeCounts.set(store, (storeCounts.get(store) || 0) + 1);
    return true;
  };
  // La primera vuelta da espacio a la mejor oferta de cada comercio. Después
  // se completan los huecos por puntuación, con un máximo de dos por tienda.
  for (const offer of eligible) {
    if (!storeCounts.has(String(offer.store || 'Oferta'))) add(offer);
    if (selected.length >= maximum) return selected;
  }
  for (const offer of eligible) {
    add(offer);
    if (selected.length >= maximum) break;
  }
  return selected;
}

export function buildDailySummary(offers, targetDate) {
  const displayDate = new Date(`${targetDate}T12:00:00Z`).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE,
  });
  const lines = offers.map((offer, index) => {
    const coupon = String(offer.coupon || '').trim() ? `\n🎟 Cupón: ${escapeHtml(offer.coupon)}` : '';
    return `<b>${index + 1}. ${escapeHtml(cleanTitle(offer.title))}</b>\n💶 ${escapeHtml(offer.price)} · ${escapeHtml(offer.store || 'Oferta')}${coupon}\n👉 <a href="${escapeHtml(offer.url)}">Ver oferta</a>`;
  });
  const telegram = `🌙 <b>LAS MEJORES OFERTAS DEL DÍA</b>\n\nSelección del ${escapeHtml(displayDate)}\n\n${lines.join('\n\n')}\n\n🪐 Más chollos en @aldiachollos\n⚠️ Precio y stock pueden cambiar. #Publi`;
  const body = offers.map((offer, index) => {
    const coupon = String(offer.coupon || '').trim() ? ` · Cupón: ${offer.coupon}` : '';
    return `${index + 1}. ${cleanTitle(offer.title, 160)}\n${offer.price} en ${offer.store || 'la tienda'}${coupon}`;
  }).join('\n\n');
  return {
    telegram,
    post: {
      id: `resumen-diario-${targetDate}`,
      source_product_id: `daily-summary:${targetDate}`,
      date: Math.floor(Date.now() / 1000),
      title: `Las mejores ofertas del ${displayDate}`,
      body: `Esta es la selección diaria de Chollos al Día, ordenada por descuento real, ahorro y calidad de la oferta.\n\n${body}\n\nLos precios y el stock pueden cambiar. Comprueba siempre las condiciones en la tienda antes de comprar.`,
      image: offers[0].image,
      url: 'https://chollosaldia.com/',
      source: 'daily-summary',
    },
  };
}

async function sendTelegram(token, channelId, text) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: channelId,
      text,
      parse_mode: 'HTML',
      disable_notification: true,
      link_preview_options: { is_disabled: true },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`Telegram sendMessage failed: ${data.description || response.status}`);
  return data.result;
}

async function main() {
  const now = new Date();
  const force = String(process.env.DAILY_SUMMARY_FORCE || '').toLowerCase() === 'true';
  const current = madridParts(now);
  if (!force && (current.hour !== 22 || current.minute < 45)) {
    console.log(`Resumen omitido: en Madrid son las ${String(current.hour).padStart(2, '0')}:${String(current.minute).padStart(2, '0')}.`);
    return;
  }

  const targetDate = String(process.env.DAILY_SUMMARY_DATE || '').trim() || current.date;
  const state = readJson(STATE_FILE, { publishedDates: [] });
  const posts = readJson(POSTS_FILE, []);
  if ((state.publishedDates || []).includes(targetDate) || posts.some((post) => post.id === `resumen-diario-${targetDate}`)) {
    console.log(`El resumen ${targetDate} ya estaba publicado.`);
    return;
  }

  const selected = selectDailyOffers(readJson(OFFERS_FILE, []), targetDate);
  if (selected.length < 2) {
    console.log(`Resumen omitido: solo hay ${selected.length} oferta completa del ${targetDate}.`);
    return;
  }

  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const channelId = String(process.env.TELEGRAM_CHANNEL_ID || '').trim();
  if (!token || !channelId) throw new Error('Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHANNEL_ID.');
  const summary = buildDailySummary(selected, targetDate);
  const message = await sendTelegram(token, channelId, summary.telegram);
  summary.post.message_id = message.message_id;
  writeJson(POSTS_FILE, [summary.post, ...posts]);
  writeJson(STATE_FILE, {
    publishedDates: [...new Set([...(state.publishedDates || []), targetDate])].slice(-90),
    lastPublishedAt: now.toISOString(),
    lastMessageId: message.message_id,
    lastOfferIds: selected.map((offer) => offer.source_product_id || offer.url),
  });
  console.log(`Resumen ${targetDate} publicado con ${selected.length} ofertas.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
