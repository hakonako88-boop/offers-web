import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const stateFile = path.join(root, 'data', 'prime-day-telegram-publication.json');
const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;
const stage = process.env.PRIME_DAY_STAGE || 'announcement';
const allowedStages = new Set(['announcement', 'launch']);
const landingUrl = 'https://chollosaldia.com/fiesta-ofertas-prime-2026/';
const amazonUrl = 'https://www.amazon.es/fiestaprime?tag=chollos00a-21';

if (!allowedStages.has(stage)) throw new Error(`Fase Prime Day no reconocida: ${stage}`);
if (!token || !channelId) throw new Error('Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHANNEL_ID.');

function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); }
  catch { return { published: {} }; }
}

function campaignCard(isLaunch) {
  const label = isLaunch ? 'YA ESTÁ AQUÍ' : 'GUÁRDALO EN EL CALENDARIO';
  const title = isLaunch ? 'EMPIEZA LA' : 'LLEGA LA';
  return Buffer.from(`<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#131a35"/><stop offset="1" stop-color="#29204b"/></linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffb343"/><stop offset="1" stop-color="#ff6558"/></linearGradient>
    </defs>
    <rect width="1200" height="1200" rx="0" fill="url(#bg)"/>
    <circle cx="1030" cy="190" r="210" fill="#ff9b48" opacity=".10"/>
    <circle cx="90" cy="1030" r="260" fill="#8177ff" opacity=".11"/>
    <path d="M95 250h1010" stroke="#fff" stroke-opacity=".13" stroke-width="2"/>
    <rect x="92" y="102" width="352" height="58" rx="29" fill="#ffffff" fill-opacity=".10"/>
    <text x="268" y="141" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="800" letter-spacing="3" fill="#ffe0ae">AMAZON ESPAÑA</text>
    <text x="102" y="348" font-family="Arial,sans-serif" font-size="32" font-weight="700" letter-spacing="4" fill="#dce2f2">${title}</text>
    <text x="94" y="472" font-family="Arial,sans-serif" font-size="100" font-weight="900" fill="#ffffff">FIESTA DE</text>
    <text x="94" y="586" font-family="Arial,sans-serif" font-size="100" font-weight="900" fill="#ffffff">OFERTAS</text>
    <text x="94" y="700" font-family="Arial,sans-serif" font-size="112" font-weight="900" fill="url(#accent)">PRIME</text>
    <rect x="94" y="760" width="1012" height="170" rx="38" fill="#ffffff" fill-opacity=".09" stroke="#ffffff" stroke-opacity=".16" stroke-width="2"/>
    <text x="600" y="830" text-anchor="middle" font-family="Arial,sans-serif" font-size="29" font-weight="700" letter-spacing="3" fill="#c8d0e5">48 HORAS · ESPAÑA</text>
    <text x="600" y="892" text-anchor="middle" font-family="Arial,sans-serif" font-size="54" font-weight="900" fill="#ffffff">6 Y 7 DE OCTUBRE</text>
    <text x="96" y="1038" font-family="Arial,sans-serif" font-size="28" font-weight="800" fill="#ffffff">CHOLLOS AL DÍA</text>
    <text x="1104" y="1038" text-anchor="end" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#aeb7cf">CHOLLOSALDIA.COM</text>
    <rect x="96" y="1072" width="1008" height="6" rx="3" fill="url(#accent)"/>
    <text x="600" y="1140" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="600" fill="#aeb7cf">${label}</text>
  </svg>`);
}

function caption(isLaunch) {
  const heading = isLaunch
    ? '🎉 <b>YA ESTÁ EN MARCHA LA FIESTA DE OFERTAS PRIME</b>'
    : '⚡ <b>SE ACERCA LA FIESTA DE OFERTAS PRIME</b>';
  const intro = isLaunch
    ? 'Amazon España ha anunciado 48 horas de ofertas para el <b>6 y 7 de octubre</b>. Estamos destacando oportunidades cuando podemos comprobar el producto, el precio y sus condiciones.'
    : 'Amazon España ha confirmado 48 horas de ofertas para el <b>6 y 7 de octubre</b>. Estamos preparando una selección de oportunidades con precio y condiciones revisados.';
  return [
    heading,
    '',
    intro,
    '',
    `👉 <a href="${landingUrl}">Ver la selección y seguir las novedades</a>`,
    `🛒 <a href="${amazonUrl}">Explorar la Fiesta Prime en Amazon</a>`,
    '',
    'ℹ️ Algunas promociones son exclusivas para clientes Prime. El precio, el stock y los cupones pueden cambiar; comprueba siempre el importe final.',
    '#publi #Amazon #PrimeDay',
  ].join('\n');
}

const state = readState();
if (state.published?.[stage]?.messageId) {
  console.log(`La fase ${stage} ya se publicó; no se repite.`);
  process.exit(0);
}

const isLaunch = stage === 'launch';
const photo = await sharp(campaignCard(isLaunch)).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
const form = new FormData();
form.set('chat_id', String(channelId));
form.set('caption', caption(isLaunch));
form.set('parse_mode', 'HTML');
form.set('photo', new Blob([photo], { type: 'image/jpeg' }), `prime-day-2026-${stage}.jpg`);
form.set('reply_markup', JSON.stringify({ inline_keyboard: [[
  { text: '⭐ VER LA SELECCIÓN', url: landingUrl },
  { text: '🛒 EVENTO AMAZON', url: amazonUrl },
]] }));

const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
const result = await response.json().catch(() => ({}));
if (!response.ok || !result.ok) throw new Error(`Telegram sendPhoto falló: ${result.description || response.status}`);

state.published ||= {};
state.published[stage] = {
  messageId: result.result.message_id,
  publishedAt: new Date().toISOString(),
  channelId: String(channelId),
};
fs.mkdirSync(path.dirname(stateFile), { recursive: true });
fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
console.log(`Campaña Prime Day ${stage} publicada en Telegram (mensaje ${result.result.message_id}).`);
