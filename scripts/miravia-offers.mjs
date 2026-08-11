import { formatTelegramDealCard, formatWebsiteDealText, improveOfferTitle } from './offer-presentation.mjs';

const STOP_WORDS = new Set([
  'de', 'la', 'el', 'los', 'las', 'y', 'en', 'para', 'con', 'por', 'un', 'una', 'pack', 'nuevo', 'nueva',
]);

function normalizeKey(value = '') {
  return String(value)
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toAmount(value) {
  const cleaned = String(value ?? '')
    .replace(/\u00a0/g, '')
    .replace(/\s/g, '')
    .replace(/[^0-9,.-]/g, '');
  if (!cleaned) return 0;

  const comma = cleaned.lastIndexOf(',');
  const dot = cleaned.lastIndexOf('.');
  let normalized = cleaned;
  if (comma >= 0 && dot >= 0) {
    normalized = comma > dot ? cleaned.replaceAll('.', '').replace(',', '.') : cleaned.replaceAll(',', '');
  } else if (comma >= 0) {
    normalized = cleaned.replace(',', '.');
  }
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function percentage(value) {
  const match = String(value ?? '').match(/-?\d+(?:[.,]\d+)?/);
  return match ? Number.parseFloat(match[0].replace(',', '.')) : 0;
}

function euro(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function nonEmpty(value) {
  return String(value ?? '').trim();
}

function columnValue(record, aliases) {
  for (const alias of aliases) {
    const value = record[alias];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function hasStock(record) {
  const value = columnValue(record, ['in_stock', 'is_for_sale', 'stock_status', 'availability']).toLocaleLowerCase('es');
  if (!value) return true;
  return !/^(0|false|no|out_of_stock|out of stock|agotado|unavailable)$/i.test(value);
}

function categoryFor(value) {
  const category = nonEmpty(value);
  const normalized = normalizeKey(category);
  if (/electron|informat|telefono|mobile|computer|software|gaming/.test(normalized)) return 'Tecnología';
  if (/home|hogar|garden|jardin|appliance|cocina/.test(normalized)) return 'Hogar';
  if (/beauty|belleza|health|salud/.test(normalized)) return 'Belleza';
  if (/sport|deporte/.test(normalized)) return 'Deporte';
  if (/toy|juguete|baby|bebe/.test(normalized)) return 'Juguetes';
  if (/fashion|moda|clothing|ropa|shoe|calzado/.test(normalized)) return 'Moda';
  return category || 'Miravia';
}

export function parseCsvRow(line = '') {
  const cells = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted && char === '"' && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

export function parseFeedList(csv = '') {
  const lines = String(csv).replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(Boolean);
  const [header, ...rows] = lines;
  if (!header) return [];
  const keys = parseCsvRow(header).map(normalizeKey);

  return rows.map((line) => {
    const values = parseCsvRow(line);
    return Object.fromEntries(keys.map((key, index) => [key, values[index] ?? '']));
  });
}

export function miraviaFeedEntries(feedList = []) {
  return feedList
    .filter((entry) => String(entry.advertiser_id) === '37168')
    .filter((entry) => /^spanish$/i.test(entry.language || '') || !entry.language)
    .filter((entry) => entry.url)
    .sort((left, right) => Number(left.feed_id) - Number(right.feed_id));
}

export function selectMiraviaFeed(entries = [], cursor = 0) {
  const premium = entries.filter((entry) => /premium product feed/i.test(entry.feed_name || ''));
  const local = entries.filter((entry) => /\blocal\b/i.test(entry.feed_name || ''));
  // Local feeds are smaller than the all-catalogue feed, so rotating them keeps
  // each scheduled run bounded while still covering Miravia's catalogue.
  const pool = local.length ? local : (premium.length ? premium : entries);
  if (!pool.length) return null;
  return pool[Math.abs(Number(cursor) || 0) % pool.length];
}

export function isGzipFeed(feedUrl = '', contentEncoding = '') {
  return /gzip/i.test(String(contentEncoding)) || /compression[=/]gzip/i.test(String(feedUrl));
}

export function miraviaRecordFromColumns(headers = [], values = []) {
  const record = {};
  headers.forEach((header, index) => {
    record[normalizeKey(header)] = values[index] ?? '';
  });
  return record;
}

export function normalizeMiraviaProduct(record = {}) {
  const id = columnValue(record, ['aw_product_id', 'product_id', 'merchant_product_id', 'pid']);
  const title = columnValue(record, ['product_name', 'name', 'title']);
  const url = columnValue(record, ['aw_deep_link', 'basket_link', 'merchant_deep_link']);
  const image = columnValue(record, ['aw_image_url', 'large_image', 'merchant_image_url', 'image_url', 'merchant_thumb_url']);
  const price = toAmount(columnValue(record, ['search_price', 'store_price', 'sale_price', 'price']));
  const oldPrice = toAmount(columnValue(record, ['product_price_old', 'rrp_price', 'base_price', 'old_price']));
  const reportedDiscount = percentage(columnValue(record, ['savings_percent', 'discount', 'discount_percent']));
  const calculatedDiscount = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  const discount = Math.max(reportedDiscount, calculatedDiscount);

  if (!id || !title || !url || !image || !hasStock(record) || price < 3 || price > 2500 || discount < 20) return null;
  if (!/^https?:\/\//i.test(url) || !/^https?:\/\//i.test(image)) return null;

  const category = categoryFor(columnValue(record, ['merchant_category', 'category_name', 'product_type', 'merchant_product_category_path']));
  const titleTerms = normalizeKey(title).split('_').filter((term) => term.length >= 4 && !STOP_WORDS.has(term));
  const popularity = Number.parseInt(columnValue(record, ['reviews', 'rating_count', 'number_available', 'stock_quantity']), 10) || 0;

  return {
    id: `miravia-${id}`,
    sourceProductId: id,
    title: improveOfferTitle(title),
    image,
    url,
    price,
    priceLabel: euro(price),
    previousPrice: oldPrice > price ? oldPrice : 0,
    previousPriceLabel: oldPrice > price ? euro(oldPrice) : '',
    discount: Math.round(discount),
    category,
    titleTerms,
    score: discount + Math.min(Math.max(popularity, 0), 500) / 100,
  };
}

export function formatMiraviaCaption(offer) {
  return formatWebsiteDealText({
    title: offer.title,
    store: 'Miravia',
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    savings: offer.previousPrice > offer.price ? euro(offer.previousPrice - offer.price) : '',
    discount: offer.discount,
  });
}

export function formatMiraviaTelegramCaption(offer) {
  return formatTelegramDealCard({
    title: offer.title,
    store: 'Miravia',
    category: offer.category,
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    savings: offer.previousPrice > offer.price ? euro(offer.previousPrice - offer.price) : '',
    discount: offer.discount,
  });
}
