export function mobileCaption(product, offer, articleUrl, now = Date.now()) {
  const checked = Number(offer.date) * 1000;
  const recent = Number.isFinite(checked) && checked <= now && now - checked <= 86400000;
  const lines = [`📱 ${product.name}`, '', product.verdict, '', `🖥 ${product.screen}`, `⚙️ ${product.chip}`, `🔋 ${product.battery}`, `📷 ${product.camera}`, '', '⚠️ Comprueba RAM, capacidad, versión, vendedor y cargador incluido.'];
  if (recent && offer.price) lines.push(`💶 Último precio registrado: ${offer.price}. Confirma el total en la tienda.`);
  else lines.push('💶 Consulta el precio actual en la tienda: no presentamos el precio antiguo como vigente.');
  lines.push('', `🛒 Ver ${product.name}:`, offer.url, '', '📊 Comparativa, ventajas y características:', articleUrl, '', '@aldiachollos #Móviles #Publi');
  return lines.join('\n');
}
export function mobileSummary(guide, offers, articleUrl) {
  return ['📱 ¿QUÉ MÓVIL ELEGIR POR PRECIO Y CARACTERÍSTICAS?', '', 'Dos alternativas, según lo que necesitas:', '', ...guide.products.flatMap((product,index)=>[`${index+1}. ${product.name}`, '', product.verdict, '', `• Pantalla: ${product.screen}`, `• Procesador: ${product.chip}`, `• Batería y carga: ${product.battery}`, `• Cámara: ${product.camera}`, '', `🛒 Ver ${product.name}:`, offers[index].url, '', '━━━━━━━━━━━━', '']), '💡 Antes de decidir', 'Compara la misma RAM y capacidad, el total con envío, la garantía y el cargador. Los precios y cupones antiguos no se presentan como vigentes.', '', '📊 Fotos, tabla comparativa, ventajas y puntos a revisar:', articleUrl, '', 'Más en @aldiachollos #Móviles #Publi'].join('\n');
}
