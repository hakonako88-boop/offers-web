const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;

if (!token || !channelId) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID');
}

const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    chat_id: channelId,
    text: '✅ Prueba de conexión de ChollosAlDía\n\nEl bot está correctamente conectado y listo para publicar ofertas. Este es solo un mensaje de prueba.',
    disable_web_page_preview: true,
  }),
});

const data = await response.json().catch(() => ({}));
if (!response.ok || !data.ok) {
  throw new Error(`Telegram sendMessage failed: ${data.description || response.status}`);
}

console.log(`Telegram test message sent successfully (message ${data.result.message_id}).`);
