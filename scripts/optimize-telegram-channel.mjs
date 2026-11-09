import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const STATE_FILE = path.join(process.cwd(), 'data', 'telegram-channel-profile.json');
const PROFILE_VERSION = 2;
const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const chatId = String(process.env.TELEGRAM_CHANNEL_ID || '').trim();

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { version: 0 }; }
}

process.on('uncaughtException', error => {
  const message=String(error?.message || error).replaceAll(token || '[no-token]', '[redacted]');
  fs.writeFileSync(STATE_FILE,JSON.stringify({...readState(),lastAttemptAt:new Date().toISOString(),lastError:message},null,2)+'\n');
  console.error(message);
  process.exitCode=1;
});

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`${method}: ${data.description || response.status}`);
  return data.result;
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

// Only the owner's offers channel is in scope, never another group the bot manages.
const channel = await telegram('getChat', {chat_id:chatId});
if (String(channel.username || '').toLowerCase() !== 'aldiachollos' || channel.type !== 'channel') {
  throw new Error('Profile update refused: target is not the aldiachollos channel.');
}
const photo = await sharp('public/telegram-channel-avatar.svg').resize(1024,1024).jpeg({quality:95}).toBuffer();
const form = new FormData();
form.set('chat_id',chatId);
form.set('photo',new Blob([photo],{type:'image/jpeg'}),'chollosaldia-avatar.jpg');
const photoResponse=await fetch(`https://api.telegram.org/bot${token}/setChatPhoto`,{method:'POST',body:form,signal:AbortSignal.timeout(30000)});
const photoResult=await photoResponse.json();
if (!photoResponse.ok || !photoResult.ok) throw new Error(`Avatar update failed: ${photoResult.description || photoResponse.status}`);

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
fs.writeFileSync(STATE_FILE, `${JSON.stringify({ version: PROFILE_VERSION, applied: true, photoApplied:true, photoAsset:'telegram-channel-avatar.svg', reactions, appliedAt: new Date().toISOString() }, null, 2)}\n`);
console.log('Telegram channel title, description and available reactions were optimized.');
