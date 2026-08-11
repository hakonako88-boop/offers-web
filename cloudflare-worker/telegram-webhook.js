/**
 * Telegram webhook bridge for Chollos al Dia.
 * It verifies Telegram, then starts the existing GitHub offer pipeline.
 */
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, service: 'chollosaldia-telegram-webhook' });
    }
    if (request.method !== 'POST' || url.pathname !== '/telegram') {
      return json({ ok: false, error: 'Not found' }, 404);
    }
    if (!env.TELEGRAM_WEBHOOK_SECRET || request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_WEBHOOK_SECRET) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }
    let update;
    try {
      update = await request.json();
    } catch {
      return json({ ok: false, error: 'Invalid Telegram update' }, 400);
    }
    const dispatch = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'user-agent': 'chollosaldia-telegram-webhook',
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify({ event_type: 'telegram_update', client_payload: { update } }),
    });
    if (!dispatch.ok) {
      console.error(`GitHub dispatch failed (${dispatch.status}): ${(await dispatch.text()).slice(0, 300)}`);
      return json({ ok: false, error: 'Could not start offer processing' }, 502);
    }
    return json({ ok: true });
  },
};
