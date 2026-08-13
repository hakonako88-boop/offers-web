import { isMiraviaAwinUrl, miraviaProductIdFromHtml, miraviaProductIdFromUrl } from './miravia-affiliate-resolver.mjs';

function compact(value = '') {
  return String(value).replace(/\s+/gu, ' ').trim();
}

function sourceTitle(value = '') {
  return compact(value).replace(/^(?:chollo|chollazo|descuento|rebaja|preciazo|ofert[oó]n)\s*!?\s*/iu, '');
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
    if (/(^|\.)awin1?\.com$/iu.test(host)) return isMiraviaAwinUrl(url) ? url : '';
    return /(^|\.)(?:amazon\.[a-z.]+|amzn\.to|aliexpress\.com|miravia\.es)$/iu.test(host) ? url : '';
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

async function fetchResolvedDestination(url, fetchImpl) {
  const response = await fetchImpl(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; ChollosAlDiaBot/1.0; +https://chollosaldia.com)',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  const finalUrl = merchantUrl(response.url || '') || merchantUrl(url);
  return {
    finalUrl,
    html: response.ok ? (await response.text()).slice(0, 1_500_000) : '',
  };
}

function sourceType(url = '') {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === 'michollo.com' || host.endsWith('.michollo.com')) return 'michollo';
    if (host === 'nolodejesescapar.com' || host.endsWith('.nolodejesescapar.com')) return 'nolodejesescapar';
  } catch {
    return '';
  }
  return '';
}

async function publicSourceOffer(url, fetchImpl) {
  const type = sourceType(url);
  if (type === 'michollo') {
    const dealId = new URL(url).pathname.match(/-(\d+)\/?$/u)?.[1];
    if (!dealId) return null;
    const response = await fetchImpl(`https://app.michollo.com/api/deals/${dealId}`, {
      headers: { 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' },
    });
    if (!response.ok) throw new Error(`MiChollo respondió ${response.status}.`);
    const deal = (await response.json().catch(() => ({})))?.deal;
    if (!deal?.offer_url) return null;
    return {
      source: 'michollo',
      title: sourceTitle(deal.name),
      description: decode(deal.description),
      imageUrl: absoluteUrl(deal.image_url),
      outboundUrl: absoluteUrl(deal.offer_url),
    };
  }
  if (type === 'nolodejesescapar') {
    const slug = new URL(url).pathname.split('/').filter(Boolean).at(-1) || '';
    if (!slug) return null;
    const endpoint = `https://nolodejesescapar.com/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=1`;
    const response = await fetchImpl(endpoint, {
      headers: { 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' },
    });
    if (!response.ok) throw new Error(`NoLoDejesEscapar respondió ${response.status}.`);
    const post = (await response.json().catch(() => []))?.[0];
    if (!post) return null;
    const html = String(post.content?.rendered || '');
    const imageUrl = absoluteUrl(
      post.yoast_head_json?.og_image?.[0]?.url
      || post._embedded?.['wp:featuredmedia']?.[0]?.source_url
      || '',
    );
    return {
      source: 'nolodejesescapar',
      title: sourceTitle(post.title?.rendered),
      description: decode(post.excerpt?.rendered || ''),
      imageUrl,
      outboundUrl: outboundOfferLinkFromHtml(html, url),
    };
  }
  return null;
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
    const sourceOffer = await publicSourceOffer(
      url,
      (requestUrl, options = {}) => fetchImpl(requestUrl, { ...options, signal: controller.signal }),
    );
    if (sourceOffer?.outboundUrl) {
      const resolved = await fetchResolvedDestination(
        sourceOffer.outboundUrl,
        (requestUrl, options) => fetchImpl(requestUrl, { ...options, signal: controller.signal }),
      );
      if (resolved.finalUrl) {
        const official = productMetadataFromHtml(resolved.html, resolved.finalUrl);
        return {
          ...official,
          title: official.title || sourceOffer.title,
          description: official.description || sourceOffer.description,
          imageUrl: official.imageUrl || sourceOffer.imageUrl,
          productId: miraviaProductIdFromUrl(resolved.finalUrl) || miraviaProductIdFromHtml(resolved.html),
          finalUrl: resolved.finalUrl,
          sourceUrl: url,
          source: sourceOffer.source,
          affiliateUrl: resolved.finalUrl,
        };
      }
    }
    const firstPage = await fetchPage(url, (requestUrl, options) => fetchImpl(requestUrl, { ...options, signal: controller.signal }));
    const outboundOfferUrl = outboundOfferLinkFromHtml(firstPage.html, firstPage.finalUrl);
    const directMerchantUrl = merchantLinkFromHtml(firstPage.html, firstPage.finalUrl);
    const resolvedPage = outboundOfferUrl && outboundOfferUrl !== firstPage.finalUrl
      ? await fetchPage(outboundOfferUrl, (requestUrl, options) => fetchImpl(requestUrl, { ...options, signal: controller.signal }))
      : firstPage;
    const finalPage = merchantUrl(resolvedPage.finalUrl) ? resolvedPage : firstPage;
    return {
      ...productMetadataFromHtml(finalPage.html, finalPage.finalUrl),
      productId: miraviaProductIdFromUrl(finalPage.finalUrl) || miraviaProductIdFromHtml(finalPage.html),
      finalUrl: finalPage.finalUrl,
      sourceUrl: firstPage.finalUrl,
      affiliateUrl: directMerchantUrl || merchantUrl(url) || merchantUrl(resolvedPage.finalUrl) || '',
    };
  } finally {
    clearTimeout(timeout);
  }
}
