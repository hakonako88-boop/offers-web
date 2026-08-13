const DEFAULT_AWIN_PUBLISHER_ID = '2023977';
const DEFAULT_MIRAVIA_MERCHANT_ID = '37168';

export function isMiraviaAwinUrl(value = '') {
  try {
    const parsed = new URL(value);
    if (!/(^|\.)awin1?\.com$/iu.test(parsed.hostname)) return false;
    const merchant = parsed.searchParams.get('m') || parsed.searchParams.get('awinmid') || '';
    if (merchant === DEFAULT_MIRAVIA_MERCHANT_ID) return true;
    const destination = parsed.searchParams.get('ued');
    if (!destination) return false;
    const host = new URL(destination).hostname.toLowerCase();
    return host === 'miravia.es' || host.endsWith('.miravia.es');
  } catch {
    return false;
  }
}

function numericId(value = '', minimumDigits = 6) {
  const id = String(value || '').trim();
  return new RegExp(`^\\d{${minimumDigits},}$`, 'u').test(id) ? id : '';
}

/** Extracts Miravia's/Awin's product id without trusting a publisher's
 * existing click URL. The id is enough to create this publisher's own Awin
 * link. */
export function miraviaProductIdFromUrl(url = '') {
  try {
    const parsed = new URL(url);
    const fromQuery = ['p', 'product_id', 'productId', 'item_id', 'itemId']
      .map((key) => numericId(parsed.searchParams.get(key)))
      .find(Boolean);
    if (fromQuery) return fromQuery;
    const fromPath = parsed.pathname.match(/(?:product|item|p)[/-](\d{6,})(?:[/?-]|$)/iu)?.[1];
    return numericId(fromPath);
  } catch {
    return '';
  }
}

export function miraviaProductIdFromHtml(html = '') {
  const source = String(html);
  const match = source.match(/(?:"|')(?:product(?:_|)?id|item(?:_|)?id)(?:"|')\s*[:=]\s*(?:"|')?(\d{6,})/iu)
    || source.match(/(?:"|')product(?:Id|_id)(?:"|')\s*[:=]\s*(\d{6,})/iu);
  return numericId(match?.[1]);
}

/** Builds a standard Awin product click URL. Publisher and merchant IDs are
 * public account identifiers; a password or API key is never embedded. */
export function miraviaAwinAffiliateUrl(productId, {
  publisherId = DEFAULT_AWIN_PUBLISHER_ID,
  merchantId = DEFAULT_MIRAVIA_MERCHANT_ID,
} = {}) {
  const id = numericId(productId);
  const publisher = numericId(publisherId, 3);
  const merchant = numericId(merchantId, 3);
  if (!id || !publisher || !merchant) return '';
  const query = new URLSearchParams({ p: id, a: publisher, m: merchant });
  return `https://www.awin1.com/pclick.php?${query}`;
}

/** Creates this publisher's Awin deep link for an official Miravia product
 * page. Unlike a feed product click, this also works when the owner sends a
 * normal miravia.es URL and no Awin product id is visible. */
export function miraviaAwinDeepLink(destinationUrl, {
  publisherId = DEFAULT_AWIN_PUBLISHER_ID,
  merchantId = DEFAULT_MIRAVIA_MERCHANT_ID,
} = {}) {
  const publisher = numericId(publisherId, 3);
  const merchant = numericId(merchantId, 3);
  let destination = '';
  try {
    const parsed = new URL(destinationUrl);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:' || !(host === 'miravia.es' || host.endsWith('.miravia.es'))) return '';
    parsed.hash = '';
    destination = parsed.toString();
  } catch {
    return '';
  }
  if (!publisher || !merchant) return '';
  const query = new URLSearchParams({ awinmid: merchant, awinaffid: publisher, ued: destination });
  return `https://www.awin1.com/cread.php?${query}`;
}

/** Chooses the safest available Miravia affiliate link. A resolved official
 * destination identifies the exact product, while an Awin feed id remains a
 * fallback for redirects that cannot be opened. */
export function miraviaAffiliateUrl({ productId = '', destinationUrl = '' } = {}, options = {}) {
  return miraviaAwinDeepLink(destinationUrl, options)
    || miraviaAwinAffiliateUrl(productId, options);
}
