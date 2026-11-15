import { randomUUID } from 'node:crypto';
import { offerReplyMarkup } from './offer-presentation.mjs';

export function correctedOffer(old, price, coupon) {
  const next = {...old};
  if (price === '-' && coupon === '-') throw new Error('Indica un cambio.');
  if (price !== '-') {
    if (!/^\d{1,6}(?:[.,]\d{1,2})?$/u.test(price) || Number(price.replace(',','.')) <= 0) throw new Error('Precio no válido. Ejemplo: 19,99');
    next.price = new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(price.replace(',','.')));
  }
  if (coupon !== '-') {
    if (coupon !== 'quitar' && !/^[A-Z0-9_-]{3,32}$/iu.test(coupon)) throw new Error('Cupón no válido.');
    next.coupon = coupon === 'quitar' ? '' : coupon.toUpperCase();
    delete next.couponDiscount;
    delete next.couponMinimumSpend;
  }
  for (const key of ['discount','savings','priceCondition']) delete next[key];
  next.previousPrice = '';
  next.description = 'Oferta corregida por Chollos al Día. Comprueba el total y las condiciones en la tienda.';
  next.text = next.description;
  return next;
}

export async function handlePublishedEdit({ text, message, isOwnerSender, settings, state, load, save, image, telegram, telegramForm, reply }) {
  const command = text.trim();
  if (!/^\/(?:editar|confirmar_edicion)(?:@\w+)?(?:\s|$)/iu.test(command)) return false;
  const chat = message.chat.id;
  if (message.chat.type !== 'private') return true;
  const say = value => reply(settings.token, chat, value);
  if (!isOwnerSender || String(chat) !== String(settings.allowedChatId)) {
    await say('Edición reservada al propietario.');
    return true;
  }
  state.publishedEdits ??= {};
  const drafts = state.publishedEdits;
  try {
    const edit = command.match(/^\/editar(?:@\w+)?\s+(?:https:\/\/t\.me\/aldiachollos\/)?(\d+)\s+(\S+)\s+(\S+)$/iu);
    const confirm = command.match(/^\/confirmar_edicion(?:@\w+)?\s+([a-f0-9-]{36})$/iu);
    if (edit) {
      const row = load().find(o => Number(o.message_id) === Number(edit[1]));
      if (!row?.source_product_id || !row.url) throw new Error('No encuentro la ficha web vinculada.');
      const next = correctedOffer(row, edit[2], edit[3]);
      const code = randomUUID();
      drafts[chat] = { row, next, code, at: Date.now() };
      await say(['Vista previa: '+row.title, 'Precio: '+row.price+' → '+next.price, 'Cupón: '+(row.coupon || '—')+' → '+(next.coupon || '—'), 'Se conserva el enlace. Se usará una portada sin el precio anterior.', '', '/confirmar_edicion '+code].join('\n'));
    } else if (confirm) {
      const draft = drafts[chat];
      if (!draft || draft.code !== confirm[1] || Date.now()-draft.at > 1800000) throw new Error('Vista previa caducada o incorrecta. Ejecuta /editar otra vez.');
      const offers = load();
      const index = offers.findIndex(o => o.message_id === draft.row.message_id && o.source_product_id === draft.row.source_product_id);
      if (index < 0 || JSON.stringify(offers[index]) !== JSON.stringify(draft.row)) throw new Error('La oferta cambió. Genera una nueva vista previa.');
      const channel = await telegram(settings.token, 'getChat', {chat_id:settings.channelId});
      if (channel.username?.toLowerCase() !== 'aldiachollos') throw new Error('Canal no reconocido.');
      const next = {...draft.next, image:'/og-chollosaldia-v3.png'};
      const form = new FormData();
      form.set('chat_id',String(channel.id));
      form.set('message_id',String(next.message_id));
      const caption = [String(next.title).slice(0,320),'','💶 Precio: '+next.price,next.coupon?'🎟️ Cupón: '+String(next.coupon).slice(0,100):'','','Comprueba el total en la cesta. · #Publi'].join('\n');
      form.set('media',JSON.stringify({type:'photo',media:'attach://photo',caption}));
      form.set('reply_markup',JSON.stringify(offerReplyMarkup({...next,id:next.source_product_id})));
      form.set('photo',new Blob([image()],{type:'image/png'}),'oferta-actualizada.png');
      await telegramForm(settings.token,'editMessageMedia',form);
      offers[index] = next;
      save(offers);
      delete drafts[chat];
      await say('✅ Telegram actualizado en el mismo mensaje. El cambio de la ficha web queda pendiente de despliegue.');
    } else {
      await say('Usa /editar ENLACE PRECIO CUPÓN. Ejemplo: /editar https://t.me/aldiachollos/8110 19,99 CODIGO. Usa - para conservar un campo o quitar para eliminar el cupón.');
    }
  } catch (error) {
    await say('⚠️ '+String(error.message).replaceAll(settings.token || '[none]','[oculto]'));
  }
  return true;
}
