const token = process.env.TELEGRAM_BOT_TOKEN;
const url = process.env.TELEGRAM_WEBHOOK_URL;
const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token || !url || !secretToken) {
  throw new Error('Telegram webhook configuration is incomplete.');
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    url,
    secret_token: secretToken,
    // Inline keyboard presses arrive as callback_query updates. Keeping this
    // list explicit avoids unrelated update types while allowing every offer
    // preview button to reach the inbox processor.
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: false,
  }),
});
const result = await response.json().catch(() => ({}));
if (!response.ok || !result.ok) {
  throw new Error(`Telegram could not configure the webhook: ${result.description || response.status}`);
}

const commandsResponse = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    commands: [
      { command: 'oferta', description: 'Publicar una oferta completa con foto y datos' },
      { command: 'post', description: 'Publicar una foto y texto en Telegram y web' },
      { command: 'ayuda', description: 'Ver cómo enviar ofertas y publicaciones' },
      { command: 'start', description: 'Abrir la ayuda del bot' },
    ],
  }),
});
const commandsResult = await commandsResponse.json().catch(() => ({}));
if (!commandsResponse.ok || !commandsResult.ok) {
  throw new Error(`Telegram could not configure the command menu: ${commandsResult.description || commandsResponse.status}`);
}

console.log('Telegram webhook and command menu configured successfully.');
