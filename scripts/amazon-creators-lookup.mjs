import { AMAZON_MARKETPLACE } from './amazon-offers.mjs';
import { amazonAsinFromUrl, canonicalAmazonAffiliateUrl } from './amazon-review-drafts.mjs';

function tokenEndpoints(version = '') {
  const endpoints = {
    '3.1': 'https://api.amazon.com/auth/o2/token',
    '3.2': 'https://api.amazon.co.uk/auth/o2/token',
    '3.3': 'https://api.amazon.co.jp/auth/o2/token',
  };
  return [...new Set([endpoints[String(version).trim()], endpoints['3.2']].filter(Boolean))];
}

async function accessToken(config, fetchImpl) {
  let detail = 'credenciales rechazadas';
  for (const endpoint of tokenEndpoints(config.version)) {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: config.credentialId,
        client_secret: config.credentialSecret,
        scope: 'creatorsapi::default',
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.access_token) return data.access_token;
    detail = data.error_description || data.error || String(response.status);
  }
  throw new Error(`Amazon authentication failed: ${detail}`);
}

function bestListing(listings = []) {
  return [...listings]
    .filter((listing) => listing?.price?.money?.amount)
    .sort((left, right) => Number(Boolean(right.isBuyBoxWinner)) - Number(Boolean(left.isBuyBoxWinner)))[0];
}

export async function lookupAmazonProduct(url, config = {}, fetchImpl = fetch) {
  const asin = amazonAsinFromUrl(url);
  if (!asin || !config.credentialId || !config.credentialSecret || !config.partnerTag) return {};
  const token = await accessToken(config, fetchImpl);
  const response = await fetchImpl('https://creatorsapi.amazon/catalog/v1/getItems', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-marketplace': AMAZON_MARKETPLACE,
    },
    body: JSON.stringify({
      marketplace: AMAZON_MARKETPLACE,
      partnerTag: config.partnerTag,
      itemIds: [asin],
      resources: [
        'images.primary.large',
        'images.primary.medium',
        'itemInfo.title',
        'offersV2.listings.availability',
        'offersV2.listings.condition',
        'offersV2.listings.dealDetails',
        'offersV2.listings.isBuyBoxWinner',
        'offersV2.listings.price',
        'offersV2.listings.type',
      ],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Amazon getItems failed: ${data?.errors?.[0]?.message || data?.message || response.status}`);
  const item = data.itemsResult?.items?.[0] || data.itemResult?.items?.[0] || data.items?.[0];
  const listing = bestListing(item?.offersV2?.listings || []);
  const price = Number(listing?.price?.money?.amount || 0);
  const previousPrice = Number(listing?.price?.savingBasis?.money?.amount || 0);
  const canonical = canonicalAmazonAffiliateUrl(asin, config.partnerTag);
  return {
    title: String(item?.itemInfo?.title?.displayValue || '').trim(),
    description: String(item?.itemInfo?.title?.displayValue || '').trim(),
    imageUrl: item?.images?.primary?.large?.url || item?.images?.primary?.medium?.url || '',
    price,
    previousPrice: previousPrice > price ? previousPrice : 0,
    productId: asin,
    finalUrl: canonical,
    sourceUrl: url,
    affiliateUrl: canonical,
  };
}
