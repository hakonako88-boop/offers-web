import fs from 'node:fs';
const receipt = 'data/mobile-recap-11-11-2026.json';
const artwork = 'public/images/mobile-recap-11-11-2026.png';
const addCover = process.argv.includes('--add-cover');
const day = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'});
const date = new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',day:'2-digit',month:'2-digit'});
const money = new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'});
const picks = [[8015,'Redmi 17C 5G','Para un presupuesto ajustado'],[8038,'POCO C95 Pro','Otra opción económica'],[8075,'POCO X8 Pro','Para comparar rendimiento'],[7979,'realme GT 7T','Alternativa al POCO'],[8100,'Nothing Phone (3a) Pro','Para comparar cámara y diseño']];
const history = JSON.parse(fs.readFileSync('data/aliexpress-publications.json','utf8')).published;
const items = picks.map(([id,name,note])=>{
  const entry = history.find(r=>r.telegramMessageId===id);
  if (!entry || !Number.isFinite(entry.price) || entry.price<=0 || !/^https:\/\/(?:s\.click|a)\.aliexpress\.com\//u.test(entry.url)) throw new Error('No hay registro afiliado para ' + id);
  return {id,name,note,...entry};
});
const content = [
  '📱 <b>11.11 AliExpress · 5 móviles para comparar</b>',
  '¿Buscas cambiar de móvil? Aquí tienes cinco modelos ordenados por el último precio que publicamos.',
  ...items.map((r,i)=>`<b>${i+1}. ${r.name} — ${money.format(r.price)}</b>\n${r.note} · publicado el ${date.format(new Date(r.publishedAt))}. <a href="https://t.me/aldiachollos/${r.id}">Ver oferta original y condiciones</a>`),
  '🎟️ En el POCO X8 Pro se anunciaron <code>ESD1139</code> o <code>AEES39</code>. Son alternativas; usa uno y comprueba el mínimo elegible. No vuelvas a descontarlo si el precio ya lo incluye.',
  '⚠️ Los importes son referencias publicadas, no precios comprobados ahora. Confirma la versión, el almacenamiento, el envío, la garantía y el total del carrito.',
  '💚 @aldiachollos · #AliExpress #1111 #Publi',
].join('\n\n');
const codes = {8015:['ESD1123'],8038:['AEES23'],8075:['ESD1139','AEES39'],7979:['IFPLPBRT']};
const caption = [
  '📱 <b>11.11 AliExpress · 5 móviles y sus cupones</b>', '',
  ...items.map(r => `<b>${r.name} · ${money.format(r.price)}</b> (${date.format(new Date(r.publishedAt))})\n${codes[r.id] ? '🎟️ ' + codes[r.id].map(c=>'<code>'+c+'</code>').join(' o ') : 'Sin cupón anunciado'}`),
  '', 'Códigos anunciados: <code>ESD1123</code> / <code>AEES23</code> desde 135 €; <code>ESD1139</code> / <code>AEES39</code> desde 230 € de subtotal elegible.',
  '', 'Precios de la fecha indicada. Cupos y condiciones en la cesta. Usa un solo código; no lo restes otra vez si ya está incluido.', '',
  '💚 @aldiachollos · #Publi',
].join('\n');
if (caption.replace(/<[^>]+>/g,'').length > 1024) throw new Error('Texto demasiado largo.');
if (process.argv.includes('--preview')) console.log(addCover ? caption : content);
else if (addCover || !fs.existsSync(receipt)) {
  const prior = addCover ? JSON.parse(fs.readFileSync(receipt,'utf8')) : null;
  if (prior && (prior.message_id !== 8113 || JSON.stringify(prior.offers)!==JSON.stringify(items.map(r=>r.id)))) throw new Error('Mensaje inesperado.');
  if (prior?.artwork === artwork) process.exit(0);
  if(!addCover && day.format(new Date())!=='2026-11-11') throw new Error('Especial reservado para el 11/11.');
  const token=process.env.TELEGRAM_BOT_TOKEN, chat=process.env.TELEGRAM_CHANNEL_ID;
  if(!token||!chat) throw new Error('Falta Telegram.');
  async function call(method, payload) {
    const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chat,...payload}),signal:AbortSignal.timeout(30000)});
    const d=await r.json();
    if(!r.ok||!d.ok) throw new Error(method+' no confirmado: '+(d.description||r.status));
    return d.result;
  }
  if ((await call('getChat',{})).username?.toLowerCase()!=='aldiachollos') throw new Error('Canal incorrecto.');
  const inline_keyboard=items.map(r=>[{text:'🛒 '+r.name,url:r.url}]);
  inline_keyboard.push([{text:'🎟️ Guía de cupones 11.11',url:'https://chollosaldia.com/publicacion/aliexpress-11-11-2026-cupones-ofertas/'}]);
  let m;
  if (addCover) {
    const form = new FormData();
    form.set('chat_id',chat);
    form.set('message_id',String(prior.message_id));
    form.set('media',JSON.stringify({type:'photo',media:'attach://cover',caption,parse_mode:'HTML'}));
    form.set('reply_markup',JSON.stringify({inline_keyboard}));
    form.set('cover',new Blob([fs.readFileSync(artwork)],{type:'image/png'}),'moviles-11-11.png');
    const r=await fetch(`https://api.telegram.org/bot${token}/editMessageMedia`,{method:'POST',body:form,signal:AbortSignal.timeout(30000)});
    const d=await r.json();
    if (!r.ok || !d.ok || !d.result?.photo?.length) throw new Error('Portada no confirmada: '+(d.description||r.status));
    m=d.result;
  } else {
    m=await call('sendMessage',{text:content,parse_mode:'HTML',link_preview_options:{is_disabled:true},reply_markup:{inline_keyboard}});
  }
  fs.writeFileSync(receipt,JSON.stringify({message_id:m.message_id,date:m.date,offers:items.map(r=>r.id),...(addCover?{artwork,edited_at:m.edit_date}:{})},null,2)+'\n');
}
