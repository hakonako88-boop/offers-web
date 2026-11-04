export function tvCollageCaption(entries, guideId) {
  const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const blocks=entries.map(p=>{
    if(!/^https:\/\//u.test(p.offer?.url||'')) throw new Error(`Falta enlace: ${p.name}`);
    return `<b>${escape(p.name)}</b>\n${escape(p.panel)} · ${escape(p.refresh)} · ${escape(p.system)}\n\n💶 <b>${escape(p.offer.price)}</b> · precio registrado\n👉 <a href="${escape(p.offer.url)}">Ver oferta de este modelo</a>`;
  });
  const caption=`📺 <b>Tu próxima televisión</b>\nTres opciones para espacios diferentes.\n\n${blocks.join('\n\n────────────\n\n')}\n\n📖 <a href="https://chollosaldia.com/publicacion/${encodeURIComponent(guideId)}/">Comparativa completa y condiciones</a>\n\n<i>Precios registrados. Confirma variante, cupón y total antes de pagar.</i>\n@aldiachollos #Publi`;
  if(caption.replace(/<[^>]*>/gu,'').length>1024) throw new Error('El texto supera el límite de Telegram.');
  return caption;
}
