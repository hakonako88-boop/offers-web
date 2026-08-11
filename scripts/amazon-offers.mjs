export const AMAZON_MARKETPLACE = 'www.amazon.es';
export const SEARCH_TOPICS = [
  { keywords: 'auriculares inalámbricos', searchIndex: 'Electronics', category: 'Tecnología' },
  { keywords: 'robot aspirador', searchIndex: 'HomeAndKitchen', category: 'Hogar' },
  { keywords: 'teclado mecánico', searchIndex: 'Electronics', category: 'Tecnología' },
  { keywords: 'monitor gaming', searchIndex: 'Electronics', category: 'Tecnología' },
  { keywords: 'herramientas bricolaje', searchIndex: 'ToolsAndHomeImprovement', category: 'Bricolaje' },
  { keywords: 'freidora de aire', searchIndex: 'HomeAndKitchen', category: 'Hogar' },
  { keywords: 'videojuegos', searchIndex: 'VideoGames', category: 'Videojuegos' },
  { keywords: 'smartwatch', searchIndex: 'Electronics', category: 'Tecnología' },
  { keywords: 'cafetera', searchIndex: 'HomeAndKitchen', category: 'Hogar' },
  { keywords: 'juguetes', searchIndex: 'ToysAndGames', category: 'Juguetes' },
];

export function topicsForRun(cursor = 0, count = 2) {
  return Array.from({ length: count }, (_, index) => SEARCH_TOPICS[(cursor + index) % SEARCH_TOPICS.length]);
}

function telegramHtml(value, maximum = 240) {
  return String(value || '')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maximum)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isInStock(listing) {
  const availability = String(listing?.availability?.type || '').toUpperCase();
  return !availability || availability === 'IN_STOCK';
}

function chooseListing(listings = []) {
  return [...listings]
    .filter((listing) => isInStock(listing) && listing?.condition?.value === 'New' && listing?.price?.money?.amount)
    .sort((a, b) => {
      const aScore = Number(Boolean(a.isBuyBoxWinner)) * 100 + Number(Boolean(a.dealDetails)) * 10 + Number(a.price?.savings?.percentage || 0);
      const bScore = Number(Boolean(b.isBuyBoxWinner)) * 100 + Number(Boolean(b.dealDetails)) * 10 + Number(b.price?.savings?.percentage || 0);
      return bScore - aScore;
    })[0] || null;
}

export function normalizeAmazonItem(item, category) {
  const listing = chooseListing(item?.offersV2?.listings || []);
  const title = String(item?.itemInfo?.title?.displayValue || '').trim();
  const image = item?.images?.primary?.large?.url || item?.images?.primary?.medium?.url || item?.images?.primary?.small?.url || '';
  const price = listing?.price?.money;
  const savings = listing?.price?.savings;
  const discount = Number(savings?.percentage || 0);
  const isDeal = Boolean(listing?.dealDetails) || /DEAL/i.test(String(listing?.type || ''));

  if (!item?.asin || !title || !image || !item?.detailPageURL || !price?.displayAmount) return null;
  if (!listing || price.amount < 5) return null;
  if (!isDeal && discount < 20) return null;
  if (discount < 12) return null;

  return {
    asin: item.asin,
    title: title.slice(0, 220),
    url: item.detailPageURL,
    image,
    category,
    price: price.displayAmount,
    priceAmount: Number(price.amount),
    previousPrice: listing.price?.savingBasis?.money?.displayAmount || '',
    discount,
    savings: savings?.money?.displayAmount || '',
    dealType: String(listing?.type || ''),
    isPrime: String(listing?.dealDetails?.accessType || '').toUpperCase().includes('PRIME'),
    score: discount + (isDeal ? 35 : 0) + (listing.isBuyBoxWinner ? 10 : 0),
  };
}

export function formatAmazonCaption(offer) {
  const savings = offer.savings ? `\n💸 Ahorras: ${offer.savings}` : '';
  const before = offer.previousPrice ? `\n🏷 Antes: ${offer.previousPrice}` : '';
  const urgency = offer.dealType ? '\n⚡ Oferta temporal' : '';
  const prime = offer.isPrime ? '\n🚚 Prime' : '';

  return [
    '#publi',
    '',
    '🛒 OFERTÓN EN AMAZON',
    '',
    offer.title,
    '',
    `💶 Precio: ${offer.price}${before}${savings}`,
    `📉 Descuento: ${offer.discount}%${urgency}${prime}`,
    `📂 Categoría: ${offer.category}`,
    '',
    '👇 Toca el botón para ver la oferta.',
    '⚠️ El precio y el stock pueden cambiar.',
    '#Chollos #Amazon #Ofertas',
  ].join('\n').slice(0, 1000);
}

export function formatAmazonTelegramCaption(offer) {
  const before = offer.previousPrice
    ? `🏷️ <b>Antes:</b> <s>${telegramHtml(offer.previousPrice, 32)}</s>`
    : '';
  const savings = offer.savings ? `💸 <b>Ahorras:</b> ${telegramHtml(offer.savings, 32)}` : '';
  const urgency = offer.dealType ? '⚡ <b>Oferta temporal</b>' : '';
  const prime = offer.isPrime ? '🚚 <b>Envío Prime</b>' : '';

  return [
    '#publi',
    '',
    '<b>🛒 OFERTÓN EN AMAZON</b>',
    '━━━━━━━━━━━━━━━━━━',
    `<b>${telegramHtml(offer.title)}</b>`,
    '',
    `💶 <b>PRECIO:</b> <b>${telegramHtml(offer.price, 32)}</b>`,
    before,
    savings,
    `📉 <b>DESCUENTO:</b> ${telegramHtml(offer.discount, 12)}%`,
    urgency,
    prime,
    `📂 <b>Categoría:</b> ${telegramHtml(offer.category, 52)}`,
    '━━━━━━━━━━━━━━━━━━',
    '<i>⚠️ Precio y stock pueden cambiar.</i>',
    '#Chollos #Amazon',
  ].filter(Boolean).join('\n').slice(0, 1000);
}
