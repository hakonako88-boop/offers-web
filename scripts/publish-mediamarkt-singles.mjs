import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { TRADEDOUBLER_MEDIAMARKT, isOwnedTradeDoublerMediaMarktLink } from './tradedoubler-mediamarkt.mjs';

export const ID = 'mediamarkt-singles-day-2026-22-carrito';
export const expires = Date.parse('2026-11-12T08:00:00Z');
export function affiliateUrl() {
  const url = new URL('https://clk.tradedoubler.com/click');
  url.search = new URLSearchParams({ a: TRADEDOUBLER_MEDIAMARKT.publisherSiteId, p: TRADEDOUBLER_MEDIAMARKT.programId, url: 'https://www.mediamarkt.es/es/campaign/singles-days' }).toString();
  if (!isOwnedTradeDoublerMediaMarktLink(url.href)) throw new Error('Afiliación MediaMarkt no válida');
  return url.href;
}
export function caption() {
  return [
    '💥 <b>Singles Day en MediaMarkt: −22% en el carrito</b>', '',
    '📺 Tecnología y hogar: descuento extra en <b>artículos seleccionados</b>. No se aplica a toda la tienda.', '',
    '📱 <b>App:</b> acceso anticipado el 10/11, de 15:00 a 20:00.',
    '🌐 <b>Web y app:</b> del 10/11 a las 20:00 hasta el <b>12/11 a las 09:00</b>. Hora peninsular.', '',
    '🛒 Añade un producto participante y <b>comprueba el −22% en el carrito</b> antes de pagar.', '',
    '⚠️ Península y Baleares. Vendido y enviado por MediaMarkt. No acumulable. Excluye Apple, Beats, consolas, DJI, Siemens y otros artículos; consulta las condiciones.', '',
    '👇 <b>ABRIR PROMOCIÓN</b>',
    '💚 @aldiachollos · #MediaMarkt #Publi',
  ].join('\n');
}
export function buildPost(message = {}) {
  return {
    id: ID, source_product_id: `campaign:${ID}`, date: message.date || Math.floor(Date.now() / 1000),
    title: 'Singles Day MediaMarkt: 22% de descuento en carrito en artículos seleccionados',
    image: `/images/${ID}.png`, url: affiliateUrl(), source: 'campaign', message_id: message.message_id || 0,
    body: [
      'El Singles Day de MediaMarkt ofrece un 22% de descuento en el carrito en una selección de artículos de tecnología y hogar. No es un descuento para toda la tienda. Promoción contrastada en la página oficial de MediaMarkt el 10 de noviembre de 2026.',
      'Fechas y horarios',
      'Acceso anticipado en la app el 10 de noviembre de 15:00 a 20:00. Web y app desde el 10 de noviembre a las 20:00 hasta el 12 de noviembre a las 09:00. Todos los horarios son peninsulares.',
      'Cómo aprovechar el descuento',
      'Abre la promoción, selecciona un artículo participante y añádelo al carrito. Comprueba que aparezca la reducción del 22% y revisa el total con envío antes de confirmar el pago. No lo descontamos dos veces de un precio que ya lo tenga aplicado.',
      'Condiciones y exclusiones',
      'Para consumidores finales de Península y Baleares y productos vendidos y enviados por MediaMarkt. No acumulable con otras promociones. Excluye una selección de artículos de Semanas Black II, Apple, Beats, consolas, DJI, Siemens, gafas VR y con IA, libros, tarjetas prepago, lanzamientos, servicios, garantías y productos digitales. Las condiciones mostradas por MediaMarkt al comprar prevalecen.',
      'Antes de comprar',
      'Compara el modelo exacto con otras tiendas. La pertenencia a una categoría no garantiza que participe. Este anuncio no acredita mínimos históricos ni garantiza existencias. Al terminar el plazo, no debe considerarse una promoción activa.',
    ].join('\n\n'),
  };
}
export async function renderImage() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#073c35"/><stop offset="1" stop-color="#092b28"/></linearGradient></defs>
  <rect width="1200" height="1200" fill="url(#g)"/>
  <circle cx="1140" cy="510" r="400" fill="#145248" opacity=".7"/>
  <g font-family="Arial, sans-serif"><text x="80" y="100" fill="#fff" font-size="39" font-weight="700">CHOLLOS<tspan fill="#ff782a"> AL DÍA</tspan></text>
  <rect x="80" y="160" width="330" height="72" rx="18" fill="#df0025"/><text x="245" y="210" fill="white" text-anchor="middle" font-size="40" font-weight="700">MediaMarkt</text>
  <text x="80" y="335" fill="white" font-size="83" font-weight="800">SINGLES DAY</text>
  <rect x="65" y="385" width="1070" height="350" rx="44" fill="#ff681f"/>
  <text x="600" y="655" fill="white" font-size="294" font-weight="900" text-anchor="middle">−22%</text>
  <text x="600" y="812" fill="white" font-size="59" font-weight="700" text-anchor="middle">EN EL CARRITO</text>
  <text x="600" y="878" fill="#cce9df" font-size="35" text-anchor="middle">Solo en artículos seleccionados</text>
  <rect x="80" y="937" width="1040" height="109" rx="24" fill="#f1f8f4"/>
  <text x="600" y="1005" fill="#073c35" font-size="43" font-weight="700" text-anchor="middle">Hasta el 12/11 · 09:00 h</text>
  <text x="600" y="1100" fill="#cce9df" font-size="27" text-anchor="middle">Web desde el 10/11 a las 20:00 · Antes, acceso en app</text>
  <text x="600" y="1152" fill="#ff9c62" font-size="27" text-anchor="middle">@aldiachollos · Condiciones en la publicación · #Publi</text></g></svg>`;
  const file = `public/images/${ID}.png`;
  fs.mkdirSync('public/images', { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(file);
  return file;
}
async function main() {
  const imageFile = await renderImage();
  if (process.argv.includes('--render')) return console.log(imageFile);
  const postsFile = 'data/posts.json';
  const stateFile = 'data/mediamarkt-singles-publication.json';
  const posts = JSON.parse(fs.readFileSync(postsFile, 'utf8'));
  if (posts.some(p => p.id === ID) || fs.existsSync(stateFile)) return console.log('Campaña ya registrada; no se reenvía.');
  if (Date.now() >= expires || Date.now() < Date.parse('2026-11-10T14:00:00Z')) throw new Error('Fuera del plazo de campaña.');
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chat) throw new Error('Falta configuración de Telegram.');
  const form = new FormData();
  form.set('chat_id', chat); form.set('parse_mode', 'HTML'); form.set('caption', caption());
  form.set('photo', new Blob([fs.readFileSync(imageFile)], { type: 'image/png' }), `${ID}.png`);
  form.set('reply_markup', JSON.stringify({ inline_keyboard: [[{ text: '🛒 ABRIR PROMOCIÓN · MEDIAMARKT', url: affiliateUrl() }]] }));
  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(`Telegram: ${data.description || response.status}`);
  const record = buildPost(data.result);
  fs.writeFileSync(stateFile, `${JSON.stringify({ record }, null, 2)}\n`);
  fs.writeFileSync(postsFile, `${JSON.stringify([record, ...posts], null, 2)}\n`);
  console.log(`Campaña publicada: mensaje ${record.message_id}`);
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();
