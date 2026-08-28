/**
 * Telegram webhook bridge for Chollos al Dia.
 * It verifies Telegram, then starts the existing GitHub offer pipeline.
 */
/* global GITHUB_OWNER, GITHUB_REPO, GITHUB_DISPATCH_TOKEN, TELEGRAM_WEBHOOK_SECRET, TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_SANDBOX_CLIENT_KEY, TIKTOK_SANDBOX_CLIENT_SECRET, TIKTOK_ACTIVE_MODE, TIKTOK_ADMIN_SECRET, TIKTOK_CONNECT_TOKEN, TIKTOK_AUTH */
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' },
});
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const TIKTOK_REDIRECT_URI = 'https://chollosaldia-telegram.peitolerito.workers.dev/tiktok/oauth/callback';
const TIKTOK_SCOPES = 'user.info.basic,video.upload,video.publish';
const TIKTOK_CONNECT_COMPLETE_KEY = 'tiktok:connect-complete';

function tikTokMode() {
  return typeof TIKTOK_ACTIVE_MODE !== 'undefined' && TIKTOK_ACTIVE_MODE === 'sandbox'
    ? 'sandbox'
    : 'production';
}

function tikTokCredentials() {
  if (tikTokMode() === 'sandbox') {
    if (typeof TIKTOK_SANDBOX_CLIENT_KEY === 'undefined'
      || typeof TIKTOK_SANDBOX_CLIENT_SECRET === 'undefined'
      || !TIKTOK_SANDBOX_CLIENT_KEY
      || !TIKTOK_SANDBOX_CLIENT_SECRET) {
      throw new Error('TikTok Sandbox credentials are not configured');
    }
    return {
      clientKey: TIKTOK_SANDBOX_CLIENT_KEY,
      clientSecret: TIKTOK_SANDBOX_CLIENT_SECRET,
    };
  }
  return {
    clientKey: TIKTOK_CLIENT_KEY,
    clientSecret: TIKTOK_CLIENT_SECRET,
  };
}

function tikTokTokenKey() {
  return `tiktok:${tikTokMode()}:authorized-user`;
}

function tikTokOAuthStateKey(state) {
  return `tiktok:${tikTokMode()}:oauth-state:${state}`;
}

const html = (value, status = 200, extraHeaders = {}) => new Response(value, {
  status,
  headers: {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extraHeaders,
  },
});

async function safeEqual(left = '', right = '') {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(String(left))),
    crypto.subtle.digest('SHA-256', encoder.encode(String(right))),
  ]);
  return crypto.subtle.timingSafeEqual(leftHash, rightHash);
}

async function isTikTokAdmin(request) {
  return Boolean(TIKTOK_ADMIN_SECRET)
    && await safeEqual(request.headers.get('X-Chollos-Admin-Secret') || '', TIKTOK_ADMIN_SECRET);
}

function randomToken() {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}`.replaceAll('-', '');
}

function publicError(error, fallback = 'TikTok request failed') {
  const message = String(error?.message || fallback).replace(/act\.[\w.-]+|rft\.[\w.-]+/g, '[token]');
  return message.slice(0, 300);
}

async function readTikTokToken() {
  return TIKTOK_AUTH.get(tikTokTokenKey(), { type: 'json' });
}

async function writeTikTokToken(token) {
  const now = Date.now();
  await TIKTOK_AUTH.put(tikTokTokenKey(), JSON.stringify({
    ...token,
    obtained_at: now,
    expires_at: now + Math.max(0, Number(token.expires_in || 0) - 120) * 1000,
    refresh_expires_at: now + Math.max(0, Number(token.refresh_expires_in || 0) - 3600) * 1000,
  }));
}

async function exchangeTikTokToken(parameters) {
  const credentials = tikTokCredentials();
  const body = new URLSearchParams({
    client_key: credentials.clientKey,
    client_secret: credentials.clientSecret,
    ...parameters,
  });
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'cache-control': 'no-cache',
    },
    body,
  });
  const payload = await response.json();
  if (!response.ok || !payload?.access_token || !payload?.refresh_token) {
    throw new Error(payload?.error_description || payload?.error || `TikTok token error (${response.status})`);
  }
  await writeTikTokToken(payload);
  return payload;
}

async function validTikTokToken() {
  const token = await readTikTokToken();
  if (!token?.access_token || !token?.refresh_token) throw new Error('TikTok is not connected');
  if (Number(token.refresh_expires_at || 0) <= Date.now()) throw new Error('TikTok authorization has expired');
  if (Number(token.expires_at || 0) > Date.now()) return token;
  return exchangeTikTokToken({
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token,
  });
}

async function tiktokApi(path, token, body) {
  const response = await fetch(`https://open.tiktokapis.com${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token.access_token}`,
      'content-type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(body || {}),
  });
  const payload = await response.json();
  if (!response.ok || (payload?.error?.code && payload.error.code !== 'ok')) {
    throw new Error(payload?.error?.message || payload?.error?.code || `TikTok API error (${response.status})`);
  }
  return payload.data || {};
}

