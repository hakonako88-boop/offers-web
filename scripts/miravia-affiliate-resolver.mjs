const DEFAULT_AWIN_PUBLISHER_ID = '2023977';
const DEFAULT_MIRAVIA_MERCHANT_ID = '37168';

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
