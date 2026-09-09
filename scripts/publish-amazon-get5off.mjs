import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const chatId = String(process.env.TELEGRAM_CHANNEL_ID || '').trim();
if (!token || !chatId) throw new Error('Faltan las credenciales de Telegram.');

const publicChannel = await fetch('https://t.me/s/aldiachollos', { headers: { 'user-agent': 'ChollosAlDiaBot/1.0' } }).then((response) => response.ok ? response.text() : '').catch(() => '');
if (/GET5OFF/iu.test(publicChannel)) {
  console.log('El cupón GET5OFF ya está publicado; no se repite.');
  process.exit(0);
}

const image = await sharp(path.join(process.cwd(), 'public/images/cupon-amazon-get5off.svg')).jpeg({ quality: 91 }).toBuffer();
const caption = [
  '<b>🔥 ¡CUPONAZO AMAZON! 5 € de descuento desde 15 €</b>',
  '',
  'Amazon ofrece <b>5 € de descuento</b> en una compra mínima de <b>15 €</b> en productos elegibles, vendidos y enviados por Amazon.',
  '',
  '🎟️ <b>Código:</b> <code>GET5OFF</code>',
  '👤 <b>Solo para cuentas seleccionadas</b>',
  '',
  'Entra con tu cuenta y comprueba que Amazon confirme tu elegibilidad antes de completar el pedido.',
  '',
  '⚠️ Promoción sujeta a disponibilidad y condiciones de Amazon.',
  '',
  '🔔 <b>Sigue @aldiachollos</b> para recibir nuevos cupones y chollos',
  '#Amazon #CuponAmazon #Chollos',
].join('\n');
const form = new FormData();
form.set('chat_id', chatId);
form.set('caption', caption);
form.set('parse_mode', 'HTML');
form.set('photo', new Blob([image], { type: 'image/jpeg' }), 'cupon-amazon-get5off.jpg');
form.set('reply_markup', JSON.stringify({ inline_keyboard: [[{ text: '🎟️ COMPROBAR MI CUENTA', url: 'https://www.amazon.es/b?node=222407439031&tag=chollos00a-21' }], [{ text: '🌐 VER CONDICIONES', url: 'https://chollosaldia.com/publicacion/cupon-amazon-get5off/' }]] }));
const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
const result = await response.json().catch(() => ({}));
if (!response.ok || !result.ok) throw new Error(result.description || `HTTP ${response.status}`);
console.log(`Cupón GET5OFF publicado con el mensaje ${result.result?.message_id}.`);
