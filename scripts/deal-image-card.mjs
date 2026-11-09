import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { couponOptions } from './coupon-options.mjs';
import { improveOfferTitle } from './offer-presentation.mjs';

const CARD_SIZE = 1200;
const PHOTO_HEIGHT = 760;
const TITLE_FONT = fileURLToPath(new URL('../public/fonts/BarlowCondensed-ExtraBold.ttf',import.meta.url));

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
    if (line && `${line} ${word}`.length > 32) {
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
      <title>${escapeXml(title)} · ${currentPrice}</title>
      <rect x="48" y="40" width="58" height="58" rx="18" fill="#ff641c"/>
      <path d="M85 53a17 17 0 1 0 0 31" fill="none" stroke="#163c2f" stroke-width="8" stroke-linecap="round"/>
      <path d="m79 70 7 7 13-16" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="124" y="79" font-family="Arial, Helvetica, sans-serif" font-size="29" font-weight="900" fill="#173a2b">CHOLLOS AL DÍA</text>
      <rect x="860" y="40" width="292" height="58" rx="29" fill="#173a2b"/>
      <text x="1006" y="79" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="29" font-weight="800" fill="#ffffff">${escapeXml(theme.label)}</text>
      <line x1="48" y1="121" x2="1152" y2="121" stroke="#e8ebe5" stroke-width="2"/>
      <rect x="48" y="922" width="1104" height="218" rx="30" fill="#fff0e4"/>
      <text x="80" y="967" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" letter-spacing="3" fill="#8f3a13">PRECIO DE LA OFERTA</text>
      <text x="76" y="1100" font-family="Arial, Helvetica, sans-serif" font-size="${priceText(price).length > 10 ? 128 : 158}" font-weight="900" fill="#b73308">${currentPrice}</text>
      <path d="M1010 1028h80m-31-31 31 31-31 31" fill="none" stroke="#c23c0c" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="48" y="1180" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700" fill="#566157">@aldiachollos</text>
      <text x="1152" y="1180" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#566157">chollosaldia.com · Publicidad</text>
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
      height: 560,
      fit: 'contain',
      background: '#ffffff',
      withoutEnlargement: false,
    })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();

  const titleLayers = title ? [{input:await sharp({text:{text:`<span foreground="#172c24" weight="heavy">${dealImageTitleLines(title).map(escapeXml).join('\n')}</span>`,font:'Barlow Condensed ExtraBold 88',fontfile:TITLE_FONT,width:1072,height:170,align:'left',rgba:true,wrap:'word'}}).png().toBuffer(),left:64,top:151}] : [];

  return sharp({
    create: {
      width: CARD_SIZE,
      height: CARD_SIZE,
      channels: 3,
      background: '#ffffff',
    },
  })
    .composite([
      { input: product, left: 60, top: 340 },
      { input: cardOverlay({ title, store, price, previousPrice, discount, coupon }), left: 0, top: 0 },
      ...titleLayers,
    ])
    .jpeg({ quality: 91, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toBuffer();
}

export function dealImageCardFilename(store = '', id = '') {
  const safeStore = compact(store).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'oferta';
  const safeId = compact(id).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80) || Date.now();
  return `${safeStore}-${safeId}-telegram.jpg`;
}
