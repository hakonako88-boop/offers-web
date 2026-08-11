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
    return new URL(value, baseUrl).toString();
  } catch {
    return '';
  }
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
    const response = await fetchImpl(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; ChollosAlDiaBot/1.0; +https://chollosaldia.com)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) throw new Error(`La tienda respondió ${response.status}.`);
    const html = (await response.text()).slice(0, 1_500_000);
    return { ...productMetadataFromHtml(html, response.url || url), finalUrl: response.url || url };
  } finally {
    clearTimeout(timeout);
  }
}
