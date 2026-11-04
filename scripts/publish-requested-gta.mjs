import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { miraviaAwinDeepLink } from './miravia-affiliate-resolver.mjs';
import { createDealImageCard } from './deal-image-card.mjs';

export const requestedGta = {
  source_product_id: 'miravia:1374712289389270:6187750476753622',
  title: 'GTA VI para PS5: reserva con código en caja por 69,63 € con cupón',
  price: '69,63 €', previousPrice: '79,99 €', store: 'Miravia', category: 'Videojuegos',
  coupon: 'Cupón 11.11 de 7 €: recoger en la ficha y aplicar al pagar',
  description: 'Precio condicionado: 76,63 € en la ficha; 69,63 € si se aplica el cupón 11.11 de 7 €. Reserva de la Edición Estándar para PS5 en formato CIAB: código de descarga en caja, sin disco. Comprueba cuenta compatible, cupón, gastos y fecha de entrega en Miravia. No implica acceso anticipado.',
  image: 'https://img2.miravia.es/g/fb/kf/E7dd3cb2243e84e40a4070b3cb1220aed9.png_720x720q75.png_.webp',
  url: miraviaAwinDeepLink('https://www.miravia.es/p/i1374712289389270-s6187750476753622.html'),
  source: 'owner-selected',
  source_url: 'https://nolodejesescapar.com/grand-theft-auto-vi-ps5-edicion-estandar/',
};

export const requestedGtaCaption = [
  '<b>🎮 ¿Esperas GTA VI? Reserva para PS5 con cupón</b>', '',
  'Edición Estándar en <b>código en caja (CIAB), sin disco</b>. Revisa este formato antes de reservar.', '',
  '💶 <b>69,63 € con cupón</b>',
  '🏷 Precio en ficha: 76,63 € · referencia mostrada: 79,99 €', '',
  '🎟 <b>Recoge el cupón 11.11 de 7 €</b> en la ficha y comprueba que se descuente al pagar. Sujeto a elegibilidad y disponibilidad.', '',
  '📦 Es una <b>reserva</b>, no un juego disponible para jugar hoy. Consulta entrega y compatibilidad de la cuenta en la tienda.', '',
  '🪐 Más en @aldiachollos · #Miravia #Publi',
].join('\n');

async function main() {
  const offers = JSON.parse(fs.readFileSync('data/offers.json', 'utf8'));
  if (offers.some(o => o.source_product_id === requestedGta.source_product_id)) {
    console.log('La oferta solicitada ya está guardada; no se vuelve a enviar.'); return;
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chat) throw new Error('Falta configuración de Telegram.');
  // Safety window: this is an owner-requested one-off, not an evergreen promotion.
  if (new Date().toISOString().slice(0,10) !== '2026-11-04') throw new Error('Revisar de nuevo precio y cupón antes de publicar fuera del día comprobado.');
  const card = await createDealImageCard({imageUrl: requestedGta.image, store:'Miravia', price:'69,63 €', previousPrice:'79,99 €', coupon:'Recoge 7 € en ficha'});
  const form = new FormData();
  form.set('chat_id', chat); form.set('caption', requestedGtaCaption); form.set('parse_mode','HTML');
  form.set('photo', new Blob([card],{type:'image/jpeg'}),'gta-vi-ps5-miravia.jpg');
  form.set('reply_markup',JSON.stringify({inline_keyboard:[[{text:'🎮 VER RESERVA EN MIRAVIA',url:requestedGta.url}]]}));
  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`,{method:'POST',body:form});
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`Telegram no confirmó el envío: ${result.description || response.status}`);
  offers.unshift({...requestedGta,message_id:result.result.message_id,date:result.result.date,text:requestedGta.description});
  fs.writeFileSync('data/offers.json',JSON.stringify(offers,null,2)+'\n');
  console.log(`Publicación confirmada: https://t.me/aldiachollos/${result.result.message_id}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
