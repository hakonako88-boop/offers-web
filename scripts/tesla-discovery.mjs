import { freshTeslaPrice } from './tesla-pricing.mjs';

export function discoveryTopics(topics, date = new Date(), count = 2) {
  if (!topics.length) return [];
  const slot = Math.floor(date.getTime() / (6 * 3600000));
  return Array.from({ length: Math.min(count, topics.length) }, (_, index) => topics[(slot * count + index) % topics.length]);
}
export function lowRiskTeslaAccessory(title = '') {
  const text = title.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  if (!/\btesla\b/.test(text) || !/\bmodel[ -]?(?:3|y)\b|\bhighland\b|\bjuniper\b/.test(text)) return false;
  if (/airbag|pedal|brake|freno|suspensi|steering|volante|seat.?belt|cinturon|jack.?pad|elevacion|lifting|spoiler|aleron|sensor|camera|camara|bateria|battery|wallbox|cargador|charger|charging|iluminac|cableado|volt|led\b|refriger|ventilat|air.?intake|entrada de aire/.test(text)) return false;
  return /organiz|storage|almacenamiento|floor.?mat|alfombr|trunk.?liner|maletero|screen.?protector|protector de pantalla|sunshade|parasol|microfib|limpieza/.test(text);
}
export function teslaEditorialCategory(title = '') {
  const text = title.toLowerCase();
  if (/screen|pantalla/.test(text)) return 'Protección de pantalla';
  if (/floor|mat\b|alfombr|liner/.test(text)) return 'Alfombrillas y protección interior';
  if (/sunshade|parasol/.test(text)) return 'Parasoles y confort';
  if (/microfib|limpieza/.test(text)) return 'Limpieza y cuidado';
  return 'Organización y almacenamiento';
}
export function admissibleDiscovery(row, now = Date.now()) {
  if (!['Amazon', 'AliExpress'].includes(row.store)) return false;
  try {
    const image = new URL(row.imageUrl);
    const link = new URL(row.generatedAffiliateUrl || row.originalUrl);
    const expectedHost = row.store === 'Amazon' ? /(^|\.)amazon\.es$/i : /(^|\.)aliexpress\.com$/i;
    return freshTeslaPrice(row, now) && lowRiskTeslaAccessory(row.name)
      && image.protocol === 'https:' && link.protocol === 'https:' && expectedHost.test(link.hostname);
  } catch { return false; }
}
export function growDiscoveryCatalogue(previous, incoming, { maxNew = 2, maxTotal = 20, now = Date.now(), excludedIds = [] } = {}) {
  const existing = new Map(previous.filter(row => !excludedIds.includes(row.productId)).map(row => [row.productId, row]));
  for (const row of incoming) if (existing.has(row.productId) && admissibleDiscovery(row, now)) existing.set(row.productId, { ...row, admittedAt: existing.get(row.productId).admittedAt || row.checkedAt, admission: 'automated_low_risk_filter', compatibilityStatus: 'pending' });
  for (const [id, row] of existing) if (!admissibleDiscovery(row, now)) existing.delete(id);
  let added = 0;
  for (const row of incoming) {
    if (excludedIds.includes(row.productId) || !admissibleDiscovery(row, now)) continue;
    if (existing.has(row.productId)) existing.set(row.productId, { ...row, admittedAt: existing.get(row.productId).admittedAt || row.checkedAt, admission: 'automated_low_risk_filter', compatibilityStatus: 'pending' });
    else if (added < maxNew && existing.size < maxTotal) {
      existing.set(row.productId, { ...row, admittedAt: row.checkedAt, admission: 'automated_low_risk_filter', compatibilityStatus: 'pending' }); added++;
    }
  }
  return { items: [...existing.values()].filter(row => admissibleDiscovery(row, now)).slice(0, maxTotal), added };
}
