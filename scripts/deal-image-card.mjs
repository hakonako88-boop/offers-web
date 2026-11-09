import sharp from 'sharp';
import { couponOptions } from './coupon-options.mjs';
import { improveOfferTitle } from './offer-presentation.mjs';

const CARD_SIZE = 1200;
const PHOTO_HEIGHT = 760;

function compact(value = '') {
  return String(value).replace(/\s+/gu, ' ').trim();
}

function escapeXml(value = '') {
  return compact(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function storeTheme(store = '') {
  const name = compact(store).toLowerCase();
  if (name === 'aliexpress') return { label: 'ALIEXPRESS', accent: '#ff4747', soft: '#fff0f0' };
  if (name === 'miravia') return { label: 'MIRAVIA', accent: '#7d2ae8', soft: '#f4edff' };
  if (name === 'amazon') return { label: 'AMAZON', accent: '#ff9900', soft: '#fff6e5' };
  return { label: compact(store).toUpperCase() || 'OFERTA', accent: '#ff5a4f', soft: '#fff0ed' };
}

function priceText(value = '') {
  return compact(value).replace(/\s*€/u, ' €');
}

function previousPriceLine(previousPrice = '') {
  const value = priceText(previousPrice);
  if (!value) return '';
  const safeValue = escapeXml(value);
  return [
    `<text x="600" y="1035" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#676b68">Antes ${safeValue}</text>`,
    '<line x1="430" y1="1023" x2="770" y2="1023" stroke="#b9653c" stroke-width="3" stroke-linecap="round"/>',
  ].join('');
}

function discountBadge(discount = 0, accent = '#ff5a4f') {
  const amount = Math.round(Number(discount) || 0);
  if (amount <= 0 || amount >= 100) return '';
  return [
    `<rect x="930" y="534" width="206" height="100" rx="24" fill="#ed4b12"/>`,
    `<text x="1033" y="601" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="900" fill="#ffffff">−${amount}%</text>`,
  ].join('');
}

function couponBadge(coupon = '', accent = '#ff5a4f') {
  const originalCode = couponOptions(coupon).codes[0] || '';
  const code = originalCode.length <= 20 ? escapeXml(originalCode) : '';
  if (!code) return '';
  return [
    `<rect x="64" y="1062" width="1072" height="72" rx="18" fill="#fff0d7" stroke="#e3b77c" stroke-width="2"/>`,
    `<text x="90" y="1109" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#70421b">CUPÓN AL PAGAR</text>`,
    `<text x="1106" y="1110" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="900" fill="#713108">${code}</text>`,
  ].join('');
}

export function dealImageTitleLines(title = '') {
  const words = compact(improveOfferTitle(title)).split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > 48) {
      lines.push(line);
      line = word;
      if (lines.length === 2) { lines[1] = lines[1].replace(/[.,;:-]+$/u,'') + '…'; return lines; }
    } else line = line ? `${line} ${word}` : word;
  }
  if (line && lines.length < 2) lines.push(line);
  return lines;
}

export function cardOverlay({ title = '', store, price } = {}) {
  const theme = storeTheme(store);
  const currentPrice = escapeXml(priceText(price));
  return Buffer.from(`
    <svg width="${CARD_SIZE}" height="${CARD_SIZE}" viewBox="0 0 ${CARD_SIZE} ${CARD_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="1200" height="1200" fill="none"/>
      <rect x="0" y="0" width="1200" height="88" fill="#103e30"/>
      <text x="48" y="57" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="900" fill="#ffffff">CHOLLOS AL DÍA</text>
      <text x="1152" y="55" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="700" fill="#ffffff">${escapeXml(theme.label)}</text>
      <rect x="0" y="744" width="1200" height="456" fill="#fffcf7"/>
      ${dealImageTitleLines(title).map((line,index)=>`<text x="600" y="${797+index*50}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="800" fill="#183b30">${escapeXml(line)}</text>`).join('')}
      <rect x="64" y="883" width="1072" height="220" rx="28" fill="#ad3007"/>
      <text x="600" y="1045" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${priceText(price).length > 10 ? 124 : 164}" font-weight="900" fill="#ffffff">${currentPrice}</text>
      <text x="600" y="1165" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="29" font-weight="700" fill="#525a53">@aldiachollos · Publicidad</text>
    </svg>
  `);
}

async function imageBytesFromUrl(imageUrl, fetchImpl = fetch) {
  const response = await fetchImpl(imageUrl, {
    headers: {
      accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
      'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)',
    },
    signal: AbortSignal.timeout(15_000),
  });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.toLowerCase().startsWith('image/')) {
    throw new Error(`La fotografía del producto respondió ${response.status}.`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 2_000) throw new Error('La fotografía del producto es demasiado pequeña.');
  return bytes;
}

/** Builds a square Telegram-ready JPEG from the shop's clean product image.
 * The external channel image is never required: the caller should pass the
 * official catalogue image whenever it is available. */
export async function createDealImageCard({
  title = '',
  imageUrl = '',
  imageBytes,
  imageBuffer,
  store,
  price,
  previousPrice = '',
  discount = 0,
  coupon = '',
  fetchImpl = fetch,
} = {}) {
  const suppliedImage = imageBytes || imageBuffer;
  const input = suppliedImage ? Buffer.from(suppliedImage) : await imageBytesFromUrl(imageUrl, fetchImpl);
  const product = await sharp(input, { failOn: 'none' })
    .rotate()
    .trim({ threshold: 8 })
    .resize({
      width: 1080,
      height: 600,
      fit: 'contain',
      background: '#ffffff',
      withoutEnlargement: false,
    })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();

  return sharp({
    create: {
      width: CARD_SIZE,
      height: CARD_SIZE,
      channels: 3,
      background: '#ffffff',
    },
  })
    .composite([
      { input: product, left: 60, top: 125 },
      { input: cardOverlay({ title, store, price, previousPrice, discount, coupon }), left: 0, top: 0 },
    ])
    .jpeg({ quality: 91, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toBuffer();
}

export function dealImageCardFilename(store = '', id = '') {
  const safeStore = compact(store).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'oferta';
  const safeId = compact(id).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80) || Date.now();
  return `${safeStore}-${safeId}-telegram.jpg`;
}
