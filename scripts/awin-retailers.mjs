import { formatTelegramDealCard, formatWebsiteDealText, improveOfferTitle } from './offer-presentation.mjs';

export const AWIN_PUBLISHER_ID = '2021553';
export const AWIN_RETAILERS = Object.freeze([
  { merchantId: '23677', store: 'Xiaomi', slug: 'xiaomi', domains: ['mi.com', 'xiaomi.com'] },
  { merchantId: '13075', store: 'El Corte Inglés', slug: 'el-corte-ingles', domains: ['elcorteingles.es'] },
  { merchantId: '20982', store: 'PcComponentes', slug: 'pccomponentes', domains: ['pccomponentes.com'] },
]);
export const AWIN_RETAIL_QUALITY_POLICY_VERSION = 'v1';

const LOW_INTEREST = /\b(?:funda|protector|cable|adaptador|recambio|repuesto|pegatina|llavero|calcetin|servilleta|mantel|bolsa|tornillo|cartucho compatible)\b/i;
const HIGH_INTEREST = /(?:smartphone|movil|tablet|portatil|ordenador|monitor|televisor|smart tv|consola|videojuego|auriculares|altavoz|reloj|smartwatch|robot aspirador|aspirador|freidora|cafetera|lavadora|secadora|frigorifico|lavavajillas|microondas|horno|colchon|perfume|zapatillas|lego|juguete|herramienta)/i;

function normalizeKey(value = '') {
  return String(value).trim().toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function value(record, aliases) {
  for (const alias of aliases) {
    const candidate = String(record[alias] ?? '').trim();
    if (candidate) return candidate;
  }
  return '';
}

function amount(input) {
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

function officialDestination(input, retailer) {
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !retailer.domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function isOwnedAwinLink(input, merchantId = '') {
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || (host !== 'awin1.com' && host !== 'www.awin1.com')) return false;
    const publisher = url.searchParams.get('awinaffid') || url.searchParams.get('a');
    const merchant = url.searchParams.get('awinmid') || url.searchParams.get('m');
    return publisher === AWIN_PUBLISHER_ID && Boolean(merchant) && (!merchantId || merchant === String(merchantId));
  } catch {
    return false;
  }
}

export function createOwnedAwinLink(destination, retailer) {
  const clean = officialDestination(destination, retailer);
  if (!clean) return '';
  const url = new URL('https://www.awin1.com/cread.php');
  url.searchParams.set('awinmid', retailer.merchantId);
  url.searchParams.set('awinaffid', AWIN_PUBLISHER_ID);
  url.searchParams.set('ued', clean);
  return url.toString();
}

export function retailerFeedEntries(feedList = [], retailer) {
  return feedList
    .filter((entry) => String(entry.advertiser_id || entry.merchant_id) === retailer.merchantId)
    .filter((entry) => !entry.language || /^spanish$/i.test(entry.language))
    .filter((entry) => /^https:\/\//i.test(entry.url || ''))
    .sort((left, right) => Number(left.feed_id || 0) - Number(right.feed_id || 0));
}

export function selectRetailerFeed(entries = [], cursor = 0) {
  if (!entries.length) return null;
  return entries[Math.abs(Number(cursor) || 0) % entries.length];
}

export function recordFromColumns(headers = [], cells = []) {
  return Object.fromEntries(headers.map((header, index) => [normalizeKey(header), cells[index] ?? '']));
}

function categoryFor(input = '', title = '') {
  const text = normalizeKey(`${input} ${title}`).replaceAll('_', ' ');
  if (/mobile|phone|telefon|informat|computer|electron|televis|audio|gaming/.test(text)) return 'Tecnología';
  if (/game|videojuego|playstation|nintendo|xbox/.test(text)) return 'Videojuegos';
  if (/home|hogar|cocina|appliance|electrodom/.test(text)) return 'Hogar';
  if (/beauty|belleza|perfume|salud/.test(text)) return 'Belleza';
  if (/sport|deporte/.test(text)) return 'Deporte';
  if (/toy|juguete|baby|bebe/.test(text)) return 'Juguetes';
  if (/fashion|moda|ropa|calzado/.test(text)) return 'Moda';
  return 'Ofertas';
}

export function retailQualityScore({ title = '', category = '', price = 0, oldPrice = 0 } = {}) {
  const searchable = normalizeKey(`${title} ${category}`).replaceAll('_', ' ');
  const saving = oldPrice - price;
  const discount = oldPrice > price ? (saving / oldPrice) * 100 : 0;
  if (!title || LOW_INTEREST.test(searchable) || !price || price < 10 || price > 3500) return 0;
  if (oldPrice <= price || discount < 20 || saving < 10) return 0;
  if (!HIGH_INTEREST.test(searchable) && (discount < 30 || saving < 20)) return 0;
  if (discount > 75) return 0;
  return Math.round(discount * 2 + Math.min(saving, 250) + (HIGH_INTEREST.test(searchable) ? 30 : 0));
}

export function normalizeRetailProduct(record = {}, retailer) {
  const sourceProductId = value(record, ['aw_product_id', 'merchant_product_id', 'product_id', 'pid']);
  const title = value(record, ['product_name', 'name', 'title']);
  const image = value(record, ['aw_image_url', 'large_image', 'merchant_image_url', 'image_url', 'merchant_thumb_url']);
  const price = amount(value(record, ['search_price', 'store_price', 'sale_price', 'price']));
  const oldPrice = amount(value(record, ['product_price_old', 'rrp_price', 'base_price', 'old_price']));
  const rawCategory = value(record, ['merchant_category', 'category_name', 'product_type', 'merchant_product_category_path']);
  const rawLink = value(record, ['aw_deep_link', 'basket_link']);
  const destination = value(record, ['merchant_deep_link', 'merchant_product_url', 'product_url', 'deep_link']);
  const url = isOwnedAwinLink(rawLink, retailer.merchantId) ? rawLink : createOwnedAwinLink(destination, retailer);
  const stock = value(record, ['in_stock', 'is_for_sale', 'stock_status', 'availability']).toLowerCase();
  const score = retailQualityScore({ title, category: rawCategory, price, oldPrice });
  if (!sourceProductId || !title || !image || !url || !score || /^(0|false|no|out.of.stock|agotado|unavailable)$/i.test(stock)) return null;
  try { if (new URL(image).protocol !== 'https:') return null; } catch { return null; }
  const discount = Math.round(((oldPrice - price) / oldPrice) * 100);
  return {
    id: `awin-${retailer.merchantId}-${sourceProductId}`,
    sourceProductId,
    store: retailer.store,
    storeSlug: retailer.slug,
    merchantId: retailer.merchantId,
    title: improveOfferTitle(title),
    image,
    url,
    price,
    priceLabel: euro(price),
    previousPrice: oldPrice,
    previousPriceLabel: euro(oldPrice),
    discount,
    category: categoryFor(rawCategory, title),
    score,
  };
}

export function formatRetailCaption(offer) {
  return formatWebsiteDealText({ title: offer.title, store: offer.store, price: offer.priceLabel, previousPrice: offer.previousPriceLabel, savings: euro(offer.previousPrice - offer.price), discount: offer.discount, url: offer.url });
}

export function formatRetailTelegramCaption(offer) {
  return formatTelegramDealCard({ title: offer.title, store: offer.store, category: offer.category, price: offer.priceLabel, previousPrice: offer.previousPriceLabel, savings: euro(offer.previousPrice - offer.price), discount: offer.discount });
}
