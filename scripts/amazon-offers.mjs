import { formatTelegramDealCard, formatWebsiteDealText, improveOfferTitle } from './offer-presentation.mjs';

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
    title: improveOfferTitle(title),
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
  return formatWebsiteDealText({
    title: offer.title,
    store: 'Amazon',
    price: offer.price,
    previousPrice: offer.previousPrice,
    savings: offer.savings,
    discount: offer.discount,
  });
}

export function formatAmazonTelegramCaption(offer) {
  const highlights = [
    offer.dealType ? 'Oferta temporal' : '',
    offer.isPrime ? 'Envío Prime' : '',
  ].filter(Boolean).join(' · ');
  return formatTelegramDealCard({
    title: offer.title,
    store: 'Amazon',
    category: offer.category,
    price: offer.price,
    previousPrice: offer.previousPrice,
    savings: offer.savings,
    discount: offer.discount,
    highlight: highlights,
    url: offer.url,
  });
}
