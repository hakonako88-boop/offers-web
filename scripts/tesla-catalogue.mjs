/** Tesla catalogue rules. No inferred compatibility and no catalogue scraping. */
export const GENERATIONS = {
  'Model 3': ['original', 'Highland'],
  'Model Y': ['original', 'Juniper'],
};
export const CATEGORIES = ['Alfombrillas', 'Pantalla', 'Consola', 'Maletero', 'Almacenamiento', 'Móvil', 'Limpieza', 'Interior', 'Confort', 'Viajes'];
export function safeHttps(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
export function evidenceValid(evidence) {
  return Boolean(evidence && safeHttps(evidence.url) && evidence.note?.trim() && Number.isFinite(Date.parse(evidence.checkedAt)));
}
export function compatibilityMatches(variant, vehicle) {
  if (!vehicle?.model || !vehicle.generation || !Number.isInteger(vehicle.year) || !['manufacture', 'model'].includes(vehicle.yearBasis) || !vehicle.market) return false;
  return (variant.compatibilities || []).some(rule =>
    rule.status === 'confirmed' && evidenceValid(rule.evidence)
    && rule.model === vehicle.model && rule.generation === vehicle.generation
    && rule.market === vehicle.market && rule.yearBasis === vehicle.yearBasis
    && Array.isArray(rule.years) && rule.years.includes(vehicle.year)
    && (rule.trimPolicy === 'not_relevant' || (rule.trimPolicy === 'specific' && Boolean(vehicle.trim) && rule.trims?.includes(vehicle.trim)))
  );
}
export function isFreshOffer(offer, now = Date.now()) {
  const checked = Date.parse(offer.checkedAt);
  return offer.status === 'available' && evidenceValid(offer.evidence)
    && Number.isFinite(checked) && checked <= now && now - checked <= 24 * 60 * 60 * 1000
    && Number.isFinite(offer.price) && offer.price >= 0 && Number.isFinite(offer.shipping) && offer.shipping >= 0
    && offer.currency === 'EUR' && offer.market === 'ES' && offer.taxIncluded === true
    && offer.affiliateConfirmed === true && safeHttps(offer.affiliateUrl);
}
export function compareOffers(variant, now = Date.now()) {
  // Exact identity is assigned by a reviewer using brand/SKU/material/size/quantity evidence.
  // Similar-looking accessories and different variants are never combined.
  const rows = (variant.offers || []).filter(offer =>
    variant.identityKey && offer.identityKey === variant.identityKey && evidenceValid(offer.identityEvidence)
    && isFreshOffer(offer, now) && !offer.conditions?.trim()
  ).map(offer => ({ ...offer, total: Math.round((offer.price + offer.shipping) * 100) / 100 }))
    .sort((a, b) => a.total - b.total);
  const stores = new Set(rows.map(row => row.store));
  const savings = stores.size >= 2 && rows.at(-1).total > rows[0].total
    ? { amount: Math.round((rows.at(-1).total - rows[0].total) * 100) / 100, percentage: Math.round((1 - rows[0].total / rows.at(-1).total) * 100) } : null;
  return { rows, savings };
}
export function validateCatalogue(catalogue) {
  const errors = [];
  if (catalogue?.schemaVersion !== 1 || !Array.isArray(catalogue.products) || !Array.isArray(catalogue.imports) || !Array.isArray(catalogue.vehicleConfigurations)) return ['Formato de catálogo inválido'];
  const ids = new Set(); const urls = new Set(); const productIds = new Set();
  for (const entry of catalogue.imports) {
    if (!entry || typeof entry !== 'object') { errors.push('Importación inválida'); continue; }
    if (!safeHttps(entry.originalUrl)) errors.push('Enlace original inválido');
    if (urls.has(entry.originalUrl)) errors.push('Enlace original duplicado');
    if (entry.productId && productIds.has(entry.productId)) errors.push('Producto importado duplicado');
    urls.add(entry.originalUrl); if (entry.productId) productIds.add(entry.productId);
  }
  for (const config of catalogue.vehicleConfigurations) {
    if (!config || typeof config !== 'object') { errors.push('Configuración inválida'); continue; }
    if (!GENERATIONS[config.model]?.includes(config.generation) || !Number.isInteger(config.year) || !['manufacture', 'model'].includes(config.yearBasis) || !config.market || !config.trim || !evidenceValid(config.evidence)) errors.push('Configuración de vehículo sin evidencia suficiente');
  }
  for (const product of catalogue.products) {
    if (!product || typeof product !== 'object') { errors.push('Producto inválido'); continue; }
    if (!product.id || ids.has(product.id)) errors.push('Identificador de producto ausente o duplicado');
    ids.add(product.id);
    if (!product.name?.trim() || !CATEGORIES.includes(product.category) || !Array.isArray(product.variants)) errors.push('Producto incompleto');
    for (const variant of Array.isArray(product.variants) ? product.variants : []) {
      if (!variant || typeof variant !== 'object') { errors.push('Variante inválida'); continue; }
      if (!variant.id || ids.has(variant.id)) errors.push('Identificador de variante ausente o duplicado');
      ids.add(variant.id);
      if (!Array.isArray(variant.compatibilities) || !Array.isArray(variant.offers)) errors.push('Variante incompleta');
      for (const rule of Array.isArray(variant.compatibilities) ? variant.compatibilities : []) {
        if (!rule || typeof rule !== 'object') { errors.push('Regla inválida'); continue; }
        if (rule.status !== 'confirmed') continue;
        if (!GENERATIONS[rule.model]?.includes(rule.generation) || !rule.market || !['manufacture', 'model'].includes(rule.yearBasis)
          || !Array.isArray(rule.years) || !rule.years.length || !rule.years.every(year => Number.isInteger(year) && year >= 2000 && year <= 2100) || !evidenceValid(rule.evidence)
          || !['specific', 'not_relevant'].includes(rule.trimPolicy) || (rule.trimPolicy === 'specific' && !rule.trims?.length)) errors.push('Compatibilidad confirmada sin evidencia suficiente');
      }
      for (const offer of Array.isArray(variant.offers) ? variant.offers : []) {
        if (!offer || typeof offer !== 'object') { errors.push('Oferta inválida'); continue; }
        if (!safeHttps(offer.affiliateUrl) || !safeHttps(offer.originalUrl)) errors.push('Enlace de compra inválido');
        if (offer.price !== null && (!Number.isFinite(offer.price) || offer.price < 0)) errors.push('Precio inválido');
      }
    }
  }
  return errors;
}
