/**
 * Telegram webhook bridge for Chollos al Dia.
 * It verifies Telegram, then starts the existing GitHub offer pipeline.
 */
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' },
});

addEventListener('fetch', (event) => event.respondWith(handleRequest(event.request)));
addEventListener('scheduled', (event) => event.waitUntil(dispatchAutomaticScan(event.cron)));

async function githubDispatch(eventType, payload = {}) {
  const dispatch = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${GITHUB_DISPATCH_TOKEN}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'chollosaldia-telegram-webhook',
      'x-github-api-version': '2022-11-28',
    },
    body: JSON.stringify({ event_type: eventType, client_payload: payload }),
  });
  if (!dispatch.ok) throw new Error(`GitHub dispatch failed (${dispatch.status}): ${(await dispatch.text()).slice(0, 300)}`);
}

/** Runs one source at a fixed Cloudflare cron time. The four schedules are
 * deliberately separated so the channel gets a curated rhythm instead of a
 * burst of unrelated products. */
async function dispatchAutomaticScan(cron) {
  const eventType = {
    '15 7 * * *': 'automatic_amazon',
    '15 11 * * *': 'automatic_aliexpress',
    '15 15 * * *': 'automatic_amazon',
    '15 19 * * *': 'automatic_miravia',
  }[cron];
  if (!eventType) return;
  await githubDispatch(eventType, { source: 'cloudflare-cron', cron, scheduledAt: new Date().toISOString() });
}

async function handleRequest(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, service: 'chollosaldia-telegram-webhook' });
    }
    if (request.method !== 'POST' || url.pathname !== '/telegram') {
      return json({ ok: false, error: 'Not found' }, 404);
    }
    if (!TELEGRAM_WEBHOOK_SECRET || request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== TELEGRAM_WEBHOOK_SECRET) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }
    let update;
    try {
      update = await request.json();
    } catch {
      return json({ ok: false, error: 'Invalid Telegram update' }, 400);
    }
    try {
      await githubDispatch('telegram_update', { update });
    } catch (error) {
      console.error(error.message);
      return json({ ok: false, error: 'Could not start offer processing' }, 502);
    }
    return json({ ok: true });
}
