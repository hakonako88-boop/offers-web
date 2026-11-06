export function mobileCaption(product, offer, articleUrl, now = Date.now()) {
  const checked = Number(offer.date) * 1000;
  const recent = Number.isFinite(checked) && checked <= now && now - checked <= 86400000;
  const lines = [`📱 ${product.name}`, '', product.verdict, '', `🖥 ${product.screen}`, `⚙️ ${product.chip}`, `🔋 ${product.battery}`, `📷 ${product.camera}`, '', '⚠️ Comprueba RAM, capacidad, versión, vendedor y cargador incluido.'];
  if (recent && offer.price) lines.push(`💶 Último precio registrado: ${offer.price}. Confirma el total en la tienda.`);
  else lines.push('💶 Consulta el precio actual en la tienda: no presentamos el precio antiguo como vigente.');
  lines.push('', `🛒 Ver ${product.name}:`, offer.url, '', '📊 Comparativa, ventajas y características:', articleUrl, '', '@aldiachollos #Móviles #Publi');
  return lines.join('\n');
}
