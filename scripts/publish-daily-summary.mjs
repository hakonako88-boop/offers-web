import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { automaticInterest, interestFamily, selectInterestingOffers } from './editorial-interest.mjs';

const ROOT = process.cwd();
const OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const POSTS_FILE = path.join(ROOT, 'data', 'posts.json');
const STATE_FILE = path.join(ROOT, 'data', 'daily-summary-state.json');
const TIME_ZONE = 'Europe/Madrid';
const MAX_OFFERS = 3;
const MAX_PER_STORE = 2;
const SITE_URL = 'https://chollosaldia.com';

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

export function previousMadridDate(date) {
  const currentDate = madridParts(date).date;
  const middayUtc = new Date(`${currentDate}T12:00:00Z`);
  middayUtc.setUTCDate(middayUtc.getUTCDate() - 1);
  return middayUtc.toISOString().slice(0, 10);
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

function titlePriceMatches(offer) {
  const shown = [...String(offer.title || '').matchAll(/(\d{1,4}(?:[.,]\d{2}))\s*€/gu)]
    .map((match) => numericPrice(match[1])).filter(Boolean);
  const price = numericPrice(offer.price);
  return !shown.length || shown.some((amount) => Math.abs(amount - price) <= Math.max(0.05, price * 0.02));
}

function offerScore(offer) {
  const price = numericPrice(offer.price);
  const previous = numericPrice(offer.previousPrice);
  const saving = previous > price ? previous - price : 0;
  const discount = saving > 0 ? (saving / previous) * 100 : 0;
  const couponBonus = String(offer.coupon || '').trim() ? 20 : 0;
  return Math.round(discount * 2 + Math.min(saving, 250) + couponBonus + automaticInterest(offer) * 35);
}

export function selectDailyOffers(offers, targetDate, maximum = MAX_OFFERS) {
  const eligible = selectInterestingOffers(offers
    .filter((offer) => madridParts(new Date(Number(offer.date) * 1000)).date === targetDate)
    .filter((offer) => cleanTitle(offer.title, 500).length >= 5 && numericPrice(offer.price) > 0
      && String(offer.image || '').trim() && validHttpUrl(offer.url) && titlePriceMatches(offer))
    .filter((offer) => {
      const price = numericPrice(offer.price);
      const previous = numericPrice(offer.previousPrice);
      const discount = previous > price ? ((previous - price) / previous) * 100 : 0;
      const coupon = String(offer.coupon || '').trim();
      const store = String(offer.store || '').toLowerCase();
      // Marketplace feeds sometimes report an inflated reference price. A
      // dubious PVP must not win the nightly "best deals" ranking.
      const credibleMarketplacePrice = !store.includes('aliexpress') || Boolean(coupon)
        || (discount <= 50 && previous <= price * 2);
      const meaningfulDeal = discount >= 20 || (coupon && automaticInterest(offer) >= 2 && discount >= 10);
      return automaticInterest(offer) >= 0 && credibleMarketplacePrice && meaningfulDeal;
    })
    .map((offer) => ({ ...offer, summaryScore: offerScore(offer) })))
    .sort((left, right) => right.summaryScore - left.summaryScore || Number(right.date) - Number(left.date));

  const selected = [];
  const selectedIds = new Set();
  const storeCounts = new Map();
  const familyCounts = new Map();
  const add = (offer) => {
    const identity = String(offer.source_product_id || offer.url);
    if (selectedIds.has(identity)) return false;
    const store = String(offer.store || 'Oferta');
    if ((storeCounts.get(store) || 0) >= MAX_PER_STORE) return false;
    const family = interestFamily(offer);
    if (family !== 'otros' && (familyCounts.get(family) || 0) >= 1) return false;
    selected.push(offer);
    selectedIds.add(identity);
    storeCounts.set(store, (storeCounts.get(store) || 0) + 1);
    familyCounts.set(family, (familyCounts.get(family) || 0) + 1);
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
    const price = numericPrice(offer.price);
    const previous = numericPrice(offer.previousPrice);
    const discount = previous > price ? Math.round(((previous - price) / previous) * 100) : 0;
    const coupon = String(offer.coupon || '').trim() ? `\n🎟 Cupón: ${escapeHtml(offer.coupon)}` : '';
    const before = previous > price ? ` · <s>${escapeHtml(offer.previousPrice)}</s>` : '';
    return `<b>${index + 1}. ${escapeHtml(cleanTitle(offer.title, 76))}</b>\n🔥 <b>${escapeHtml(offer.price)}</b>${before}${discount ? ` · −${discount}%` : ''}${coupon}\n🛍 ${escapeHtml(offer.store || 'Oferta')} · <a href="${escapeHtml(offer.url)}">VER OFERTA</a>`;
  });
  const telegram = `🏆 <b>TOP 3 CHOLLOS DEL DÍA</b>\n${escapeHtml(displayDate)}\n\n${lines.join('\n\n')}\n\n🔔 Mañana, más ofertas en @aldiachollos\n⚠️ Precio y stock pueden cambiar. #Publi`;
  const body = offers.map((offer, index) => {
    const coupon = String(offer.coupon || '').trim() ? ` · Cupón: ${offer.coupon}` : '';
    return `${index + 1}. ${cleanTitle(offer.title, 160)}\n${offer.price} en ${offer.store || 'la tienda'}${coupon}`;
  }).join('\n\n');
  return {
    telegram,
    album: offers.map((offer, index) => {
      const price = numericPrice(offer.price);
      const previous = numericPrice(offer.previousPrice);
      const discount = previous > price ? Math.round(((previous - price) / previous) * 100) : 0;
      const coupon = String(offer.coupon || '').trim() ? `\n🎟 <b>Cupón:</b> <code>${escapeHtml(offer.coupon)}</code>` : '';
      const heading = index === 0 ? `🏆 <b>TOP 3 CHOLLOS DEL DÍA</b>\n${escapeHtml(displayDate)}\n\n` : '';
      const before = previous > price ? `\n<s>${escapeHtml(offer.previousPrice)}</s>${discount ? ` · 🔻 ${discount}%` : ''}` : '';
      return {
        type: 'photo',
        media: String(offer.image || '').startsWith('/') ? `${SITE_URL}${offer.image}` : String(offer.image || ''),
        parse_mode: 'HTML',
        caption: `${heading}<b>${index + 1}. ${escapeHtml(cleanTitle(offer.title, 76))}</b>\n\n🔥 <b>${escapeHtml(offer.price)}</b>${before}${coupon}\n🛍 ${escapeHtml(offer.store || 'Oferta')}\n\n👉 <a href="${escapeHtml(offer.url)}"><b>VER OFERTA</b></a>${index === offers.length - 1 ? '\n\n🔔 @aldiachollos · #Publi' : ''}`,
      };
    }),
    post: {
      id: `resumen-diario-${targetDate}`,
      source_product_id: `daily-summary:${targetDate}`,
      date: Math.floor(Date.now() / 1000),
      title: `Las mejores ofertas del ${displayDate}`,
      body: `Esta es la selección diaria de Chollos al Día, ordenada por descuento real, ahorro y calidad de la oferta.\n\n${body}\n\nLos precios y el stock pueden cambiar. Comprueba siempre las condiciones en la tienda antes de comprar.`,
      image: offers[0].image,
      images: offers.map((offer) => offer.image).filter(Boolean),
      url: 'https://chollosaldia.com/',
      source: 'daily-summary',
    },
  };
}

