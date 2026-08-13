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

function productIdentity(deal = {}) {
  const explicit = deal.sourceProductId || deal.source_product_id || deal.productId;
  if (explicit) {
    const value = String(explicit).toLowerCase().replace(/^miravia-/, '');
    // Older offers stored only the AliExpress catalogue number. Give it the
    // same stable namespace as new inbox offers before comparing it.
    if (/^\d{8,}$/u.test(value) && String(deal.store || '').toLowerCase() === 'aliexpress') {
      return `aliexpress:${value}`;
    }
    return value;
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

function canonicalShopUrl(deal = {}) {
  try {
    const parsed = new URL(deal.url || '');
    const asin = parsed.pathname.match(/\/(?:dp|gp\/product)\/([a-z0-9]{10})(?:[/?]|$)/iu)?.[1];
    if (asin) return `amazon:${asin.toLowerCase()}`;
    const product = parsed.pathname.match(/\/item\/(\d+)\.html/iu)?.[1];
    if (product) return `aliexpress:${product}`;
    return `${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/$/u, '')}`;
  } catch {
    return '';
  }
}

/** A privately submitted offer must never be rejected because another title
 * merely looks similar. It is a duplicate only when we can prove it is the
 * same product ID, or the exact same canonical link. */
export function isInboxDuplicate(candidate = {}, published = {}) {
  const candidateIdentity = productIdentity(candidate);
  const publishedIdentity = productIdentity(published);
  // Private Telegram submissions are frequently short affiliate links. A
  // short-link path is not a product identity: AliExpress can reuse or alter
  // it while resolving tracking, and comparing it caused distinct products to
  // be rejected as duplicates. Only a proven catalogue identifier can stop a
  // manual publication. The normal feed still uses isEquivalentDeal below.
  return isVerifiedCatalogueIdentity(candidateIdentity)
    && isVerifiedCatalogueIdentity(publishedIdentity)
    && candidateIdentity === publishedIdentity;
}

function isVerifiedCatalogueIdentity(value = '') {
  return /^(?:amazon:[a-z0-9]{10}|aliexpress:\d{8,}|awin:\d{6,})$/iu.test(value);
}

export function isEquivalentDeal(candidate = {}, published = {}) {
  const candidateIdentity = productIdentity(candidate);
  const publishedIdentity = productIdentity(published);
  if (candidateIdentity && publishedIdentity && candidateIdentity === publishedIdentity) return true;
  if (candidateIdentity && publishedIdentity
    && candidateIdentity !== publishedIdentity
    && (isVerifiedCatalogueIdentity(candidateIdentity) || isVerifiedCatalogueIdentity(publishedIdentity))) return false;
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
