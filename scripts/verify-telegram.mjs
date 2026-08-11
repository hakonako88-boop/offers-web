const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;

if (!token || !channelId) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID');
}

async function telegram(method, params = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description || response.status}`);
  }
  return data.result;
}

const bot = await telegram('getMe');
const member = await telegram('getChatMember', {
  chat_id: channelId,
  user_id: bot.id,
});

const allowedStatuses = new Set(['administrator', 'creator', 'owner']);
if (!allowedStatuses.has(member.status)) {
  throw new Error(`Bot @${bot.username || bot.id} is not an administrator (status: ${member.status})`);
}

console.log(`Telegram verified: @${bot.username || bot.id} is ${member.status} in ${channelId}.`);
