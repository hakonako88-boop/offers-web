import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { automaticInterest, interestFamily, selectInterestingOffers } from './editorial-interest.mjs';

const ROOT = process.cwd();
const OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const POSTS_FILE = path.join(ROOT, 'data', 'posts.json');
const TIME_ZONE = 'Europe/Madrid';
const SITE_URL = 'https://chollosaldia.com';

function readJson(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; } catch { return fallback; }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function madridParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday: parts.weekday, hour: Number(parts.hour), minute: Number(parts.minute) };
}

function numericPrice(value = '') {
  const raw = String(value).replace(/\u00a0|\s/gu, '').replace(/[^0-9,.-]/gu, '');
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  return Number(comma > dot ? raw.replaceAll('.', '').replace(',', '.') : raw.replaceAll(',', '')) || 0;
}

function clean(value = '', maximum = 150) {
  const text = String(value).replace(/[*_`<>#[\]]/gu, '').replace(/\s+/gu, ' ').trim();
  return text.length > maximum ? `${text.slice(0, maximum - 1).trimEnd()}…` : text;
}

function score(offer) {
  const price = numericPrice(offer.price);
  const previous = numericPrice(offer.previousPrice);
  const saving = previous > price ? previous - price : 0;
  const discount = saving ? (saving / previous) * 100 : 0;
  return automaticInterest(offer, { requireDealEvidence: true }) * 50 + Math.min(discount, 60) * 2 + Math.min(saving, 200) + (offer.coupon ? 20 : 0);
}

export function selectWeeklyProducts(offers, now = new Date(), maximum = 5) {
  const newest = now.getTime();
  const earliest = newest - 7 * 24 * 60 * 60 * 1000;
  const candidates = selectInterestingOffers(offers.filter((offer) => {
    const timestamp = Number(offer.date) * 1000;
    const price = numericPrice(offer.price);
    const previous = numericPrice(offer.previousPrice);
    const discount = previous > price ? ((previous - price) / previous) * 100 : 0;
    const coupon = Boolean(String(offer.coupon || '').trim());
    const store = String(offer.store || '').toLowerCase();
    const credibleMarketplacePrice = !store.includes('aliexpress') || coupon || (discount <= 50 && previous <= price * 2);
    const credibleHighValueReference = price <= 250 || previous <= price * 2 || coupon;
    return timestamp >= earliest && timestamp <= newest && price > 0 && previous > price
      && credibleMarketplacePrice && credibleHighValueReference
      && String(offer.image || '').trim() && /^https?:\/\//iu.test(String(offer.url || ''));
  })).map((offer) => ({ ...offer, weeklyScore: score(offer) }))
    .sort((left, right) => right.weeklyScore - left.weeklyScore || Number(right.date) - Number(left.date));

  const result = [];
  const families = new Set();
  const stores = new Map();
  for (const offer of candidates) {
    const family = interestFamily(offer);
    const store = String(offer.store || 'Otra');
    if (families.has(family) || (stores.get(store) || 0) >= 2) continue;
    result.push(offer); families.add(family); stores.set(store, (stores.get(store) || 0) + 1);
    if (result.length >= maximum) break;
  }
  return result;
}

export function buildWeeklyProductGuide(offers, date) {
  const displayDate = new Date(`${date}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE });
  const id = `mejores-productos-semana-${date}`;
  const sections = offers.map((offer, index) => {
    const price = numericPrice(offer.price);
    const previous = numericPrice(offer.previousPrice);
    const saving = previous - price;
    const discount = Math.round((saving / previous) * 100);
    const coupon = offer.coupon ? ` Necesita el cupón ${clean(offer.coupon, 40)}; conviene copiarlo y comprobar que se aplique antes de pagar.` : ' El precio publicado no necesita un código adicional.';
    return `${index + 1}. ${clean(offer.title)}\n\nEstá disponible en ${offer.store || 'la tienda'} por ${offer.price}, frente a ${offer.previousPrice}: un ahorro publicado de ${saving.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} (${discount} %).${coupon} Lo hemos incluido por su utilidad, el ahorro visible y la calidad de la oferta. Consulta su ficha desde la selección de ofertas de Chollos al Día para revisar variante, envío, stock y precio final.`;
  });
  return {
    id,
    source_product_id: `weekly-guide:${date}`,
    date: Math.floor(new Date(`${date}T11:30:00+02:00`).getTime() / 1000),
    title: `Los ${offers.length} mejores productos en oferta de la semana`,
    body: `Guía actualizada el ${displayDate}. Hemos revisado las ofertas publicadas durante los últimos siete días y seleccionado productos útiles con ahorro visible. No elegimos únicamente el porcentaje más alto: también valoramos el interés del producto, la credibilidad del precio anterior y la variedad de tiendas y categorías.\n\n${sections.join('\n\n')}\n\nCómo usar esta selección\n\nLos precios, cupones y existencias pueden cambiar. Abre la ficha del producto, confirma que la variante coincide y revisa el total del carrito antes de comprar. Esta guía se actualiza con una nueva selección semanal y no sustituye las condiciones de cada comercio.`,
    image: offers[0].image,
    images: offers.map((offer) => offer.image).filter(Boolean).slice(0, 5),
    offer_ids: offers.map((offer) => String(offer.source_product_id || '')).filter(Boolean),
    url: `${SITE_URL}/#ofertas`,
    source: 'weekly-product-guide',
  };
}

async function main() {
  const now = new Date();
  const current = madridParts(now);
  const force = String(process.env.WEEKLY_GUIDE_FORCE || '').toLowerCase() === 'true';
  if (!force && (current.weekday !== 'Sun' || current.hour !== 11 || current.minute < 30)) {
    console.log(`Guía semanal omitida: en Madrid es ${current.weekday} ${current.hour}:${String(current.minute).padStart(2, '0')}.`);
    return;
  }
  const date = String(process.env.WEEKLY_GUIDE_DATE || '').trim() || current.date;
  const posts = readJson(POSTS_FILE, []);
  const id = `mejores-productos-semana-${date}`;
  if (!force && posts.some((post) => post.id === id)) return console.log(`La guía ${id} ya existe.`);
  const selected = selectWeeklyProducts(readJson(OFFERS_FILE, []), now);
  if (selected.length < 3) return console.log(`Guía semanal omitida: solo hay ${selected.length} productos sólidos.`);
  writeJson(POSTS_FILE, [buildWeeklyProductGuide(selected, date), ...posts.filter((post) => post.id !== id)]);
  console.log(`Guía semanal creada con ${selected.length} productos: ${id}.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
