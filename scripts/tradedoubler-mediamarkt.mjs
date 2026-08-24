import { formatTelegramDealCard, formatWebsiteDealText, improveOfferTitle } from './offer-presentation.mjs';

export const TRADEDOUBLER_MEDIAMARKT = Object.freeze({
  feedId: '24915',
  programId: '270504',
  publisherSiteId: '3457994',
  store: 'MediaMarkt',
  slug: 'mediamarkt',
});

export const TRADEDOUBLER_QUALITY_POLICY_VERSION = 'v1';

const LOW_INTEREST = /\b(?:funda|protector|cable|adaptador|recambio|repuesto|pegatina|llavero|tornillo|cartucho|pilas?|bombilla|soporte|conector)\b/iu;
const HIGH_INTEREST = /\b(?:smartphone|m[oó]vil|tablet|port[aá]til|ordenador|monitor|televisor|smart\s*tv|consola|videojuego|auriculares|altavoz|reloj|smartwatch|robot\s+aspirador|aspirador|freidora|cafetera|lavadora|secadora|frigor[ií]fico|lavavajillas|microondas|horno|aire\s+acondicionado|ventilador|patinete|c[aá]mara|objetivo|proyector)\b/iu;

function number(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  if (input && typeof input === 'object') return number(input.value ?? input.amount ?? input.price);
  const raw = String(input ?? '').replace(/\u00a0|\s/g, '').replace(/[^0-9,.-]/g, '');
  if (!raw) return 0;
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  const normalized = comma >= 0 && dot >= 0
    ? (comma > dot ? raw.replaceAll('.', '').replace(',', '.') : raw.replaceAll(',', ''))
    : raw.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function euro(input) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(input);
}

