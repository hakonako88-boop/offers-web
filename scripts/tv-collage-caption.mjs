export function tvCollageCaption(entries, guideId) {
  const blocks=entries.map(p=>{
    if(!/^https:\/\//u.test(p.offer?.url||'')) throw new Error(`Falta enlace: ${p.name}`);
    return `${p.name}\n${p.panel} · ${p.refresh} · ${p.system}\n💶 Precio registrado: ${p.offer.price}\n👉 Comprar este modelo:\n${p.offer.url}`;
  });
  const caption=`📺 TRES TELEVISORES, TRES NECESIDADES\n\n${blocks.join('\n\n')}\n\n📖 Comparativa y condiciones:\nhttps://chollosaldia.com/publicacion/${guideId}/\n\nConfirma variante, cupón, envío y total en tienda. Precios registrados, no garantizados en tiempo real.\n@aldiachollos #Publi`;
  if(caption.length>1024) throw new Error('El texto supera el límite de Telegram.');
  return caption;
}
