import { formatTelegramDealCard, formatWebsiteDealText, improveOfferTitle } from './offer-presentation.mjs';

const STOP_WORDS = new Set([
  'de', 'la', 'el', 'los', 'las', 'y', 'en', 'para', 'con', 'por', 'un', 'una', 'pack', 'nuevo', 'nueva',
]);

// A catalogue discount alone is not a chollo. These are low-intent catalogue
// items that routinely have inflated reference prices and should never occupy
// a slot in an editorial deals channel.
const LOW_INTEREST_TERMS = [
  'malla', 'ocultacion', 'relleno', 'cojin', 'almohada', 'funda', 'cortina',
  'tela', 'persiana', 'recambio', 'repuesto', 'tornillo', 'brida', 'pegatina',
  'adhesivo', 'organizador', 'bolsa de', 'filtro de', 'protector de', 'mantel',
  'table cloth', 'table linen', 'camino de mesa', 'servilleta',
];

const TRUSTED_BRANDS = [
  'apple', 'samsung', 'xiaomi', 'redmi', 'poco', 'google', 'sony', 'nintendo',
  'playstation', 'logitech', 'razer', 'jbl', 'bose', 'philips', 'dyson', 'ghd',
  'oral b', 'braun', 'rowenta', 'bosch', 'siemens', 'lg', 'tp link', 'amazon',
  'lego', 'hasbro', 'barbie', 'adidas', 'nike', 'puma', 'new balance',
  // Marcas de compra recurrente en categorías relevantes. El feed de Awin no
  // siempre trae reseñas, por lo que reconocerlas evita vaciar el canal sin
  // abrir la puerta a productos genéricos de catálogo.
  'asus', 'acer', 'lenovo', 'hp', 'dell', 'msi', 'corsair', 'huawei', 'honor',
  'garmin', 'fitbit', 'canon', 'epson', 'cecotec', 'karcher', 'intex',
];

// The Awin feed frequently supplies 200 px thumbnails that weigh only a few
// kilobytes. They look visibly blurred once Telegram or the web card enlarges
// them. This guard is deliberately conservative: it rejects the tiny feed
// rendition, without treating a normal product photo as an error.
export const MIN_MIRAVIA_PRODUCT_IMAGE_BYTES = 12_000;
export const MIRAVIA_QUALITY_POLICY_VERSION = 'v3';

export function isMiraviaProductImageLargeEnough(byteLength = 0) {
  return Number(byteLength) >= MIN_MIRAVIA_PRODUCT_IMAGE_BYTES;
}

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

/** Returns Miravia's product-page social image instead of the 200 px feed thumbnail.
 * A CDN image is permitted only after the caller has verified that the page itself
 * is an official Miravia product page. This lets us use the sharper social image
 * without accepting an arbitrary image from a tracking redirect. */
export function productImageFromPage(html = '', fallback = '', { allowExternalCdn = false } = {}) {
  const tags = String(html).match(/<meta\b[^>]*>/giu) || [];
  for (const tag of tags) {
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/iu)?.[1]?.toLocaleLowerCase('en');
    if (key !== 'og:image' && key !== 'twitter:image') continue;
    const value = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/iu)?.[1]?.replaceAll('&amp;', '&') || '';
    try {
      const imageUrl = new URL(value);
      const host = imageUrl.hostname.toLocaleLowerCase('en');
      const isMiraviaImage = host === 'miravia.es' || host.endsWith('.miravia.es');
      if (imageUrl.protocol === 'https:' && (isMiraviaImage || allowExternalCdn)) return highResolutionMiraviaImage(imageUrl.toString());
    } catch {
      // The feed thumbnail remains the safe fallback when the page has no usable image.
    }
  }
  return fallback;
}

/** Awin's Miravia feeds often contain a 200 px thumbnail even though its CDN
 * can deliver the same product image at a card-ready size. */
