import crypto from 'node:crypto';

export const ALIEXPRESS_ENDPOINT = 'https://api-sg.aliexpress.com/sync';

export const ALIEXPRESS_SEARCH_TOPICS = [
  { keywords: 'auriculares bluetooth', category: 'Tecnología' },
  { keywords: 'robot aspirador', category: 'Hogar' },
  { keywords: 'teclado mecánico', category: 'Tecnología' },
  { keywords: 'freidora de aire', category: 'Hogar' },
  { keywords: 'herramientas bricolaje', category: 'Bricolaje' },
  { keywords: 'smartwatch', category: 'Tecnología' },
  { keywords: 'accesorios gaming', category: 'Videojuegos' },
  { keywords: 'cafetera', category: 'Hogar' },
  { keywords: 'juguetes educativos', category: 'Juguetes' },
  { keywords: 'cargador usb c', category: 'Tecnología' },
];

export function topicsForAliExpressRun(cursor = 0, count = 2) {
  return Array.from(
    { length: count },
    (_, index) => ALIEXPRESS_SEARCH_TOPICS[(cursor + index) % ALIEXPRESS_SEARCH_TOPICS.length],
  );
}

export function createAliExpressSignature(params, appSecret) {
  const canonical = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}${value}`)
    .join('');

  return crypto.createHmac('sha256', appSecret).update(canonical).digest('hex').toUpperCase();
}

function toAmount(value) {
  const amount = Number.parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(amount) ? amount : 0;
}

function percentage(value) {
  const match = String(value || '').match(/(\d+(?:[.,]\d+)?)/);
  return match ? Number.parseFloat(match[1].replace(',', '.')) : 0;
}

function euro(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function normalizeAliExpressProduct(product, category) {
  const id = String(product?.product_id || '').trim();
  const title = String(product?.product_title || '').trim();
  const image = String(product?.product_main_image_url || '').trim();
  const url = String(product?.promotion_link || '').trim();
  const price = toAmount(product?.target_sale_price);
  const previousPrice = toAmount(product?.target_original_price);
  const calculatedDiscount = previousPrice > price
    ? Math.round(((previousPrice - price) / previousPrice) * 100)
    : 0;
  const discount = Math.max(percentage(product?.discount), calculatedDiscount);
  const volume = Number.parseInt(product?.lastest_volume || '0', 10) || 0;
  const commission = percentage(product?.commission_rate);

  if (!id || !title || !image || !url || price < 3 || discount < 20 || volume < 5) return null;

  return {
    id,
    title: title.slice(0, 220),
    image,
    url,
    category: String(product?.first_level_category_name || category || 'AliExpress').slice(0, 60),
    siteCategory: category || 'Tecnología',
    price,
    priceLabel: euro(price),
    previousPrice: previousPrice > price ? previousPrice : 0,
    previousPriceLabel: previousPrice > price ? euro(previousPrice) : '',
    discount,
    volume,
    commission,
    score: discount + Math.min(volume, 500) / 50 + commission,
  };
}

export function formatAliExpressCaption(offer) {
  const before = offer.previousPriceLabel ? `\n🏷️ Antes: ${offer.previousPriceLabel}` : '';
  const popularity = offer.volume > 20 ? `\n🔥 ${offer.volume}+ pedidos recientes` : '';

  return [
    offer.title,
    '',
    '🛍️ OFERTÓN ALIEXPRESS 🔥',
    '',
    `💶 PRECIO OFERTA: ${offer.priceLabel}${before}`,
    `📉 Descuento: ${offer.discount}%${popularity}`,
    '',
    `📂 ${offer.category}`,
    '👇 Pulsa para ver la oferta en AliExpress',
    '#Chollos #AliExpress #Ofertas',
  ].join('\n').slice(0, 1000);
}
