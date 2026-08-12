import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'data', 'telegram-removals.json');
const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;

if (!fs.existsSync(file)) {
  console.log('No hay publicaciones pendientes de retirar.');
  process.exit(0);
}

const pending = JSON.parse(fs.readFileSync(file, 'utf8'));
const messageIds = [...new Set((pending.messageIds || []).map(Number).filter(Number.isInteger))];
if (!messageIds.length || !token || !channelId) {
  console.log('No hay retirada pendiente o falta la configuración de Telegram.');
  process.exit(0);
}

const remaining = [];
for (const messageId of messageIds) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: channelId, message_id: messageId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.description || `HTTP ${response.status}`);
    console.log(`Publicación ${messageId} retirada del canal.`);
  } catch (error) {
    remaining.push(messageId);
    console.warn(`No se pudo retirar la publicación ${messageId}: ${String(error.message || error).replaceAll(token, '[redacted]')}`);
  }
}

fs.writeFileSync(file, `${JSON.stringify({ messageIds: remaining }, null, 2)}\n`);
if (remaining.length) process.exitCode = 1;
