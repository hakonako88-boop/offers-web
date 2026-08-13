function compact(value = '') {
  return String(value).replace(/\s+/gu, ' ').trim();
}

function normalise(value = '') {
  return compact(value)
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/gu, ' ')
    .replace(/\b(?:pack|modelo|version|color|nuevo|nueva|oferta|chollo|precio)\b/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function dealTitleTokens(value = '') {
  return [...new Set(normalise(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !/^\d+$/u.test(token)))];
}

function similarity(left = '', right = '') {
  const a = dealTitleTokens(left);
  const b = dealTitleTokens(right);
  if (!a.length || !b.length) return 0;
  const shared = a.filter((token) => b.includes(token)).length;
  return shared / Math.min(a.length, b.length);
}

export function productIdentity(deal = {}) {
  const explicit = deal.sourceProductId || deal.source_product_id || deal.productId;
  if (explicit) {
    const raw = String(explicit).toLowerCase();
    if (/^aliexpress:\d+$/u.test(raw) || /^amazon:[a-z0-9]{10}$/u.test(raw) || /^awin:\d+$/u.test(raw)) return raw;
    const miraviaId = raw.match(/^miravia-(\d+)$/u)?.[1];
    if (miraviaId) return `awin:${miraviaId}`;
    // Older automatic AliExpress records saved the product id without a
    // prefix. Make them comparable with the new inbox records.
    if (deal.store === 'AliExpress' && /^\d{8,}$/u.test(raw)) return `aliexpress:${raw}`;
    if (deal.store === 'Miravia' && /^\d+$/u.test(raw)) return `awin:${raw}`;
    return raw.replace(/^miravia-/, '');
  }
  try {
    const url = new URL(deal.url || '');
    const pclickProduct = url.searchParams.get('p');
    if (pclickProduct && /(^|\.)awin1?\.com$/iu.test(url.hostname)) return `awin:${pclickProduct}`;
    const asin = url.pathname.match(/\/(?:dp|gp\/product)\/([a-z0-9]{10})(?:[/?]|$)/iu)?.[1];
    if (asin) return `amazon:${asin.toLowerCase()}`;
    const aliProduct = url.pathname.match(/\/item\/(\d+)\.html/iu)?.[1];
    if (aliProduct) return `aliexpress:${aliProduct}`;
  } catch {
    // A title comparison below remains a safe fallback for malformed links.
  }
  return '';
}

function isVerifiedProductIdentity(identity = '') {
  return /^(?:aliexpress:\d+|amazon:[a-z0-9]{10}|awin:\d+)$/iu.test(identity);
}

function canonicalShopUrl(value = '') {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const asin = url.pathname.match(/\/(?:dp|gp\/product)\/([a-z0-9]{10})(?:[/?]|$)/iu)?.[1];
    if (/(^|\.)amazon\./iu.test(host) && asin) return `amazon:${asin.toLowerCase()}`;
    return `${host}${url.pathname.replace(/\/+$/u, '')}`.toLowerCase();
  } catch {
    return '';
  }
}

/** The private bot must be more conservative than automated-feed curation:
 * a human-submitted deal is only a duplicate when we can prove it is the same
 * product. Similar catalogue wording must never discard a new submission. */
export function isInboxDuplicate(candidate = {}, published = {}) {
  const candidateIdentity = productIdentity(candidate);
  const publishedIdentity = productIdentity(published);
  if (isVerifiedProductIdentity(candidateIdentity)) {
    return isVerifiedProductIdentity(publishedIdentity) && candidateIdentity === publishedIdentity;
  }
  const candidateUrl = canonicalShopUrl(candidate.url);
  const publishedUrl = canonicalShopUrl(published.url);
  return Boolean(candidateUrl && publishedUrl && candidateUrl === publishedUrl);
}

export function isEquivalentDeal(candidate = {}, published = {}) {
  const candidateIdentity = productIdentity(candidate);
  const publishedIdentity = productIdentity(published);
  if (candidateIdentity && publishedIdentity) return candidateIdentity === publishedIdentity;
  const candidateTitle = normalise(candidate.title);
  const publishedTitle = normalise(published.title);
  if (!candidateTitle || !publishedTitle) return false;
  if (candidateTitle === publishedTitle) return true;
  // Variants often add a size or a colour to an otherwise identical catalogue
  // title ("Alfombrilla gaming Charizard" vs "... XXL Charizard").
  const overlap = similarity(candidate.title, published.title);
  if (overlap >= 0.72) return true;
  // For the same merchant a model/name with a small wording change is still
  // the same deal. This catches feed variants without merging unrelated shops.
  return candidate.store && published.store
    && candidate.store === published.store
    && overlap >= 0.64;
}

export function filterDuplicateDeals(candidates = [], existing = []) {
  const accepted = [];
  for (const candidate of candidates) {
    if (existing.some((published) => isEquivalentDeal(candidate, published))) continue;
    if (accepted.some((published) => isEquivalentDeal(candidate, published))) continue;
    accepted.push(candidate);
  }
  return accepted;
}
