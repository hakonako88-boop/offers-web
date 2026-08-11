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
    allowed_updates: ['message'],
    drop_pending_updates: false,
  }),
});
const result = await response.json().catch(() => ({}));
if (!response.ok || !result.ok) {
  throw new Error(`Telegram could not configure the webhook: ${result.description || response.status}`);
}

console.log('Telegram webhook configured successfully.');
