import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE_FILE = path.join(ROOT, 'public', 'images', 'amazon-15-aniversario-septiembre-2026.png');
const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const chatId = String(process.env.TELEGRAM_CHANNEL_ID || '').trim();
const affiliateUrl = 'https://www.amazon.es/b/?node=221151711031&tag=chollos00a-21';

if (!token || !chatId) throw new Error('Faltan las credenciales de Telegram.');
if (!fs.existsSync(IMAGE_FILE)) throw new Error('No se encuentra la creatividad del aniversario de Amazon.');

// A rerun after a network interruption must not duplicate the campaign.
const publicChannel = await fetch('https://t.me/s/aldiachollos', {
  headers: { 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' },
  signal: AbortSignal.timeout(15_000),
}).then((response) => response.ok ? response.text() : '').catch(() => '');
if (/15\.º ANIVERSARIO DE AMAZON/iu.test(publicChannel)) {
  console.log('La campaña del 15.º aniversario de Amazon ya está publicada; no se repite.');
  process.exit(0);
}

const caption = [
  '<b>🎉 15.º ANIVERSARIO DE AMAZON ESPAÑA</b>',
  '',
  '📅 <b>Del 1 al 3 de septiembre</b>',
  '',
  '🎟 <b>15 € de descuento al gastar 75 €</b>',
  'La promoción se aplica a compras y productos elegibles. Comprueba que el descuento aparezca antes de pagar.',
  '',
  '🎡 <b>GIRA Y GANA</b>',
  'Participa desde la aplicación móvil para optar a una tarjeta regalo de 100 €. Se seleccionarán 200 ganadores según las condiciones de Amazon.',
  '',
  '✅ No es necesario ser cliente Prime.',
  '⚠️ Revisa en Amazon la elegibilidad, disponibilidad y condiciones finales.',
  '',
  '🪐 Más ofertas en @aldiachollos #Amazon #OfertasAmazon #Publi',
].join('\n');

const form = new FormData();
form.set('chat_id', chatId);
form.set('caption', caption);
form.set('parse_mode', 'HTML');
form.set('photo', new Blob([fs.readFileSync(IMAGE_FILE)], { type: 'image/png' }), path.basename(IMAGE_FILE));
form.set('reply_markup', JSON.stringify({
  inline_keyboard: [[{ text: '🎁 VER PROMOCIÓN', url: affiliateUrl }]],
}));

const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
  method: 'POST',
  body: form,
  signal: AbortSignal.timeout(30_000),
});
const result = await response.json().catch(() => ({}));
if (!response.ok || !result.ok) throw new Error(`Telegram rechazó la campaña: ${result.description || response.status}`);
console.log(`Campaña de Amazon publicada en Telegram con el mensaje ${result.result?.message_id || 'sin id'}.`);
