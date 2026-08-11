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

export function isEquivalentDeal(candidate = {}, published = {}) {
  const candidateTitle = normalise(candidate.title);
  const publishedTitle = normalise(published.title);
  if (!candidateTitle || !publishedTitle) return false;
  if (candidateTitle === publishedTitle) return true;
  // Variants often add a size or a colour to an otherwise identical catalogue
  // title ("Alfombrilla gaming Charizard" vs "... XXL Charizard").
  return similarity(candidate.title, published.title) >= 0.72;
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
