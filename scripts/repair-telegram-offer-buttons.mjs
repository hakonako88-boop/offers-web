import fs from 'node:fs';
import path from 'node:path';
import { offerReplyMarkup } from './offer-presentation.mjs';

const ROOT = process.cwd();
const OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const STATE_FILE = path.join(ROOT, 'data', 'telegram-button-repairs.json');
const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const channelId = String(process.env.TELEGRAM_CHANNEL_ID || '').trim();
const MAX_PER_RUN = 30;

function readJson(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; } catch { return fallback; }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function editButtons(offer) {
  const replyMarkup = offerReplyMarkup({
    id: offer.source_product_id || offer.message_id,
    url: offer.url,
    store: offer.store,
    storeSlug: offer.store,
  });
  const response = await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: channelId, message_id: offer.message_id, reply_markup: replyMarkup }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok && /message is not modified/iu.test(String(data.description || ''))) {
    return { unchanged: true };
  }
  if (!response.ok || !data.ok) throw new Error(data.description || `Telegram ${response.status}`);
  return { unchanged: false };
}

if (!token || !channelId) {
  console.log('Reparación de botones omitida: faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHANNEL_ID.');
  process.exit(0);
}

const state = readJson(STATE_FILE, { version: 1, repairedMessageIds: [] });
const repaired = new Set((state.repairedMessageIds || []).map(Number));
const offers = readJson(OFFERS_FILE, [])
  .filter((offer) => Number.isInteger(Number(offer.message_id)) && offer.url && offer.source !== 'removed')
  .sort((left, right) => Number(right.message_id) - Number(left.message_id))
  .filter((offer) => !repaired.has(Number(offer.message_id)))
  .slice(0, MAX_PER_RUN);

let updated = 0;
let unchanged = 0;
for (const offer of offers) {
  try {
    const result = await editButtons(offer);
    if (result.unchanged) unchanged += 1;
    else updated += 1;
  } catch (error) {
    // Deleted and very old messages cannot be edited. Marking them as checked
    // prevents one unavailable post from blocking every later repair run.
    console.warn(`No se pudo actualizar el mensaje ${offer.message_id}: ${error.message}`);
  }
  repaired.add(Number(offer.message_id));
  await new Promise((resolve) => setTimeout(resolve, 120));
}

writeJson(STATE_FILE, {
  version: 1,
  repairedMessageIds: [...repaired].filter(Number.isFinite).sort((a, b) => b - a).slice(0, 800),
  lastRunAt: new Date().toISOString(),
  lastUpdated: updated,
});
console.log(`Botones de Telegram reparados: ${updated}; ya correctos: ${unchanged}; revisados: ${offers.length}.`);
