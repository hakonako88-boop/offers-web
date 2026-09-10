// Editorial gate for automatic discovery. Owner-created/manual publications do
// not call this module, so the owner can still publish any complete post.
function text(value = '') {
  return String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function money(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const match = String(value || '').replace(/\s/g, '').match(/\d[\d.,]*/u)?.[0];
  if (!match) return 0;
  const decimal = match.includes(',') ? match.replace(/\./g, '').replace(',', '.') : match.replace(/,(?=\d{3}(?:\D|$))/g, '');
  return Number(decimal) || 0;
}

function dealFacts(offer = {}) {
  const price = money(offer.price ?? offer.priceLabel ?? offer.currentPrice);
  const previousPrice = money(offer.previousPrice ?? offer.previousPriceLabel ?? offer.oldPrice);
  const calculatedDiscount = previousPrice > price && price > 0 ? Math.round(((previousPrice - price) / previousPrice) * 100) : 0;
  const discount = Math.max(Number(offer.discount || 0), calculatedDiscount);
  return {
    price,
    previousPrice,
    discount,
    saving: previousPrice > price ? previousPrice - price : 0,
    coupon: Boolean(String(offer.coupon || '').trim()),
  };
}

const LOW_INTEREST = /\b(mochilas?|backpacks?|rucksacks?|llaveros?|pegatinas?|stickers?|fundas? (?:decorativas? )?(?:de )?(?:cojin|almohada)|album(?:es)? de fotos?|huchas?|conos? de (?:trafico|seguridad)|reloj(?:es)? (?:digital(?:es)? )?(?:unisex|militar(?:es)?)|zapatillas?|zapatos?|shoes?|boots?|sneakers?|trainers?|sandalias?|tenis|camisetas?|vaqueros?|jeans|chaquetas?|tarjeteros?|bolsos?|vestidos?|sudaderas?|bisuteria|figuras? decorativas?|adornos?|peluches?)\b/u;
const LOW_QUALITY_PHRASES = /\b(calzado estilo|moda casual informal|alfombrilla.*(?:anime|naruto|pikachu|dragon ball)|producto aleatorio|color aleatorio)\b/u;
const TRUSTED_BRAND = /\b(amazon|apple|samsung|xiaomi|poco|redmi|google|motorola|sony|lg|philips|bosch|rowenta|cecotec|dyson|roborock|dreame|tapo|tp-link|logitech|lenovo|asus|acer|hp|dell|msi|intel|amd|nintendo|playstation|xbox|lego|intex|gillette|old spice|finish|fairy|wipp|puleva|central lechera asturiana|el almendro|cafe borbone|lotus)\b/u;

export function interestFamily(offer = {}) {
  const title = text(offer.title);
  const families = [
    ['limpieza', /\b(aspirador(?:a|es|as)?|vacuum|limpiatapicerias|fregasuelos|limpiacristales)\b/u],
    ['climatizacion', /\b(ventilador(?:es)?|aire acondicionado|climatizador(?:es)?|deshumidificador(?:es)?|calefactor(?:es)?)\b/u],
    ['informatica', /\b(ordenador(?:es)? portatil(?:es)?|mini pc|monitor(?:es)?|ssd|ordenador(?:es)?|impresora 3d|teclado|raton gaming)\b/u],
    ['moviles-audio', /\b(smartphones?|moviles?|tablets?|auriculares|altavoz|altavoces|barra de sonido|streaming stick)\b/u],
    ['cocina', /\b(cafeteras?|freidoras?|exprimidor(?:es)?|batidoras?|robots? de cocina|microondas)\b/u],
    ['electrodomesticos', /\b(lavadoras?|frigorificos?|congelador(?:es)?|televisor(?:es)?|lavavajillas|planchas? de vapor)\b/u],
    ['bricolaje', /\b(taladros?|destornillador(?:es)?|herramientas?|sierras? (?:sable|circular|electrica))\b/u],
    ['gaming', /\b(consolas?|videojuegos?|playstation|xbox|nintendo|silla gaming)\b/u],
    ['automovil', /\b(cargador ev|cable de (?:carga )?(?:ev|vehiculo electrico)|portaequipajes|arrancador de bateria)\b/u],
    ['hogar-util', /\b(colchon(?:es)? hinchable|perchero|zapatero|sillas? camping|domotica|bombilla inteligente)\b/u],
    ['cuidado-personal', /\b(afeitadora|cuchillas? de afeitar|secador de pelo|desodorante|gel de bano|crema hidratante|perfume)\b/u],
    ['alimentacion', /\b(aceite|cafe|capsulas? (?:compostables )?de cafe|jamon|queso|leche|arroz|pasta|conservas?|atun|galletas?|chocolate|turron|cereales?|frutos secos|bebidas?|refrescos?|cerveza|vino)\b/u],
    ['consumo', /\b(detergentes?|panales|papel higienico|pastillas lavavajillas|gel lavavajilla)\b/u],
  ];
  return families.find(([, pattern]) => pattern.test(title))?.[0] || 'otros';
}

export function automaticInterest(offer = {}, { requireDealEvidence = false } = {}) {
  const title = text(offer.title);
  // Telegram source links enter the queue before Amazon metadata is fetched.
  // An empty raw title is therefore unknown, not uninteresting. Let it reach
  // the official product reader and apply the strict gate to the enriched
  // offer afterwards.
  if (!title) return requireDealEvidence ? -1 : 0;
  if (LOW_INTEREST.test(title) || LOW_QUALITY_PHRASES.test(title)) return -1;
  const family = interestFamily(offer);
  const priorityFamily = family !== 'otros';
  if (!requireDealEvidence) return priorityFamily ? 3 : 1;

  const { price, previousPrice, discount, saving, coupon } = dealFacts(offer);
  const trustedBrand = TRUSTED_BRAND.test(title);
  const communityProof = /chollometro|ofertos|una-ganga|tiesometro/u.test(text(offer.source))
    && (Number(offer.sourceHeat || offer.heat || 0) >= 150 || Number(offer.sourceWeight || 0) >= 30);

  // A price alone is not evidence of a deal. This was the main source of
  // catalogue filler in Amazon's automatic queue.
  if (!price || (!previousPrice && !discount && !coupon && !communityProof)) return -1;
  if (price < 5 && !['alimentacion', 'consumo'].includes(family)) return -1;

  const foodOrConsumable = ['alimentacion', 'consumo'].includes(family);
  const strongBigTicket = price >= 100 && discount >= 12 && saving >= 20;
  const strongDeal = discount >= 25 && (saving >= 5 || (foodOrConsumable && saving >= 1.5));
  const usefulDeal = priorityFamily && discount >= 18 && (saving >= 3 || (foodOrConsumable && saving >= 1.5));
  const brandDeal = trustedBrand && discount >= 18 && saving >= 4;
  const couponDeal = coupon && priorityFamily && (discount >= 8 || saving >= 2 || communityProof);
  const provenCommunityDeal = communityProof && (priorityFamily || trustedBrand) && price >= 8;
  if (!(strongBigTicket || strongDeal || usefulDeal || brandDeal || couponDeal || provenCommunityDeal)) return -1;
  return 2 + Number(priorityFamily) * 2 + Number(trustedBrand) + Number(coupon) + Math.min(discount, 60) / 20;
}

export function selectInterestingOffers(offers = []) {
  const interest = (offer) => automaticInterest(offer, { requireDealEvidence: true });
  const sorted = offers.filter((offer) => interest(offer) >= 0)
    .sort((a, b) => interest(b) - interest(a) || Number(b.score || 0) - Number(a.score || 0));
  const seen = new Map();
  return sorted.map((offer, index) => {
    const key = interestFamily(offer);
    const occurrence = seen.get(key) || 0;
    seen.set(key, occurrence + 1);
    return { offer, index, occurrence };
  }).sort((a, b) => interest(b.offer) - interest(a.offer)
    || a.occurrence - b.occurrence || a.index - b.index).map(({ offer }) => offer);
}
