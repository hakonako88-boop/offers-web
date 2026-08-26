import fs from 'node:fs';
import path from 'node:path';

const STATE_FILE = path.join(process.cwd(), 'data', 'telegram-channel-profile.json');
const PROFILE_VERSION = 1;
const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const chatId = String(process.env.TELEGRAM_CHANNEL_ID || '').trim();

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { version: 0 }; }
}

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`${method}: ${data.description || response.status}`);
}

if (!token || !chatId) {
  console.log('Telegram profile optimization skipped: missing bot configuration.');
  process.exit(0);
}
const state = readState();
if (Number(state.version) >= PROFILE_VERSION && state.applied) {
  console.log('Telegram channel profile is already optimized.');
  process.exit(0);
}

await telegram('setChatTitle', { chat_id: chatId, title: 'Chollos al Día 🇪🇸 | Ofertas y cupones' });
await telegram('setChatDescription', {
  chat_id: chatId,
  description: '🔥 Chollos seleccionados de Amazon, AliExpress, Miravia, PcComponentes, MediaMarkt y más. 💶 Precio y descuento claros. 🎟 Cupones cuando existen. 🌐 chollosaldia.com',
});
let reactions = false;
try {
  await telegram('setChatAvailableReactions', {
    chat_id: chatId,
    available_reactions: ['🔥', '👍', '🤯'].map((emoji) => ({ type: 'emoji', emoji })),
  });
  reactions = true;
} catch (error) {
  console.warn(`Could not configure channel reactions: ${error.message}`);
}
fs.writeFileSync(STATE_FILE, `${JSON.stringify({ version: PROFILE_VERSION, applied: true, reactions, appliedAt: new Date().toISOString() }, null, 2)}\n`);
console.log('Telegram channel title, description and available reactions were optimized.');
