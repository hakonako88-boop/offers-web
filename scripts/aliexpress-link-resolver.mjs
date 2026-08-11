import { ALIEXPRESS_ENDPOINT, createAliExpressSignature, highResolutionAliExpressImage } from './aliexpress-offers.mjs';

function timestamp() {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function amount(value) {
  const parsed = Number.parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function aliexpressProductId(url = '') {
  const match = String(url).match(/\/item\/(\d+)\.html/iu);
  return match?.[1] || '';
}

export function metadataFromAliExpressProduct(product = {}) {
  const price = amount(product.target_sale_price);
  const previousPrice = amount(product.target_original_price);
  return {
    title: String(product.product_title || '').trim(),
    description: String(product.product_title || '').trim(),
    imageUrl: highResolutionAliExpressImage(product.product_main_image_url || ''),
    price,
    previousPrice: previousPrice > price ? previousPrice : 0,
  };
}

/** Fetches product facts through the affiliate API, preserving the original
 * user-supplied tracking link for publication. */
export async function resolveAliExpressAffiliateProduct(url, config, { fetchImpl = fetch } = {}) {
  const productId = aliexpressProductId(url);
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
    fields: 'product_id,product_title,target_sale_price,target_original_price,product_main_image_url',
    sign_method: 'sha256',
    timestamp: timestamp(),
    v: '2.0',
  };
  const params = { ...unsigned, sign: createAliExpressSignature(unsigned, config.appSecret) };
  const response = await fetchImpl(`${ALIEXPRESS_ENDPOINT}?${new URLSearchParams(params)}`);
  const data = await response.json().catch(() => ({}));
  const products = data?.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product || [];
  const product = Array.isArray(products) ? products[0] : products;
  return metadataFromAliExpressProduct(product);
}
