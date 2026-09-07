// Owner preference for automatic discovery; private/manual posts keep their review flow.
function text(value = '') {
  return String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function interestFamily(offer = {}) {
  const title = text(offer.title);
  const families = [
    ['limpieza', /\b(aspirador(?:a|es|as)?|vacuum|limpiatapicerias|fregasuelos)\b/u],
    ['climatizacion', /\b(ventilador(?:es)?|aire acondicionado|climatizador(?:es)?|deshumidificador(?:es)?)\b/u],
    ['informatica', /\b(portatil(?:es)?|mini pc|monitor(?:es)?|ssd|ordenador(?:es)?)\b/u],
    ['moviles-audio', /\b(smartphones?|moviles?|tablets?|auriculares|altavoz|altavoces)\b/u],
    ['cocina', /\b(cafeteras?|freidoras?|exprimidor(?:es)?|batidoras?)\b/u],
    ['electrodomesticos', /\b(lavadoras?|frigorificos?|televisor(?:es)?|lavavajillas)\b/u],
    ['bricolaje', /\b(taladros?|destornillador(?:es)?|herramientas?)\b/u],
    ['gaming', /\b(consolas?|videojuegos?)\b/u],
    ['consumo', /\b(detergentes?|panales|papel higienico|lavavajillas)\b/u],
  ];
  return families.find(([, pattern]) => pattern.test(title))?.[0] || 'otros';
}

export function automaticInterest(offer = {}) {
  const title = text(offer.title);
  if (/\b(mochilas?|backpacks?|rucksacks?|llaveros?|pegatinas?|fundas? de cojin)\b/u.test(title)) return -1;
  if (/\b(calzado estilo|moda casual informal|alfombrilla.*(?:anime|naruto|pikachu|dragon ball))\b/u.test(title)) return -1;
  if (interestFamily(offer) !== 'otros') return 2;
  return 1;
}

export function selectInterestingOffers(offers = []) {
  const sorted = offers.filter((offer) => automaticInterest(offer) >= 0)
    .sort((a, b) => automaticInterest(b) - automaticInterest(a) || Number(b.score || 0) - Number(a.score || 0));
  // Within each priority tier, give every product family a first slot before
  // choosing its second candidate. Preserve all eligible offers for fallback.
  const seen = new Map();
  return sorted.map((offer, index) => {
    const key = interestFamily(offer);
    const occurrence = seen.get(key) || 0;
    seen.set(key, occurrence + 1);
    return { offer, index, occurrence };
  }).sort((a, b) => automaticInterest(b.offer) - automaticInterest(a.offer)
    || a.occurrence - b.occurrence || a.index - b.index).map(({ offer }) => offer);
}