function timestamp(input) {
  if (typeof input === 'number') return input > 10_000_000_000 ? input : input * 1000;
  const parsed = Date.parse(String(input || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function secureUrl(input = '') {
  try {
    const url = new URL(String(input).replace(/^http:\/\//iu, 'https://'));
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function isOwnedTradeDoublerMediaMarktLink(input = '') {
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:') return false;
    if (host === 'clk.tradedoubler.com') {
      return url.searchParams.get('p') === TRADEDOUBLER_MEDIAMARKT.programId
        && url.searchParams.get('a') === TRADEDOUBLER_MEDIAMARKT.publisherSiteId;
    }
    if (host === 'pdt.tradedoubler.com') {
      return url.pathname.startsWith('/click')
        && new RegExp(`(?:^|\\W)a\\(${TRADEDOUBLER_MEDIAMARKT.publisherSiteId}\\)`, 'u').test(url.href)
        && new RegExp(`(?:^|\\W)p\\(${TRADEDOUBLER_MEDIAMARKT.programId}\\)`, 'u').test(url.href);
    }
    return false;
  } catch {
    return false;
  }
}

export function tradeDoublerProductsUrl(token, { limit = 1000 } = {}) {
  const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 1000));
  const base = `https://api.tradedoubler.com/1.0/products.json;fid=${TRADEDOUBLER_MEDIAMARKT.feedId};priceHistory=true;dateOutputFormat=iso8601;orderBy=modificationDateDesc;limit=${safeLimit}`;
  return `${base}?token=${encodeURIComponent(String(token || ''))}`;
}

function categoryText(product = {}) {
  return (Array.isArray(product.categories) ? product.categories : [])
    .map((entry) => entry?.tdCategoryName || entry?.name || '')
    .filter(Boolean)
    .join(' > ');
}

function categoryFor(category = '', title = '') {
  const text = `${category} ${title}`.toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (/videojuego|playstation|nintendo|xbox|gaming/.test(text)) return 'Videojuegos';
  if (/electrodom|hogar|cocina|aspir|lavadora|frigorifico|cafetera|freidora|climat/.test(text)) return 'Hogar';
  if (/deporte|patinete|fitness/.test(text)) return 'Deporte';
  if (/telefono|smartphone|movil|informat|ordenador|portatil|tablet|televis|audio|foto|camara|electron/.test(text)) return 'Tecnología';
  return 'Ofertas';
}

function pricesFrom(product = {}, offer = {}) {
  const history = (Array.isArray(offer.priceHistory) ? offer.priceHistory : [])
    .map((entry) => ({ value: number(entry?.price ?? entry), date: timestamp(entry?.date) }))
    .filter((entry) => entry.value > 0)
    .sort((left, right) => right.date - left.date);
  const current = number(offer.price ?? product.price) || history[0]?.value || 0;
  const previous = Math.max(0, ...history.slice(1).map((entry) => entry.value), number(offer.previousPrice ?? product.previousPrice));
  return { current, previous };
}

export function mediaMarktQualityScore({ title = '', category = '', price = 0, oldPrice = 0 } = {}) {
  const text = `${title} ${category}`.toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const saving = oldPrice - price;
  const discount = oldPrice > price ? (saving / oldPrice) * 100 : 0;
  if (!title || LOW_INTEREST.test(text) || price < 15 || price > 5000) return 0;
  if (oldPrice <= price || saving < 15 || discount < 15 || discount > 70) return 0;
  if (!HIGH_INTEREST.test(text) && (saving < 30 || discount < 25)) return 0;
  return Math.round(discount * 2 + Math.min(saving, 300) + (HIGH_INTEREST.test(text) ? 35 : 0));
}

export function normalizeMediaMarktProduct(product = {}) {
  const offer = (Array.isArray(product.offers) ? product.offers : [])
    .find((entry) => String(entry?.feedId || '') === TRADEDOUBLER_MEDIAMARKT.feedId)
    || product.offers?.[0]
    || product;
  const title = String(product.name || offer.name || '').trim();
  const sourceProductId = String(offer.sourceProductId || product.sourceProductId || offer.id || product.id || '').trim();
  const image = secureUrl(product.productImage?.url || product.productImage || offer.productImage?.url || offer.productImage);
  const url = secureUrl(offer.productUrl || product.productUrl);
  const category = categoryText(product);
  const { current: price, previous: oldPrice } = pricesFrom(product, offer);
  const availability = String(offer.availability ?? product.availability ?? '').toLowerCase();
  const score = mediaMarktQualityScore({ title, category, price, oldPrice });
  if (!sourceProductId || !title || !image || !isOwnedTradeDoublerMediaMarktLink(url) || !score) return null;
  if (/out.of.stock|agotado|unavailable|not.available|sin.stock/iu.test(availability)) return null;
  const discount = Math.round(((oldPrice - price) / oldPrice) * 100);
  return {
    id: `tradedoubler-${TRADEDOUBLER_MEDIAMARKT.programId}-${sourceProductId}`,
    sourceProductId,
    store: TRADEDOUBLER_MEDIAMARKT.store,
    storeSlug: TRADEDOUBLER_MEDIAMARKT.slug,
    title: improveOfferTitle(title),
    description: String(product.shortDescription || product.description || title).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 320),
    image,
    url,
    price,
    priceLabel: euro(price),
    previousPrice: oldPrice,
    previousPriceLabel: euro(oldPrice),
    discount,
    category: categoryFor(category, title),
    score,
  };
}

export function extractMediaMarktCandidates(payload = {}, seenIds = new Set()) {
  const products = Array.isArray(payload.products) ? payload.products : [];
  return products
    .map(normalizeMediaMarktProduct)
    .filter((offer) => offer && !seenIds.has(offer.id))
    .sort((left, right) => right.score - left.score);
}

export function formatMediaMarktTelegramCaption(offer) {
  return formatTelegramDealCard({
    title: offer.title,
    store: offer.store,
    category: offer.category,
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    savings: euro(offer.previousPrice - offer.price),
    discount: offer.discount,
  });
}

export function formatMediaMarktWebsiteText(offer) {
  return formatWebsiteDealText({
    title: offer.title,
    store: offer.store,
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    savings: euro(offer.previousPrice - offer.price),
    discount: offer.discount,
    url: offer.url,
  });
}
