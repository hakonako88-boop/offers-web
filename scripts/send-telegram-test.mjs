const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;
const statusFile = new URL('../data/telegram-test-status.json', import.meta.url);

const status = {
  checkedAt: new Date().toISOString(),
  configured: Boolean(token && channelId),
  sent: false,
};

function safeError(error) {
  return String(error?.message || error || 'Unknown error').replaceAll(token || '', '[redacted]');
}

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `HTTP ${response.status}`);
  }
  return data.result;
}

if (!token || !channelId) {
  status.error = 'Missing Telegram configuration.';
} else {
  try {
    const bot = await telegram('getMe', {});
    status.bot = bot.username ? `@${bot.username}` : 'configured';

    const membership = await telegram('getChatMember', {
      chat_id: channelId,
      user_id: bot.id,
    });
    status.membership = membership.status;
    status.canPostMessages = membership.can_post_messages !== false;

    const message = await telegram('sendMessage', {
      chat_id: channelId,
      text: '✅ Prueba de conexión de ChollosAlDía\n\nEl bot está correctamente conectado y listo para publicar ofertas. Este es solo un mensaje de prueba.',
      disable_web_page_preview: true,
    });
    status.sent = true;
    status.messageId = message.message_id;
  } catch (error) {
    status.error = safeError(error);
  }
}

await (await import('node:fs/promises')).writeFile(statusFile, `${JSON.stringify(status, null, 2)}\n`);
console.log(JSON.stringify(status));
