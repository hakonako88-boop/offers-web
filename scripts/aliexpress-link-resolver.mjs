import { ALIEXPRESS_ENDPOINT, createAliExpressSignature, highResolutionAliExpressImage } from './aliexpress-offers.mjs';

function timestamp() {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function amount(value) {
  const parsed = Number.parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function aliexpressProductId(url = '') {
  const source = String(url);
  const pathMatch = source.match(/\/item\/(\d+)\.html/iu);
  if (pathMatch?.[1]) return pathMatch[1];
  try {
    const parsed = new URL(source);
    return parsed.searchParams.get('product_id')
      || parsed.searchParams.get('productId')
      || parsed.searchParams.get('itemId')
      || '';
  } catch {
    return '';
  }
}

export function metadataFromAliExpressProduct(product = {}) {
  const price = amount(product.target_sale_price);
  const previousPrice = amount(product.target_original_price);
  const affiliateUrl = String(product.promotion_link || '').trim();
  return {
    title: String(product.product_title || '').trim(),
    description: String(product.product_title || '').trim(),
    imageUrl: highResolutionAliExpressImage(product.product_main_image_url || ''),
    price,
    previousPrice: previousPrice > price ? previousPrice : 0,
    ...(affiliateUrl ? { affiliateUrl } : {}),
  };
}

/** Resolves an AliExpress short link only to learn the public product ID.
 * The eventual link comes from the affiliate API and therefore uses this
 * account's tracking id, never the tag belonging to a forwarded channel. */
async function resolvedAliExpressProductId(url, fetchImpl) {
  const directId = aliexpressProductId(url);
  if (directId) return directId;
  try {
    const response = await fetchImpl(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ChollosAlDiaBot/1.0)' },
    });
    return aliexpressProductId(response?.url || '');
  } catch {
    return '';
  }
}

/** Fetches product facts through the affiliate API, preserving the original
 * user-supplied tracking link for publication. */
export async function resolveAliExpressAffiliateProduct(url, config, { fetchImpl = fetch } = {}) {
  const productId = await resolvedAliExpressProductId(url, fetchImpl);
  if (!productId || !config.appKey || !config.appSecret || !config.trackingId) return {};
  const unsigned = {
    app_key: config.appKey,
    format: 'json',
    method: 'aliexpress.affiliate.product.query',
    product_ids: productId,
    target_currency: 'EUR',
    target_language: 'ES',
    country: 'ES',
    tracking_id: config.trackingId,
    fields: 'product_id,product_title,target_sale_price,target_original_price,product_main_image_url,promotion_link',
    sign_method: 'sha256',
    timestamp: timestamp(),
    v: '2.0',
  };
  const params = { ...unsigned, sign: createAliExpressSignature(unsigned, config.appSecret) };
  const response = await fetchImpl(`${ALIEXPRESS_ENDPOINT}?${new URLSearchParams(params)}`);
  const data = await response.json().catch(() => ({}));
  const products = data?.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product || [];
  const product = Array.isArray(products) ? products[0] : products;
  return {
    ...metadataFromAliExpressProduct(product),
    productId: String(product?.product_id || productId),
  };
}
