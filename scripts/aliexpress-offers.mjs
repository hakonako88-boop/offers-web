import crypto from 'node:crypto';
import { formatTelegramDealCard, formatWebsiteDealText, improveOfferTitle } from './offer-presentation.mjs';

export const ALIEXPRESS_ENDPOINT = 'https://api-sg.aliexpress.com/sync';

export const ALIEXPRESS_SEARCH_TOPICS = [
  { keywords: 'auriculares bluetooth', category: 'Tecnología', titleTerms: ['auriculares', 'headphones', 'earbuds', 'cascos'] },
  { keywords: 'robot aspirador', category: 'Hogar', titleTerms: ['robot aspirador', 'aspirador'] },
  { keywords: 'teclado mecánico', category: 'Tecnología', titleTerms: ['teclado', 'keyboard'] },
  { keywords: 'freidora de aire', category: 'Hogar', titleTerms: ['freidora', 'air fryer'] },
  { keywords: 'herramientas bricolaje', category: 'Bricolaje', titleTerms: ['herramienta', 'destornillador', 'taladro', 'alicates', 'broca'] },
  { keywords: 'smartwatch', category: 'Tecnología', titleTerms: ['smartwatch', 'reloj inteligente', 'pulsera inteligente'] },
  { keywords: 'accesorios gaming', category: 'Videojuegos', titleTerms: ['gaming', 'mando', 'ratón', 'mouse', 'teclado'] },
  { keywords: 'cafetera', category: 'Hogar', titleTerms: ['cafetera', 'café'] },
  { keywords: 'juguetes educativos', category: 'Juguetes', titleTerms: ['juguete', 'muñeco', 'juego', 'tamagotchi'] },
  { keywords: 'cargador usb c', category: 'Tecnología', titleTerms: ['cargador', 'cable usb', 'usb-c'] },
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

/** AliExpress feeds sometimes append a thumbnail size to an otherwise
 * high-quality CDN image. Upgrade only its own CDN URLs, keeping third-party
 * image links untouched so Telegram always receives the clearest safe photo. */
export function highResolutionAliExpressImage(image = '') {
  try {
    const parsed = new URL(String(image));
    if (!/(^|\.)alicdn\.com$/iu.test(parsed.hostname)) return String(image);
    parsed.pathname = parsed.pathname.replace(
      /_\d{2,4}x\d{2,4}(?:q\d+)?(?=\.(?:jpe?g|png|webp)$)/iu,
      '_1000x1000q75',
    );
    return parsed.toString();
  } catch {
    return String(image);
  }
}

function toAmount(value) {
  const amount = Number.parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(amount) ? amount : 0;
}

function percentage(value) {
  const match = String(value || '').match(/(\d+(?:[.,]\d+)?)/);
  return match ? Number.parseFloat(match[1].replace(',', '.')) : 0;
}

function normalizedText(value) {
  return String(value || '')
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function euro(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function normalizeAliExpressProduct(product, category, titleTerms = [], minimumTitleMatches = 1) {
  const id = String(product?.product_id || '').trim();
  const title = String(product?.product_title || '').trim();
  const image = highResolutionAliExpressImage(product?.product_main_image_url || '');
  const url = String(product?.promotion_link || '').trim();
  const price = toAmount(product?.target_sale_price);
  const previousPrice = toAmount(product?.target_original_price);
  const calculatedDiscount = previousPrice > price
    ? Math.round(((previousPrice - price) / previousPrice) * 100)
    : 0;
  const discount = Math.max(percentage(product?.discount), calculatedDiscount);
  const volume = Number.parseInt(product?.lastest_volume || '0', 10) || 0;
  const commission = percentage(product?.commission_rate);
  const normalizedTitle = normalizedText(title);
  const matchedTitleTerms = titleTerms.filter((term) => normalizedTitle.includes(normalizedText(term))).length;
  const isRelated = !titleTerms.length || matchedTitleTerms >= Math.min(minimumTitleMatches, titleTerms.length);

  if (!id || !title || !image || !url || price < 3 || discount < 20 || volume < 5 || !isRelated) return null;

  return {
    id,
    title: improveOfferTitle(title),
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
    matchedTitleTerms,
  };
}

export function formatAliExpressCaption(offer) {
  return formatWebsiteDealText({
    title: offer.title,
    store: 'AliExpress',
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    savings: offer.previousPrice > offer.price ? euro(offer.previousPrice - offer.price) : '',
    discount: offer.discount,
  });
}

export function formatAliExpressTelegramCaption(offer) {
  const popularity = offer.volume > 20 ? `${offer.volume}+ pedidos recientes` : '';
  return formatTelegramDealCard({
    title: offer.title,
    store: 'AliExpress',
    category: offer.siteCategory || offer.category,
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    savings: offer.previousPrice > offer.price ? euro(offer.previousPrice - offer.price) : '',
    discount: offer.discount,
    highlight: popularity,
    url: offer.url,
  });
}
