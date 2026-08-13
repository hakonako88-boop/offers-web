import { ALIEXPRESS_ENDPOINT, createAliExpressSignature, highResolutionAliExpressImage } from './aliexpress-offers.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function timestamp() {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function amount(value) {
  const parsed = Number.parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function aliexpressProductId(url = '') {
  const match = String(url).match(/(?:\/item\/|productId=)(\d+)(?:\.html|\b)/iu);
  return match?.[1] || '';
}

export function metadataFromAliExpressProduct(product = {}) {
  const price = amount(product.target_sale_price);
  const previousPrice = amount(product.target_original_price);
  return {
    ...(String(product.product_id || '').trim() ? { productId: String(product.product_id).trim() } : {}),
    title: String(product.product_title || '').trim(),
    description: String(product.product_title || '').trim(),
    imageUrl: highResolutionAliExpressImage(product.product_main_image_url || ''),
    price,
    previousPrice: previousPrice > price ? previousPrice : 0,
  };
}

function isAliExpressUrl(value = '') {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return /(^|\.)aliexpress\./u.test(host);
  } catch {
    return false;
  }
}

function isShortAliExpressUrl(value = '') {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 's.click.aliexpress.com' || host === 'a.aliexpress.com';
  } catch {
    return false;
  }
}

async function resolveWithCurl(url, execFileImpl) {
  const { stdout } = await execFileImpl('curl', [
    '--location', '--silent', '--show-error', '--max-time', '12',
    '--output', process.platform === 'win32' ? 'NUL' : '/dev/null',
    '--write-out', '%{url_effective}', String(url),
  ]);
  const finalUrl = String(stdout || '').trim();
  return isAliExpressUrl(finalUrl) ? finalUrl : '';
}

/**
 * AliExpress frequently rejects GitHub's normal page reader on its shortened
 * tracking URLs. Resolve only known AliExpress links, first through fetch and
 * then through curl's redirect engine as a safe server-side fallback.
 */
export async function resolveAliExpressProductUrl(url, {
  fetchImpl = fetch,
  execFileImpl = execFileAsync,
  resolveShortUrl,
} = {}) {
  if (!isAliExpressUrl(url)) return String(url || '');
  if (typeof resolveShortUrl === 'function') {
    try {
      const finalUrl = await resolveShortUrl(url);
      if (isAliExpressUrl(finalUrl)) return String(finalUrl);
    } catch {
      // Continue with the browser-like redirect readers below.
    }
  }
  // A short link can make fetch stop on a generic storefront or an old
  // redirect. curl's redirect engine gives the actual item destination, so
  // make it the primary resolver for submitted a.aliexpress/s.click links.
  if (isShortAliExpressUrl(url)) {
    try {
      const finalUrl = await resolveWithCurl(url, execFileImpl);
      if (aliexpressProductId(finalUrl)) return finalUrl;
    } catch {
      // The fetch reader below is a useful fallback when curl is unavailable.
    }
  }
  try {
    const response = await fetchImpl(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ChollosAlDiaBot/1.0)' },
    });
    if (response?.url && isAliExpressUrl(response.url)) return response.url;
  } catch {
    // curl below handles redirects when a shop blocks fetch.
  }
  try {
    const finalUrl = await resolveWithCurl(url, execFileImpl);
    return finalUrl || String(url || '');
  } catch {
    return String(url || '');
  }
}

/** Fetches product facts through the affiliate API, preserving the original
 * user-supplied tracking link for publication. */
export async function resolveAliExpressAffiliateProduct(url, config, options = {}) {
  const { fetchImpl = fetch } = options;
  const canonicalUrl = await resolveAliExpressProductUrl(url, options);
  const productId = aliexpressProductId(canonicalUrl);
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
  const metadata = metadataFromAliExpressProduct(product);
  return {
    ...metadata,
    productId: metadata.productId || productId,
    canonicalUrl,
    affiliateUrl: String(product.promotion_link || product.promotion_link_url || '').trim(),
  };
}