async function telegramRequest(token, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`Telegram ${method} failed: ${data.description || response.status}`);
  return data.result;
}

async function sendTelegramAlbum(token, channelId, media) {
  try {
    return await telegramRequest(token, 'sendMediaGroup', {
      chat_id: channelId,
      media,
      disable_notification: true,
    });
  } catch (albumError) {
    // Telegram rejects the complete album when a single remote image cannot
    // be downloaded. Retry each card so one broken shop thumbnail does not
    // suppress every other photo in the nightly summary.
    const sent = [];
    for (const item of media) {
      try {
        sent.push(await telegramRequest(token, 'sendPhoto', {
          chat_id: channelId,
          photo: item.media,
          caption: item.caption,
          parse_mode: item.parse_mode,
          disable_notification: true,
        }));
      } catch (photoError) {
        console.warn(photoError instanceof Error ? photoError.message : String(photoError));
      }
    }
    if (!sent.length) throw albumError;
    return sent;
  }
}

async function main() {
  const now = new Date();
  const force = String(process.env.DAILY_SUMMARY_FORCE || '').toLowerCase() === 'true';
  const current = madridParts(now);
  if (!force && (current.hour !== 0 || current.minute < 5)) {
    console.log(`Resumen omitido: en Madrid son las ${String(current.hour).padStart(2, '0')}:${String(current.minute).padStart(2, '0')}.`);
    return;
  }

  const targetDate = String(process.env.DAILY_SUMMARY_DATE || '').trim()
    || (force ? current.date : previousMadridDate(now));
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
  const messages = await sendTelegramAlbum(token, channelId, summary.album);
  summary.post.message_id = messages[0].message_id;
  writeJson(POSTS_FILE, [summary.post, ...posts]);
  writeJson(STATE_FILE, {
    publishedDates: [...new Set([...(state.publishedDates || []), targetDate])].slice(-90),
    lastPublishedAt: now.toISOString(),
    lastMessageId: messages[0].message_id,
    lastOfferIds: selected.map((offer) => offer.source_product_id || offer.url),
  });
  console.log(`Resumen ${targetDate} publicado con ${selected.length} ofertas.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