async function startTikTokOAuth(request) {
  if (!(await isTikTokAdmin(request))) return json({ ok: false, error: 'Unauthorized' }, 401);
  const credentials = tikTokCredentials();
  const state = randomToken();
  await TIKTOK_AUTH.put(tikTokOAuthStateKey(state), '1', { expirationTtl: 600 });
  const authorize = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authorize.search = new URLSearchParams({
    client_key: credentials.clientKey,
    response_type: 'code',
    scope: TIKTOK_SCOPES,
    redirect_uri: TIKTOK_REDIRECT_URI,
    state,
    disable_auto_auth: '1',
  }).toString();
  return json({ ok: true, authorize_url: authorize.toString() });
}

function tikTokConnectPage() {
  return html(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><title>Conectar TikTok con ChollosAlDía</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#0f172a;color:#fff}.box{max-width:34rem;padding:2rem;border-radius:1rem;background:#1e293b}p{line-height:1.55}.error{color:#fca5a5}</style></head>
<body><main class="box"><h1>Conectando TikTok…</h1><p id="status">Preparando la autorización segura.</p></main>
<script>
(async()=>{const status=document.getElementById('status');const token=location.hash.slice(1);history.replaceState(null,'',location.pathname);
if(!token){status.className='error';status.textContent='El enlace privado no contiene el token de conexión.';return;}
try{const response=await fetch('/tiktok/oauth/direct',{method:'POST',headers:{'X-Chollos-Connect-Token':token}});const data=await response.json();
if(!response.ok||!data.authorize_url)throw new Error(data.error||'No se pudo iniciar la conexión');location.replace(data.authorize_url);
}catch(error){status.className='error';status.textContent=error.message||'No se pudo iniciar la conexión';}})();
</script></body></html>`, 200, {
    'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'referrer-policy': 'no-referrer',
  });
}

async function startDirectTikTokOAuth(request) {
  if (typeof TIKTOK_CONNECT_TOKEN === 'undefined' || !TIKTOK_CONNECT_TOKEN) {
    return json({ ok: false, error: 'Direct connection is not configured' }, 503);
  }
  if (await TIKTOK_AUTH.get(TIKTOK_CONNECT_COMPLETE_KEY)) {
    return json({ ok: false, error: 'This private connection link has already been used' }, 410);
  }
  const supplied = request.headers.get('X-Chollos-Connect-Token') || '';
  if (!(await safeEqual(supplied, TIKTOK_CONNECT_TOKEN))) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }
  const credentials = tikTokCredentials();
  const state = randomToken();
  await TIKTOK_AUTH.put(tikTokOAuthStateKey(state), '1', { expirationTtl: 600 });
  const authorize = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authorize.search = new URLSearchParams({
    client_key: credentials.clientKey,
    response_type: 'code',
    scope: TIKTOK_SCOPES,
    redirect_uri: TIKTOK_REDIRECT_URI,
    state,
    disable_auto_auth: '1',
  }).toString();
  return json({ ok: true, authorize_url: authorize.toString() });
}

async function finishTikTokOAuth(url) {
  const error = url.searchParams.get('error');
  if (error) return html(`<h1>No se autorizó TikTok</h1><p>${String(url.searchParams.get('error_description') || error).replace(/[<>]/g, '')}</p>`, 400);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  if (!code || !state || !(await TIKTOK_AUTH.get(tikTokOAuthStateKey(state)))) {
    return html('<h1>Enlace de autorización no válido o caducado</h1><p>Vuelve a iniciar la conexión desde Rocky.</p>', 400);
  }
  await TIKTOK_AUTH.delete(tikTokOAuthStateKey(state));
  try {
    const token = await exchangeTikTokToken({
      code,
      grant_type: 'authorization_code',
      redirect_uri: TIKTOK_REDIRECT_URI,
    });
    const granted = String(token.scope || '').split(',').map((item) => item.trim());
    const required = TIKTOK_SCOPES.split(',');
    const missing = required.filter((scope) => !granted.includes(scope));
    if (missing.length) {
      return html(`<h1>TikTok conectado parcialmente</h1><p>Faltan permisos: ${missing.join(', ')}</p>`, 409);
    }
    await TIKTOK_AUTH.put(TIKTOK_CONNECT_COMPLETE_KEY, '1');
    return html('<h1>✅ TikTok conectado con Rocky</h1><p>La autorización se ha guardado de forma cifrada en Cloudflare. Ya puedes cerrar esta pestaña.</p>');
  } catch (tokenError) {
    return html(`<h1>No se pudo terminar la conexión</h1><p>${publicError(tokenError)}</p>`, 502);
  }
}

async function tiktokStatus(request) {
  if (!(await isTikTokAdmin(request))) return json({ ok: false, error: 'Unauthorized' }, 401);
  const token = await readTikTokToken();
  return json({
    ok: true,
    mode: tikTokMode(),
    connected: Boolean(token?.refresh_token),
    scopes: token?.scope ? String(token.scope).split(',') : [],
    access_expires_at: token?.expires_at || null,
    refresh_expires_at: token?.refresh_expires_at || null,
  });
}

function validatePhotoPreview(input) {
  const title = String(input?.title || '').trim().slice(0, 90);
  const description = String(input?.description || '').trim().slice(0, 2000);
  const photoImages = Array.isArray(input?.photo_images) ? input.photo_images.slice(0, 10) : [];
  const validImages = photoImages.every((value) => {
    try {
      const photoUrl = new URL(value);
      return photoUrl.protocol === 'https:' && (photoUrl.hostname === 'chollosaldia.com' || photoUrl.hostname.endsWith('.chollosaldia.com'));
    } catch {
      return false;
    }
  });
  if (!title || !description || !photoImages.length || !validImages) {
    throw new Error('Title, description and verified chollosaldia.com photo URLs are required');
  }
  return {
    title,
    description,
    photo_images: photoImages,
    privacy_level: String(input?.privacy_level || 'PUBLIC_TO_EVERYONE'),
    disable_comment: Boolean(input?.disable_comment),
    auto_add_music: input?.auto_add_music !== false,
  };
}

async function createTikTokPreview(request) {
  if (!(await isTikTokAdmin(request))) return json({ ok: false, error: 'Unauthorized' }, 401);
  try {
    const offer = validatePhotoPreview(await request.json());
    const token = await validTikTokToken();
    const creator = await tiktokApi('/v2/post/publish/creator_info/query/', token, {});
    const allowedPrivacy = Array.isArray(creator.privacy_level_options) ? creator.privacy_level_options : [];
    if (!allowedPrivacy.includes(offer.privacy_level)) offer.privacy_level = allowedPrivacy[0] || 'SELF_ONLY';
    const previewId = randomToken();
    await TIKTOK_AUTH.put(`tiktok:preview:${previewId}`, JSON.stringify(offer), { expirationTtl: 900 });
    return json({
      ok: true,
      preview_id: previewId,
      expires_in: 900,
      creator: {
        username: creator.creator_username || '',
        nickname: creator.creator_nickname || '',
        avatar_url: creator.creator_avatar_url || '',
        privacy_level_options: allowedPrivacy,
        comment_disabled: Boolean(creator.comment_disabled),
        duet_disabled: Boolean(creator.duet_disabled),
        stitch_disabled: Boolean(creator.stitch_disabled),
      },
      publication: offer,
    });
  } catch (error) {
    return json({ ok: false, error: publicError(error) }, 400);
  }
}

async function publishTikTokPreview(request) {
  if (!(await isTikTokAdmin(request))) return json({ ok: false, error: 'Unauthorized' }, 401);
  try {
    const input = await request.json();
    if (input?.confirmed !== true || !input?.preview_id) throw new Error('A confirmed preview is required');
    const previewKey = `tiktok:preview:${input.preview_id}`;
    const offer = await TIKTOK_AUTH.get(previewKey, { type: 'json' });
    if (!offer) throw new Error('Preview not found or expired');
    const token = await validTikTokToken();
    const data = await tiktokApi('/v2/post/publish/content/init/', token, {
      post_info: {
        title: offer.title,
        description: offer.description,
        privacy_level: offer.privacy_level,
        disable_comment: offer.disable_comment,
        auto_add_music: offer.auto_add_music,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        photo_cover_index: 0,
        photo_images: offer.photo_images,
      },
      post_mode: 'DIRECT_POST',
      media_type: 'PHOTO',
    });
    await TIKTOK_AUTH.delete(previewKey);
    return json({ ok: true, publish_id: data.publish_id || null });
  } catch (error) {
    return json({ ok: false, error: publicError(error) }, 400);
  }
}

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
    if (request.method === 'POST' && url.pathname === '/tiktok/oauth/start') return startTikTokOAuth(request);
    if (request.method === 'GET' && url.pathname === '/tiktok/connect') return tikTokConnectPage();
    if (request.method === 'POST' && url.pathname === '/tiktok/oauth/direct') return startDirectTikTokOAuth(request);
    if (request.method === 'GET' && url.pathname === '/tiktok/oauth/callback') return finishTikTokOAuth(url);
    if (request.method === 'GET' && url.pathname === '/tiktok/status') return tiktokStatus(request);
    if (request.method === 'POST' && url.pathname === '/tiktok/preview') return createTikTokPreview(request);
    if (request.method === 'POST' && url.pathname === '/tiktok/publish/photo') return publishTikTokPreview(request);
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
