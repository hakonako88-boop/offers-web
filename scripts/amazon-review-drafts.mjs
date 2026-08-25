import { amazonProductImageFromUrl, offerFromProductMetadata } from './telegram-inbox-commands.mjs';

const AMAZON_ASIN = /^[A-Z0-9]{10}$/iu;

export function amazonAsinFromUrl(value = '') {
  try {
    const url = new URL(String(value).replaceAll('&amp;', '&'));
    const direct = url.pathname.match(/\/(?:dp|gp\/product)\/([a-z0-9]{10})(?:[/?]|$)/iu)?.[1];
    if (direct) return direct.toUpperCase();
    if (url.hostname.toLowerCase() === 'link.amazon') {
      const shared = url.pathname.split('/').filter(Boolean)[0] || '';
      return AMAZON_ASIN.test(shared) ? shared.toUpperCase() : '';
    }
    return '';
  } catch {
    return '';
  }
}

export function canonicalAmazonAffiliateUrl(asin = '', partnerTag = '') {
  if (!AMAZON_ASIN.test(String(asin)) || !String(partnerTag).trim()) return '';
  return `https://www.amazon.es/dp/${String(asin).toUpperCase()}?tag=${encodeURIComponent(String(partnerTag).trim())}`;
}

export async function resolveAmazonAsin(value = '', fetchImpl = fetch) {
  const direct = amazonAsinFromUrl(value);
  if (direct) return direct;
  let parsed;
  try { parsed = new URL(String(value).replaceAll('&amp;', '&')); } catch { return ''; }
  if (!['link.amazon', 'amzn.to'].includes(parsed.hostname.toLowerCase())) return '';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetchImpl(parsed.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ChollosAlDiaBot/1.0; +https://chollosaldia.com)' },
    });
    return amazonAsinFromUrl(response.url || '');
  } catch {
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

function amount(value = '') {
  const parsed = Number(String(value).replace(/\s/gu, '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function amazonSourceMetadata(text = '') {
  const source = String(text).replace(/\r\n/gu, '\n').trim();
  const titleBoundary = /(?:\s+[|·]\s*#Amazon|\s+#Amazon|\s+(?:📉\s*)?DESCUENTO\s*:|\s+(?:🔥\s*)?Precio\s*:|\s+Precio\s*:|\s+💰\s*\d)/iu;
  const rawTitle = source.split(titleBoundary)[0]
    .replace(/^(?:(?:🔥|⚡️|✨|💥|⭐️)|\s)+/gu, '')
    .replace(/^(?:CHOLLO|TOP CHOLLO|OFERTA)\s*/iu, '')
    .replace(/(?:(?:🔥|⚡️|✨|💥|⭐️)|\s)+$/gu, '')
    .trim();

  const labelledPrice = source.match(/(?:🔥\s*)?Precio(?:\s+(?:oferta|actual|final))?\s*:\s*(\d+(?:[.,]\d{1,2})?)\s*€/iu)?.[1]
    || source.match(/\bPrecio\s*:\s*(\d+(?:[.,]\d{1,2})?)\s*€/iu)?.[1];
  const moneyPair = source.match(/💰\s*(\d+(?:[.,]\d{1,2})?)\s*€(?:\s+(\d+(?:[.,]\d{1,2})?)\s*€)?/u);
  const price = amount(labelledPrice || moneyPair?.[1]);
  const labelledPrevious = source.match(/(?:Precio\s+(?:recomendado|mediano|anterior|más\s+bajo)|Antes|PVP)\s*:\s*(\d+(?:[.,]\d{1,2})?)\s*€/iu)?.[1];
  const previousCandidate = amount(labelledPrevious || moneyPair?.[2]);
  const previousPrice = previousCandidate > price ? previousCandidate : 0;
  const coupon = source.match(/(?:cup[oó]n|c[oó]digo)\s*[:：]\s*([a-z0-9][a-z0-9_-]{2,39})\b/iu)?.[1] || '';

  return {
    title: rawTitle,
    price,
    previousPrice,
    coupon,
    description: rawTitle,
  };
}

export async function buildAmazonReviewDraft({ item = {}, partnerTag = '', fetchImpl = fetch } = {}) {
  if (item.store !== 'Amazon') return { status: 'ignore' };
  const asin = await resolveAmazonAsin(item.merchantUrl, fetchImpl);
  const affiliateUrl = canonicalAmazonAffiliateUrl(asin, partnerTag);
  if (!asin || !affiliateUrl) {
    return { status: 'needs_details', missing: [!asin && 'ASIN', !partnerTag && 'tag de afiliado'].filter(Boolean) };
  }

  const metadata = {
    ...amazonSourceMetadata(item.text),
    productId: asin,
    imageUrl: amazonProductImageFromUrl(affiliateUrl),
  };
  const result = offerFromProductMetadata({ url: affiliateUrl, metadata, partnerTag });
  if (result.status !== 'ready') return result;
  return {
    status: 'ready',
    offer: {
      ...result.offer,
      sourceProductId: `amazon:${asin}`,
      reviewQueueItemId: item.id,
      sourceUrl: item.sourceUrl || '',
    },
  };
}
