/**
 * Telegram webhook bridge for Chollos al Dia.
 * It verifies Telegram, then starts the existing GitHub offer pipeline.
 */
/* global GITHUB_OWNER, GITHUB_REPO, GITHUB_DISPATCH_TOKEN, TELEGRAM_WEBHOOK_SECRET */
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' },
});
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

addEventListener('fetch', (event) => event.respondWith(handleRequest(event.request)));
addEventListener('scheduled', (event) => event.waitUntil(dispatchAutomaticScan(event.cron)));

async function githubDispatch(eventType, payload = {}) {
  let latestError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
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
      if (dispatch.ok) return;
      const detail = (await dispatch.text()).slice(0, 300);
      latestError = new Error(`GitHub dispatch failed (${dispatch.status}): ${detail}`);
      // Bad authentication and invalid payloads never improve by retrying.
      if (dispatch.status >= 400 && dispatch.status < 500 && dispatch.status !== 429) break;
    } catch (error) {
      latestError = error;
    }
    // GitHub may occasionally return a short-lived 5xx/429. A small bounded
    // retry prevents a valid Telegram update from appearing to be ignored.
    if (attempt < 2) await sleep(300 * (attempt + 1));
  }
  throw latestError || new Error('GitHub dispatch failed without a response.');
}

/** Cloudflare is the reliable clock for source monitoring and the nightly
 * Madrid summary. It starts the
 * lightweight GitHub watcher; only when that watcher finds a genuinely new
 * merchant post does it launch the slower publication pipeline. GitHub's own
 * schedule remains as a fallback, but it is not trusted as the primary clock. */
async function dispatchAutomaticScan(cron) {
  if (cron === '*/10 * * * *') {
    await githubDispatch('source_poll', {
      source: 'cloudflare-cron',
      cron,
      scheduledAt: new Date().toISOString(),
    });
    return;
  }
  // Madrid changes between UTC+1 and UTC+2. Trigger both possible UTC
  // midnights; publish-daily-summary.mjs checks Europe/Madrid and only the
  // correct invocation publishes. Its state also prevents duplicates.
  if (cron === '0 22,23 * * *') {
    await githubDispatch('daily_summary', {
      source: 'cloudflare-cron',
      cron,
      scheduledAt: new Date().toISOString(),
    });
  }
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
