function compact(value = '') {
  return String(value).replace(/\s+/gu, ' ').trim();
}

function decode(value = '') {
  return compact(String(value)
    .replace(/&amp;/giu, '&')
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/giu, "'"));
}

function htmlMeta(html = '', keys = []) {
  for (const tag of String(html).match(/<meta\b[^>]*>/giu) || []) {
    const name = tag.match(/\b(?:property|name|itemprop)\s*=\s*["']?([^\s"'>]+)/iu)?.[1]?.toLowerCase();
    if (!name || !keys.includes(name)) continue;
    const value = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/iu)?.[1]
      || tag.match(/\bcontent\s*=\s*([^\s>]+)/iu)?.[1]
      || '';
    if (value) return decode(value);
  }
  return '';
}

function jsonLdProducts(html = '') {
  const products = [];
  for (const block of String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu)) {
    try {
      const root = JSON.parse(block[1].trim());
      const queue = Array.isArray(root) ? [...root] : [root];
      while (queue.length) {
        const value = queue.shift();
        if (!value || typeof value !== 'object') continue;
        const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
        if (types.some((type) => String(type).toLowerCase() === 'product')) products.push(value);
        if (Array.isArray(value['@graph'])) queue.push(...value['@graph']);
      }
    } catch {
      // Some storefronts inject incomplete JSON-LD. Open Graph is the fallback.
    }
  }
  return products;
}

export function parsePrice(value = '') {
  const clean = String(value).replace(/\u00a0/g, '').replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
  if (!clean) return 0;
  const comma = clean.lastIndexOf(',');
  const dot = clean.lastIndexOf('.');
  const normalized = comma >= 0 && dot >= 0
    ? (comma > dot ? clean.replaceAll('.', '').replace(',', '.') : clean.replaceAll(',', ''))
    : clean.replace(',', '.');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function absoluteUrl(value, baseUrl) {
  try {
    return baseUrl ? new URL(value, baseUrl).toString() : new URL(value).toString();
  } catch {
    return '';
  }
}

function merchantUrl(value = '', baseUrl = '') {
  const url = absoluteUrl(decode(value), baseUrl);
  if (!url) return '';
  try {
    const host = new URL(url).hostname.toLowerCase();
    return /(^|\.)(?:amazon\.[a-z.]+|amzn\.to|aliexpress\.com|miravia\.es|awin1\.com|awin\.com)$/iu.test(host) ? url : '';
  } catch {
    return '';
  }
}

/** Finds the actual shop button in a blog/deals-page. This lets forwarded
 * cards use the merchant page rather than publishing a link back to the
 * original deals site. */
export function merchantLinkFromHtml(html = '', pageUrl = '') {
  const links = String(html).matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/giu);
  for (const link of links) {
    const target = merchantUrl(link[1] || link[2] || link[3] || '', pageUrl);
    if (target) return target;
  }
  return '';
}

function hrefFromAnchor(anchor = '') {
  const match = String(anchor).match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/iu);
  return match?.[1] || match?.[2] || match?.[3] || '';
}

/** Some deal sites hide the merchant behind an internal “Ver oferta” link.
 * We follow one clearly-labelled button, then accept it only if it reaches a
 * supported merchant. Navigation links are intentionally ignored. */
export function outboundOfferLinkFromHtml(html = '', pageUrl = '') {
  const direct = merchantLinkFromHtml(html, pageUrl);
  if (direct) return direct;
  for (const match of String(html).matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/giu)) {
    const anchor = match[0];
    const target = absoluteUrl(hrefFromAnchor(anchor), pageUrl);
    const label = decode(anchor).toLocaleLowerCase('es');
    if (target && /(?:ver|ir|comprar|conseguir).{0,24}(?:oferta|producto|tienda)|amazon|aliexpress|miravia/iu.test(label)) {
      return target;
    }
  }
  return '';
}

async function fetchPage(url, fetchImpl) {
  const response = await fetchImpl(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; ChollosAlDiaBot/1.0; +https://chollosaldia.com)',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) throw new Error(`La tienda respondió ${response.status}.`);
  return {
    html: (await response.text()).slice(0, 1_500_000),
    finalUrl: response.url || url,
  };
}

/**
 * Extracts only public product metadata. It deliberately does not guess a
 * price from surrounding marketing text: a deal must have a real value before
 * it can be published to the channel.
 */
export function productMetadataFromHtml(html, pageUrl) {
  const product = jsonLdProducts(html)[0] || {};
  const offers = Array.isArray(product.offers) ? product.offers[0] : (product.offers || {});
  const image = Array.isArray(product.image) ? product.image[0] : product.image;
  const title = decode(product.name || htmlMeta(html, ['og:title', 'twitter:title']) || '');
  const description = decode(product.description || htmlMeta(html, ['og:description', 'twitter:description', 'description']) || '');
  const imageUrl = absoluteUrl(image || htmlMeta(html, ['og:image', 'twitter:image']), pageUrl);
  const price = parsePrice(offers.price || offers.lowPrice || htmlMeta(html, ['product:price:amount', 'og:price:amount']));
  const previousPrice = parsePrice(offers.highPrice || '');
  return { title, description, imageUrl, price, previousPrice };
}

export async function extractProductMetadata(url, { fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const firstPage = await fetchPage(url, (requestUrl, options) => fetchImpl(requestUrl, { ...options, signal: controller.signal }));
    const outboundOfferUrl = outboundOfferLinkFromHtml(firstPage.html, firstPage.finalUrl);
    const directMerchantUrl = merchantLinkFromHtml(firstPage.html, firstPage.finalUrl);
    const resolvedPage = outboundOfferUrl && outboundOfferUrl !== firstPage.finalUrl
      ? await fetchPage(outboundOfferUrl, (requestUrl, options) => fetchImpl(requestUrl, { ...options, signal: controller.signal }))
      : firstPage;
    const finalPage = merchantUrl(resolvedPage.finalUrl) ? resolvedPage : firstPage;
    return {
      ...productMetadataFromHtml(finalPage.html, finalPage.finalUrl),
      finalUrl: finalPage.finalUrl,
      sourceUrl: firstPage.finalUrl,
      affiliateUrl: directMerchantUrl || merchantUrl(url) || merchantUrl(resolvedPage.finalUrl) || '',
    };
  } finally {
    clearTimeout(timeout);
  }
}
