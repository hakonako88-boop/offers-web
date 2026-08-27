import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, 'data', 'telegram-welcome-state.json');
const VERSION = 1;
const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const chatId = String(process.env.TELEGRAM_CHANNEL_ID || '').trim();

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}

async function telegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`Telegram ${method}: ${data.description || response.status}`);
  return data.result;
}

if (!token || !chatId) {
  console.log('Telegram welcome skipped: missing bot configuration.');
  process.exit(0);
}

const state = readState();
if (Number(state.version) >= VERSION && Number(state.messageId) > 0) {
  console.log(`Telegram welcome already published as message ${state.messageId}.`);
  process.exit(0);
}

const text = [
  '<b>👋 Bienvenido a Chollos al Día</b>',
  '',
  'Aquí encontrarás ofertas seleccionadas de <b>Amazon, AliExpress, Miravia, PcComponentes, MediaMarkt, Xiaomi y El Corte Inglés</b>.',
  '',
  '✅ Precio y descuento claros',
  '🎟 Cupones cuando están disponibles',
  '🔎 Ficha y análisis antes de comprar',
  '♻️ Control de productos repetidos',
  '',
  '<b>Cómo aprovechar el canal</b>',
  '1️⃣ Comprueba el precio, la variante y el stock.',
  '2️⃣ Copia el cupón si aparece en la publicación.',
  '3️⃣ Pulsa «VER OFERTA» para ir a la tienda.',
  '4️⃣ Comparte el chollo con quien pueda aprovecharlo.',
  '',
  '⚠️ Los precios, cupones y existencias pueden cambiar sin previo aviso.',
  '',
  '🌐 <b>Más ofertas y análisis:</b> chollosaldia.com',
].join('\n');

const message = await telegram('sendMessage', {
  chat_id: chatId,
  text,
  parse_mode: 'HTML',
  disable_web_page_preview: true,
  reply_markup: {
    inline_keyboard: [
      [{ text: '🔥 VER OFERTAS DE HOY', url: 'https://chollosaldia.com/' }],
      [{ text: '🎟 CUPONES DE ALIEXPRESS', url: 'https://chollosaldia.com/guias/cupones-aliexpress/' }],
      [{ text: '📲 COMPARTIR EL CANAL', url: 'https://t.me/share/url?url=https%3A%2F%2Ft.me%2Faldiachollos&text=Chollos%20y%20cupones%20seleccionados%20cada%20d%C3%ADa' }],
    ],
  },
});

await telegram('pinChatMessage', {
  chat_id: chatId,
  message_id: message.message_id,
  disable_notification: true,
});

fs.writeFileSync(STATE_FILE, `${JSON.stringify({
  version: VERSION,
  messageId: message.message_id,
  publishedAt: new Date().toISOString(),
  pinned: true,
}, null, 2)}\n`);
console.log(`Telegram welcome message ${message.message_id} was published and pinned.`);