export function highResolutionMiraviaImage(image = '') {
  try {
    const parsed = new URL(String(image));
    const host = parsed.hostname.toLocaleLowerCase('en');
    if (host !== 'miravia.es' && !host.endsWith('.miravia.es')) return String(image);
    parsed.pathname = parsed.pathname.replace(/_\d{2,4}x\d{2,4}q\d+(?=\.(?:jpe?g|png|webp)$)/iu, '_720x720q85');
    return parsed.toString();
  } catch {
    return String(image);
  }
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

function containsOne(value = '', terms = []) {
  const normalized = ` ${normalizeKey(value).replaceAll('_', ' ')} `;
  return terms.some((term) => normalized.includes(` ${normalizeKey(term).replaceAll('_', ' ')} `));
}

function highInterestCategory(value = '') {
  const normalized = normalizeKey(value);
  return /electron|informat|telefono|mobile|computer|software|gaming|consola|videojuego|appliance|cocina|beauty|belleza|health|salud|sport|deporte|toy|juguete|baby|bebe/.test(normalized);
}

/** Editorial score used to prefer proven, useful products over the largest
 * catalogue percentage. It deliberately rejects products with no real PVP
 * comparison, no social proof and generic accessory/home-textile wording. */
export function miraviaQualityScore({ title = '', category = '', price = 0, oldPrice = 0, reviews = 0 } = {}) {
  const saving = oldPrice - price;
  const discount = oldPrice > price ? ((saving / oldPrice) * 100) : 0;
  const branded = containsOne(title, TRUSTED_BRANDS);
  const popular = Number(reviews) || 0;

  if (!title || !highInterestCategory(category) || containsOne(`${title} ${category}`, LOW_INTEREST_TERMS)) return 0;
  if (!oldPrice || oldPrice <= price || discount < 35 || saving < 10) return 0;
  // A catalogue percentage by itself is not enough. Products without a
  // recognised brand need strong buyer demand before they occupy the channel.
  // This prevents cheap, generic listings with an inflated reference price.
  // Los feeds de Awin no siempre incluyen el contador de reseñas. En ese
  // caso solo aceptamos una marca reconocida con una rebaja y ahorro realmente
  // altos; los productos genéricos siguen exigiendo prueba de demanda.
  if (branded && popular > 0 && popular < 20) return 0;
  if (!branded && popular < 120) return 0;
  // Sin reseñas en Awin solo entra una marca reconocida con rebaja y ahorro
  // demostrables; sigue quedando fuera el producto barato o poco relevante.
  if (branded && !popular && (discount < 40 || saving < 12 || price < 18)) return 0;
  if (price < 12 && (saving < 25 || popular < 180)) return 0;
  if (discount > 70 && popular < (branded ? 75 : 250)) return 0;

  return Math.round(
    (discount * 1.25)
    + Math.min(saving, 80)
    + Math.min(popular, 500) / 5
    + (branded ? 18 : 0),
  );
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
  const image = highResolutionMiraviaImage(columnValue(record, ['aw_image_url', 'large_image', 'merchant_image_url', 'image_url', 'merchant_thumb_url']));
  const price = toAmount(columnValue(record, ['search_price', 'store_price', 'sale_price', 'price']));
  const oldPrice = toAmount(columnValue(record, ['product_price_old', 'rrp_price', 'base_price', 'old_price']));
  const calculatedDiscount = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  if (!id || !title || !url || !image || !hasStock(record) || price < 3 || price > 2500) return null;
  if (!/^https?:\/\//i.test(url) || !/^https?:\/\//i.test(image)) return null;

  const rawCategory = columnValue(record, ['merchant_category', 'category_name', 'product_type', 'merchant_product_category_path']);
  const category = categoryFor(rawCategory);
  const titleTerms = normalizeKey(title).split('_').filter((term) => term.length >= 4 && !STOP_WORDS.has(term));
  const popularity = Number.parseInt(columnValue(record, ['reviews', 'rating_count', 'review_count', 'number_available']), 10) || 0;
  const qualityScore = miraviaQualityScore({ title, category: rawCategory, price, oldPrice, reviews: popularity });
  if (!qualityScore) return null;

  return {
    id: `miravia-${id}`,
    sourceProductId: id,
    store: 'Miravia',
    title: improveOfferTitle(title),
    image,
    url,
    price,
    priceLabel: euro(price),
    previousPrice: oldPrice > price ? oldPrice : 0,
    previousPriceLabel: oldPrice > price ? euro(oldPrice) : '',
    discount: calculatedDiscount,
    category,
    titleTerms,
    score: qualityScore,
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
    url: offer.url,
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
