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

function canonicalAliExpressItemUrl(url = '') {
  const productId = aliexpressProductId(url);
  return productId ? `https://es.aliexpress.com/item/${productId}.html` : String(url || '');
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

function decodeAliExpressMarkup(value = '') {
  return String(value)
    .replace(/\\u003c/giu, '<')
    .replace(/\\u003e/giu, '>')
    .replace(/\\u0026/giu, '&')
    .replace(/\\u0022/giu, '"')
    .replace(/\\u0027/giu, "'")
    .replace(/\\\//gu, '/')
    .replace(/\\"/gu, '"');
}

function metaContent(html = '', key = '') {
  for (const tag of decodeAliExpressMarkup(html).match(/<meta\b[^>]*>/giu) || []) {
    const property = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/iu)?.[1]?.toLowerCase();
    if (property !== key.toLowerCase()) continue;
    return String(tag.match(/\bcontent\s*=\s*["']([^"']*)["']/iu)?.[1] || '')
      .replaceAll('&amp;', '&')
      .trim();
  }
  return '';
}

function cleanAliExpressTitle(value = '') {
  return String(value)
    .replace(/\s+-\s+AliExpress(?:\s+\d+)?\s*$/iu, '')
    .trim();
}

/** Reads the public text snapshot of an AliExpress page. This is used only
 * when GitHub's network is intercepted before it reaches the mobile redirect.
 * No API key, secret or tracking id is ever sent to the reader. */
export function metadataFromAliExpressReader(text = '') {
  const body = String(text || '');
  const productId = aliexpressProductId(body);
  const candidateTitle = cleanAliExpressTitle(body.match(/^Title:\s*(.+)$/imu)?.[1] || '');
  const title = /^(?:AliExpress(?:\.com)?\b|Captcha Interception\b)|\bMaintaining\b/iu.test(candidateTitle)
    ? ''
    : candidateTitle;
  const images = [...body.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/giu)]
    .map((match) => match[1])
    .filter((image) => /\/(?:kf|k)\//iu.test(image));
  const image = images.find((value) => /_9\d{2}x9\d{2}/u.test(value)) || images.at(-1) || '';
  return {
    ...(productId ? { productId } : {}),
    ...(title ? { title, description: title } : {}),
    ...(image ? { imageUrl: highResolutionAliExpressImage(image) } : {}),
  };
}

async function inspectAliExpressReader(url, fetchImpl) {
  if (!isAliExpressUrl(url)) return { finalUrl: '', metadata: {} };
  const parsed = new URL(url);
  parsed.protocol = 'https:';
  const readerUrl = `https://r.jina.ai/https://${parsed.host}${parsed.pathname}${parsed.search}`;
  let lastMetadata = {};
  for (const bypassCache of [false, true]) {
    const response = await fetchImpl(readerUrl, {
      headers: {
        accept: 'text/plain',
        'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)',
        ...(bypassCache ? { 'x-no-cache': 'true' } : {}),
      },
    });
    if (!response?.ok && response?.ok !== undefined) continue;
    const text = typeof response?.text === 'function' ? await response.text() : '';
    lastMetadata = metadataFromAliExpressReader(text);
    const productId = String(lastMetadata.productId || '');
    if (productId) {
      return {
        finalUrl: `https://es.aliexpress.com/item/${productId}.html`,
        metadata: lastMetadata,
      };
    }
  }
  return { finalUrl: '', metadata: lastMetadata };
}

/** AliExpress embeds the useful social card as escaped HTML inside its shell
 * document. Reading that card gives us the exact title and full-size image
 * even when the interactive product application is unavailable to GitHub. */
export function metadataFromAliExpressHtml(html = '') {
  const decoded = decodeAliExpressMarkup(html);
  const productId = aliexpressProductId(metaContent(decoded, 'al:android:url'))
    || aliexpressProductId(metaContent(decoded, 'al:iphone:url'));
  return {
    ...(productId ? { productId } : {}),
    title: cleanAliExpressTitle(metaContent(decoded, 'og:title')),
    description: String(metaContent(decoded, 'og:description') || '').trim(),
    imageUrl: highResolutionAliExpressImage(metaContent(decoded, 'og:image')),
  };
}

async function resolveWithCurl(url, execFileImpl) {
  const { stdout } = await execFileImpl('curl', [
    '--location', '--silent', '--show-error', '--max-time', '12',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
    '--header', 'Accept-Language: es-ES,es;q=0.9',
    '--output', process.platform === 'win32' ? 'NUL' : '/dev/null',
    '--write-out', '%{url_effective}', String(url),
  ]);
  const finalUrl = String(stdout || '').trim();
  return isAliExpressUrl(finalUrl) ? finalUrl : '';
}

async function inspectAliExpressDestination(url, fetchImpl) {
  if (!isAliExpressUrl(url)) return { finalUrl: '', metadata: {} };
  const response = await fetchImpl(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
      'accept-language': 'es-ES,es;q=0.9',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  const responseUrl = isAliExpressUrl(response?.url) ? String(response.url) : String(url);
  let metadata = {};
  if (typeof response?.text === 'function') {
    try {
      metadata = metadataFromAliExpressHtml((await response.text()).slice(0, 1_500_000));
    } catch {
      // The redirect URL alone is still useful when the body cannot be read.
    }
  }
  const embeddedProductId = String(metadata.productId || '');
  const finalUrl = embeddedProductId
    ? `https://es.aliexpress.com/item/${embeddedProductId}.html`
    : responseUrl;
  return { finalUrl, metadata };
}

async function canonicalAliExpressDestination(url, fetchImpl) {
  let current = String(url || '');
  let metadata = {};
  for (let attempt = 0; attempt < 3 && isAliExpressUrl(current); attempt += 1) {
    const inspected = await inspectAliExpressDestination(current, fetchImpl);
    metadata = { ...metadata, ...Object.fromEntries(Object.entries(inspected.metadata).filter(([, value]) => value)) };
    // Strip invitation codes and another publisher's aff_fcid/aff_fsk before
    // the URL is sent to this account's link-generation endpoint.
    const next = canonicalAliExpressItemUrl(inspected.finalUrl || current);
    if (next === current && aliexpressProductId(next)) break;
    current = next;
  }
  return { finalUrl: current, metadata };
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
      if (isAliExpressUrl(finalUrl)) {
        try {
          return (await canonicalAliExpressDestination(finalUrl, fetchImpl)).finalUrl || String(finalUrl);
        } catch {
          return String(finalUrl);
        }
      }
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
      if (aliexpressProductId(finalUrl)) {
        try {
          return (await canonicalAliExpressDestination(finalUrl, fetchImpl)).finalUrl || finalUrl;
        } catch {
          return finalUrl;
        }
      }
    } catch {
      // The fetch reader below is a useful fallback when curl is unavailable.
    }
  }
  try {
    const inspected = await canonicalAliExpressDestination(url, fetchImpl);
    if (aliexpressProductId(inspected.finalUrl)) return inspected.finalUrl;
  } catch {
    // curl below handles redirects when a shop blocks fetch.
  }
  try {
    const finalUrl = await resolveWithCurl(url, execFileImpl);
    if (finalUrl) {
      try {
        const canonical = (await canonicalAliExpressDestination(finalUrl, fetchImpl)).finalUrl || finalUrl;
        if (aliexpressProductId(canonical)) return canonical;
      } catch {
        if (aliexpressProductId(finalUrl)) return finalUrl;
      }
    }
  } catch {
    // The public snapshot below is the final bounded fallback.
  }
  try {
    const reader = await inspectAliExpressReader(url, fetchImpl);
    if (aliexpressProductId(reader.finalUrl)) return reader.finalUrl;
  } catch {
    // Keep the submitted AliExpress URL for a controlled error response.
  }
  return String(url || '');
}

function apiProducts(data = {}, responseKey = '') {
  const products = data?.[responseKey]?.resp_result?.result?.products?.product || [];
  return Array.isArray(products) ? products : (products ? [products] : []);
}

async function callAliExpressApi(method, fields, config, fetchImpl) {
  const unsigned = {
    app_key: config.appKey,
    format: 'json',
    method,
    ...fields,
    sign_method: 'sha256',
    timestamp: timestamp(),
    v: '2.0',
  };
  const params = { ...unsigned, sign: createAliExpressSignature(unsigned, config.appSecret) };
  const response = await fetchImpl(`${ALIEXPRESS_ENDPOINT}?${new URLSearchParams(params)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok && response.ok !== undefined) {
    throw new Error(`AliExpress API responded ${response.status || 'without status'}.`);
  }
  return data;
}

async function generateAliExpressAffiliateLink(sourceUrl, config, fetchImpl) {
  const data = await callAliExpressApi('aliexpress.affiliate.link.generate', {
    promotion_link_type: '0',
    source_values: sourceUrl,
    tracking_id: config.trackingId,
  }, config, fetchImpl);
  const links = data?.aliexpress_affiliate_link_generate_response?.resp_result?.result?.promotion_links?.promotion_link || [];
  const first = Array.isArray(links) ? links[0] : links;
  return String(first?.promotion_link || '').trim().replace(/^http:\/\//iu, 'https://');
}

/** Fetches product facts through the affiliate API, preserving the original
 * user-supplied tracking link for publication. */
export async function resolveAliExpressAffiliateProduct(url, config, options = {}) {
  const { fetchImpl = fetch } = options;
  const canonicalUrl = await resolveAliExpressProductUrl(url, options);
  const productId = aliexpressProductId(canonicalUrl);
  if (!productId || !config.appKey || !config.appSecret || !config.trackingId) return {};
  let pageMetadata = {};
  try {
    pageMetadata = (await inspectAliExpressDestination(canonicalUrl, fetchImpl)).metadata;
  } catch {
    // The exact affiliate detail endpoint remains authoritative.
  }
  if (!pageMetadata.title || !pageMetadata.imageUrl) {
    for (const readerUrl of [...new Set([url, canonicalUrl])]) {
      try {
        const reader = await inspectAliExpressReader(readerUrl, fetchImpl);
        pageMetadata = {
          ...reader.metadata,
          ...Object.fromEntries(Object.entries(pageMetadata).filter(([, value]) => value)),
        };
        if (pageMetadata.title && pageMetadata.imageUrl) break;
      } catch {
        // Try the other safe URL before relying on product detail alone.
      }
    }
  }
  const detailData = await callAliExpressApi('aliexpress.affiliate.productdetail.get', {
    country: 'ES',
    product_ids: productId,
    target_currency: 'EUR',
    target_language: 'ES',
    tracking_id: config.trackingId,
    fields: 'product_id,product_title,target_sale_price,target_original_price,product_main_image_url,promotion_link',
  }, config, fetchImpl);
  const product = apiProducts(detailData, 'aliexpress_affiliate_productdetail_get_response')
    .find((entry) => String(entry?.product_id || '') === productId);
  const exactMetadata = product ? metadataFromAliExpressProduct(product) : {};
  let affiliateUrl = String(product?.promotion_link || product?.promotion_link_url || '').trim().replace(/^http:\/\//iu, 'https://');
  try {
    affiliateUrl = await generateAliExpressAffiliateLink(canonicalUrl, config, fetchImpl) || affiliateUrl;
  } catch {
    // The exact product-detail promotion link is a safe fallback when the
    // dedicated link generator is temporarily unavailable.
  }
  return {
    ...pageMetadata,
    ...Object.fromEntries(Object.entries(exactMetadata).filter(([, value]) => value)),
    productId,
    canonicalUrl,
    affiliateUrl,
    identityVerified: Boolean(product),
  };
}
