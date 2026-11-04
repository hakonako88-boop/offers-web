/** Only literal facts from the published title/conditions, never an invented
 * review, specification, stock statement or hands-on recommendation. */
export function priceConditionSummary(value='') {
  return String(value).split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])/u)[0];
}
export function offerBuyingNotes(deal) {
  const source=`${deal.title||''} ${deal.priceCondition||''}`;
  const normalized=source.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
  const facts=[]; const checks=[];
  if(/codigo en caja|ciab/u.test(normalized)) {
    facts.push('Formato código en caja (CIAB).');
    if(/sin disco/u.test(normalized)) checks.push('No incluye disco: necesita descargar el juego.');
    checks.push('Comprueba la región de tu cuenta y la fecha de entrega del código.');
  }
  if(/reserva|preventa/u.test(normalized)) {
    facts.push('Se publica como reserva, no como disponibilidad inmediata.');
    checks.push('Reservar no implica poder jugar antes del lanzamiento.');
  }
  if(/version global/u.test(normalized)) checks.push('Confirma la versión, garantía y compatibilidad de la variante elegida.');
  if(/robot.*aspir|aspir.*robot/u.test(normalized)) checks.push('Revisa altura, tipo de base, recambios y compatibilidad con tu vivienda.');
  else if(/monitor|televisor|\btv\b/u.test(normalized)) checks.push('Comprueba medidas, conexiones y prestaciones disponibles en cada entrada.');
  else if(/movil|smartphone|galaxy|redmi|poco\s|realme/u.test(normalized)) checks.push('Comprueba memoria, almacenamiento, conectividad y garantía de la versión seleccionada.');
  else if(/calcetines|zapatill|ropa|skechers/u.test(normalized)) checks.push('Selecciona tu talla: el precio puede depender de talla, color o vendedor.');
  else if(/freidora|cafetera|tostadora/u.test(normalized)) checks.push('Comprueba capacidad, dimensiones y accesorios incluidos.');
  const size=String(deal.title||'').match(/\b\d+(?:[.,]\d+)?\s*(?:GB|TB|ml|litros|pulgadas)\b/iu)?.[0];
  if(size) facts.push(`La publicación indica ${size}; comprueba la variante en la ficha.`);
  if(!checks.length) checks.push('Comprueba el modelo exacto y qué incluye la variante seleccionada.');
  checks.push('Revisa vendedor, gastos de envío y total antes de completar la compra.');
  return {
    summary:/reserva|preventa/u.test(normalized) ? 'Reserva: revisa el formato y la entrega antes de comprar.' : `Oferta publicada en ${deal.store}. Modelo, precio y condiciones para decidir con más información.`,
    facts, checks:[...new Set(checks)].slice(0,4),
    advice:checks[0],
  };
}
