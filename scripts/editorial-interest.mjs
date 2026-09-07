// Owner preference for automatic discovery; private/manual posts keep their review flow.
function text(value = '') {
  return String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function automaticInterest(offer = {}) {
  const title = text(offer.title);
  if (/\b(mochilas?|backpacks?|rucksacks?|llaveros?|pegatinas?|fundas? de cojin)\b/u.test(title)) return -1;
  if (/\b(calzado estilo|moda casual informal|alfombrilla.*(?:anime|naruto|pikachu|dragon ball))\b/u.test(title)) return -1;
  if (/\b(portatil|mini pc|monitor|ssd|smartphone|tablet|auriculares|cafetera|aspirador|freidora|exprimidor|taladro|destornillador|lavadora|frigorifico|televisor|consola|detergente|lavavajillas|panales)\b/u.test(title)) return 2;
  return 1;
}

export function selectInterestingOffers(offers = []) {
  return offers.filter((offer) => automaticInterest(offer) >= 0)
    .sort((a, b) => automaticInterest(b) - automaticInterest(a) || Number(b.score || 0) - Number(a.score || 0));
}
