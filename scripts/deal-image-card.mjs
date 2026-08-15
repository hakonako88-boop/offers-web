import sharp from 'sharp';

const CARD_SIZE = 1200;
const PHOTO_HEIGHT = 890;

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
    `<text x="930" y="1052" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="#94a3b8">Antes ${safeValue}</text>`,
    '<line x1="700" y1="1038" x2="930" y2="1038" stroke="#ff5a4f" stroke-width="7" stroke-linecap="round"/>',
  ].join('');
}

function discountBadge(discount = 0, accent = '#ff5a4f') {
  const amount = Math.round(Number(discount) || 0);
  if (amount <= 0) return '';
  return [
    `<rect x="940" y="930" width="205" height="112" rx="32" fill="${accent}"/>`,
    `<text x="1042" y="1002" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="900" fill="#ffffff">−${amount}%</text>`,
  ].join('');
}

function cardOverlay({ store, price, previousPrice = '', discount = 0 } = {}) {
  const theme = storeTheme(store);
  const currentPrice = escapeXml(priceText(price));
  return Buffer.from(`
    <svg width="${CARD_SIZE}" height="${CARD_SIZE}" viewBox="0 0 ${CARD_SIZE} ${CARD_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="1200" height="1200" fill="none"/>
      <rect x="0" y="${PHOTO_HEIGHT}" width="1200" height="310" fill="#18213e"/>
      <rect x="0" y="${PHOTO_HEIGHT}" width="1200" height="13" fill="${theme.accent}"/>
      <rect x="56" y="930" width="270" height="76" rx="25" fill="${theme.soft}"/>
      <text x="191" y="981" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="35" font-weight="900" fill="${theme.accent}">${theme.label}</text>
      <text x="56" y="1094" font-family="Arial, Helvetica, sans-serif" font-size="91" font-weight="900" fill="#ffffff">${currentPrice}</text>
      ${previousPriceLine(previousPrice)}
      ${discountBadge(discount, theme.accent)}
      <text x="1144" y="1161" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" fill="#facc15">CHOLLOSALDIA.COM</text>
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
  imageUrl = '',
  imageBytes,
  store,
  price,
  previousPrice = '',
  discount = 0,
  fetchImpl = fetch,
} = {}) {
  const input = imageBytes ? Buffer.from(imageBytes) : await imageBytesFromUrl(imageUrl, fetchImpl);
  const product = await sharp(input, { failOn: 'none' })
    .rotate()
    .resize({
      width: 1080,
      height: 790,
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
      { input: product, left: 60, top: 50 },
      { input: cardOverlay({ store, price, previousPrice, discount }), left: 0, top: 0 },
    ])
    .jpeg({ quality: 91, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toBuffer();
}

export function dealImageCardFilename(store = '', id = '') {
  const safeStore = compact(store).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'oferta';
  const safeId = compact(id).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80) || Date.now();
  return `${safeStore}-${safeId}-telegram.jpg`;
}
