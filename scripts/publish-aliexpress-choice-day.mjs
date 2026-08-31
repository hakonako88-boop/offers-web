import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateAliExpressAffiliateLink } from './aliexpress-link-resolver.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_FILE = path.join(ROOT, 'data', 'posts.json');
const IMAGE_FILE = path.join(ROOT, 'public', 'images', 'aliexpress-choice-day-septiembre-2026.png');
const CAMPAIGN_ID = 'choice-day-aliexpress-envio-local-septiembre-2026';
const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const chatId = String(process.env.TELEGRAM_CHANNEL_ID || '').trim();
const config = {
  appKey: String(process.env.ALIEXPRESS_APP_KEY || '').trim(),
  appSecret: String(process.env.ALIEXPRESS_APP_SECRET || '').trim(),
  trackingId: String(process.env.ALIEXPRESS_TRACKING_ID || '').trim(),
};

if (!token || !chatId || !config.appKey || !config.appSecret || !config.trackingId) {
  throw new Error('Faltan las credenciales de Telegram o AliExpress necesarias para publicar la campaña.');
}
if (!fs.existsSync(IMAGE_FILE)) throw new Error('No se encuentra la creatividad de Choice Day.');

const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
if (posts.some((post) => post.id === CAMPAIGN_ID)) {
  console.log('La campaña Choice Day ya está publicada; no se repite.');
  process.exit(0);
}

const affiliateUrl = await generateAliExpressAffiliateLink('https://es.aliexpress.com/', config);
if (!/^https:\/\/(?:s\.click|a)\.aliexpress\.com\//iu.test(affiliateUrl)) {
  throw new Error('AliExpress no ha confirmado un enlace afiliado propio para la campaña. No se publica.');
}

const title = 'Choice Day AliExpress: Día de envío local';
const body = [
  'Del 1 de septiembre a las 00:00 al 7 de septiembre a las 23:59 (hora peninsular española).',
  '',
  'CÓDIGOS DE ENVÍO LOCAL',
  'ESFS02 · 2 € de descuento desde 18 €',
  'ESFS06 · 6 € de descuento desde 45 €',
  'ESFS12 · 12 € de descuento desde 99 €',
  'ESFS18 · 18 € de descuento desde 149 €',
  'ESFS30 · 30 € de descuento desde 239 €',
  'ESFS45 · 45 € de descuento desde 359 €',
  'ESFS60 · 60 € de descuento desde 479 €',
  '',
  'EXTRA PAGANDO CON PAYPAL',
  '8 € de descuento desde 100 €',
  '15 € de descuento desde 150 €',
  '',
  'Los cupones se aplican únicamente a productos participantes y pueden agotarse. Comprueba el descuento final antes de pagar.',
].join('\n');

const caption = [
  '<b>🔥 CHOICE DAY: DÍA DE ENVÍO LOCAL EN ALIEXPRESS</b>',
  '',
  '📅 <b>Del 1 al 7 de septiembre</b>',
  '',
  '<b>🎟 CÓDIGOS DE ENVÍO LOCAL</b>',
  '<code>ESFS02</code> · 2 € desde 18 €',
  '<code>ESFS06</code> · 6 € desde 45 €',
  '<code>ESFS12</code> · 12 € desde 99 €',
  '<code>ESFS18</code> · 18 € desde 149 €',
  '<code>ESFS30</code> · 30 € desde 239 €',
  '<code>ESFS45</code> · 45 € desde 359 €',
  '<code>ESFS60</code> · 60 € desde 479 €',
  '',
  '<b>💳 EXTRA PAYPAL</b>',
  '8 € desde 100 € · 15 € desde 150 €',
  '',
  '⚠️ Solo en productos participantes. Los cupones pueden agotarse; revisa el total antes de pagar.',
  '',
  '🪐 Más en @aldiachollos #AliExpress #Cupones #Publi',
].join('\n');

const form = new FormData();
form.set('chat_id', chatId);
form.set('caption', caption);
form.set('parse_mode', 'HTML');
form.set('photo', new Blob([fs.readFileSync(IMAGE_FILE)], { type: 'image/png' }), path.basename(IMAGE_FILE));
form.set('reply_markup', JSON.stringify({
  inline_keyboard: [[{ text: '🛍 VER PROMOCIÓN', url: affiliateUrl }]],
}));

const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
const result = await response.json().catch(() => ({}));
if (!response.ok || !result.ok) {
  throw new Error(`Telegram rechazó la campaña: ${String(result?.description || response.status).slice(0, 180)}`);
}

const record = {
  id: CAMPAIGN_ID,
  source_product_id: `campaign:${CAMPAIGN_ID}`,
  date: Number(result.result?.date) || Math.floor(Date.now() / 1000),
  title,
  body,
  image: '/images/aliexpress-choice-day-septiembre-2026.png',
  url: affiliateUrl,
  source: 'campaign',
  message_id: Number(result.result?.message_id) || 0,
};
fs.writeFileSync(POSTS_FILE, `${JSON.stringify([record, ...posts], null, 2)}\n`, 'utf8');
console.log(`Campaña publicada en Telegram con el mensaje ${record.message_id} y añadida a la web.`);
