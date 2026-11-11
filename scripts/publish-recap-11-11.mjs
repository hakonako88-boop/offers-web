import fs from 'node:fs';

const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const receipt = 'data/recap-11-11-2026.json';
const replace = process.argv.includes('--replace-artwork');
const artwork = 'public/images/recap-11-11-2026-kinetic.png';
const selection = [[8100, '📱', 'Nothing Phone (3a) Pro'], [8099, '🍟', 'Freidora NARVI 6,5 L'], [8091, '⌚', 'Amazfit Active'], [8085, '🛴', 'Xiaomi Scooter 6 Lite']];
const offers = JSON.parse(fs.readFileSync('data/offers.json', 'utf8'));
const published = JSON.parse(fs.readFileSync('data/aliexpress-publications.json', 'utf8')).published;
const rows = selection.map(([id, emoji, name]) => {
  const offer = offers.find(o => o.message_id === id);
  const verified = published.find(o => o.telegramMessageId === id && o.url === offer?.url);
  if (!verified || !/^https:\/\/(?:s\.click|a)\.aliexpress\.com\//u.test(offer.url)) throw new Error('Oferta sin justificante: ' + id);
  const code = /^[A-Z0-9]{4,20}$/u.test(offer.coupon || '') ? ' · <code>' + offer.coupon + '</code>' : '';
  return { id, name, url: offer.url, text: emoji + ' <b>' + name + '</b> · ' + new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(verified.price) + code };
});
const caption = [
  '🧡 <b>Especial 11.11 AliExpress | 4 ofertas para comparar</b>', '',
  ...rows.map(row => row.text), '',
  '🎟️ <b>Cupones anunciados para el 11–12/11</b>',
  '<code>ESD11100</code> · 100 € desde 500 €',
  '<code>ESD11120</code> · 120 € desde 600 €', '',
  '🛒 Precios anunciados al publicar cada oferta. Confirma variante, envío y total en la cesta. Usa un solo código y no vuelvas a restarlo si el precio ya lo incluye. Sujeto a elegibilidad y cupos.', '',
  '💚 @aldiachollos · #AliExpress #1111 #Publi',
].join('\n');
const keyboard = rows.map(row => [{ text: row.name, url: row.url }]);
keyboard.push([{ text: '🎟️ Ver todos los cupones y mínimos', url: 'https://chollosaldia.com/publicacion/aliexpress-11-11-2026-cupones-ofertas/' }]);
if (caption.length > 1024) throw new Error('El texto no cabe en la imagen.');
if (process.argv.includes('--preview')) {
  console.log(caption);
} else if (replace || !fs.existsSync(receipt)) {
  const prior = replace ? JSON.parse(fs.readFileSync(receipt, 'utf8')) : null;
  if (replace && (prior.message_id !== 8105 || JSON.stringify(prior.offers) !== JSON.stringify(rows.map(r => r.id)))) throw new Error('No coincide el recopilatorio autorizado para editar.');
  if (!replace && day !== '2026-11-11') throw new Error('El recopilatorio está reservado al 11 de noviembre.');
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chat) throw new Error('Falta configuración de Telegram.');
  async function telegram(method, body) {
    const response = await fetch('https://api.telegram.org/bot' + token + '/' + method, { method: 'POST', body, signal: AbortSignal.timeout(30000) });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(method + ' no confirmado: ' + (data.description || response.status));
    return data.result;
  }
  const channel = new FormData(); channel.set('chat_id', chat);
  if ((await telegram('getChat', channel)).username?.toLowerCase() !== 'aldiachollos') throw new Error('Canal inesperado.');
  const form = new FormData();
  form.set('chat_id', chat);
  const file = fs.existsSync(artwork) ? artwork : 'public/images/aliexpress-11-11-2026.png';
  if (replace && file !== artwork) throw new Error('Falta la portada nueva.');
  if (replace) {
    form.set('message_id', String(prior.message_id));
    form.set('media', JSON.stringify({ type: 'photo', media: 'attach://photo', caption, parse_mode: 'HTML' }));
  } else {
    form.set('caption', caption); form.set('parse_mode', 'HTML');
  }
  form.set('photo', new Blob([fs.readFileSync(file)], { type: 'image/png' }), 'especial-11-11.png');
  form.set('reply_markup', JSON.stringify({ inline_keyboard: keyboard }));
  const message = await telegram(replace ? 'editMessageMedia' : 'sendPhoto', form);
  fs.writeFileSync(receipt, JSON.stringify({ message_id: message.message_id, date: prior?.date ?? message.date, offers: rows.map(r => r.id), ...(replace ? { artwork, edited_at: message.edit_date } : {}) }, null, 2) + '\n');
  console.log((replace ? 'Editado: ' : 'Publicado: ') + 'https://t.me/aldiachollos/' + message.message_id);
}
