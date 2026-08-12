import fs from 'node:fs';
import path from 'node:path';
import { formatTelegramDealCard } from './offer-presentation.mjs';

const root = process.cwd();
const queueFile = path.join(root, 'data', 'telegram-caption-repairs.json');
const offersFile = path.join(root, 'data', 'offers.json');
const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const channelId = String(process.env.TELEGRAM_CHANNEL_ID || '').trim();

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function parseAmount(value = '') {
  const text = String(value).replace(/\u00a0/g, '').replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
  const comma = text.lastIndexOf(',');
  const dot = text.lastIndexOf('.');
  const normalized = comma >= 0 && dot >= 0 ? (comma > dot ? text.replaceAll('.', '').replace(',', '.') : text.replaceAll(',', '')) : text.replace(',', '.');
  return Number.parseFloat(normalized) || 0;
}

function euro(value) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

if (!fs.existsSync(queueFile) || !token || !channelId) {
  console.log('No hay pies de foto pendientes de limpiar o falta la configuración de Telegram.');
  process.exit(0);
}

const queue = readJson(queueFile, { messageIds: [] });
const offers = readJson(offersFile, []);
const remaining = [];
for (const messageId of [...new Set((queue.messageIds || []).map(Number).filter(Number.isInteger))]) {
  const offer = offers.find((entry) => Number(entry.message_id) === messageId);
  if (!offer) { remaining.push(messageId); continue; }
  const price = parseAmount(offer.price);
  const oldPrice = parseAmount(offer.previousPrice);
  const savings = oldPrice > price ? euro(oldPrice - price) : '';
  const caption = formatTelegramDealCard({
    title: offer.title,
    store: offer.store,
    price: offer.price,
    previousPrice: oldPrice > price ? offer.previousPrice : '',
    savings,
    discount: oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0,
    description: '',
  });
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/editMessageCaption`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: channelId, message_id: messageId, caption, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '👉🏻 VER OFERTA', url: offer.url }]] } }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.description || `HTTP ${response.status}`);
    console.log(`Pie de foto profesional actualizado: ${messageId}.`);
  } catch (error) {
    remaining.push(messageId);
    console.warn(`No se pudo actualizar ${messageId}: ${String(error.message || error).replaceAll(token, '[redacted]')}`);
  }
}
fs.writeFileSync(queueFile, `${JSON.stringify({ messageIds: remaining }, null, 2)}\n`);
if (remaining.length) process.exitCode = 1;
