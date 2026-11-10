import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { generateAliExpressAffiliateLink } from './aliexpress-link-resolver.mjs';
export const ID = 'nintendo-switch-2-preparar-11-11-2026';
export const originals = ['https://s.click.aliexpress.com/e/_c2wOlglD', 'https://s.click.aliexpress.com/e/_c41reThN', 'https://s.click.aliexpress.com/e/_c4pkfCe7', 'https://s.click.aliexpress.com/e/_c32FAWYP'];
export async function convertLinks(config, generate = generateAliExpressAffiliateLink) {
  const results = [];
  for (const original of originals) {
    const affiliate = await generate(original, config);
    if (!/^https:\/\/(?:s\.click|a)\.aliexpress\.com\//iu.test(affiliate || '')) throw new Error(`La API no ha convertido el enlace ${results.length + 1}; no se publica ninguno con afiliación sin confirmar.`);
    results.push({ original, affiliate });
  }
  return results;
}
export function caption() {
  return [
    '🎮 <b>11.11: prepara tu Nintendo Switch 2</b> 🧡', '',
    '🛒 Cuatro enlaces para comparar antes de comprar. Añade a la cesta la variante que te interese y revisa vendedor, envío y garantía.', '',
    '🎟 Códigos para comprobar en el carrito:',
    '<code>ESD1175</code> / <code>AEES75</code>',
    'Son alternativas: <b>no se suman</b>. Sujetos a mínimo de compra, productos elegibles y disponibilidad.', '',
    '💳 Si tu cuenta muestra una promoción de PayPal o Paga en 3, revisa sus condiciones. <b>No damos por confirmados 40 € extra.</b>', '',
    '⚠️ Sin precio final verificado ni mínimo histórico acreditado. Comprueba la versión y la garantía: no están confirmadas para las cuatro opciones.', '',
    '👇 Abre cada opción con los botones.',
    '💚 @aldiachollos · #AliExpress #Publi',
  ].join('\n');
}
async function main() {
  const postsFile = 'data/posts.json', statusFile = 'data/switch-11-preview-publication.json';
  const posts = JSON.parse(fs.readFileSync(postsFile, 'utf8'));
  if (posts.some(p => p.id === ID) || (fs.existsSync(statusFile) && JSON.parse(fs.readFileSync(statusFile)).record?.message_id)) return console.log('Aviso ya publicado; no se duplica.');
  if (Date.now() < Date.parse('2026-11-10T00:00:00+01:00') || Date.now() >= Date.parse('2026-11-12T00:00:00+01:00')) throw new Error('Aviso fuera de fecha.');
  const config = { appKey: process.env.ALIEXPRESS_APP_KEY, appSecret: process.env.ALIEXPRESS_APP_SECRET, trackingId: process.env.ALIEXPRESS_TRACKING_ID };
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHANNEL_ID;
  if (Object.values(config).some(v => !v) || !token || !chat) throw new Error('Falta la integración.');
  const links = await convertLinks(config);
  fs.writeFileSync(statusFile, `${JSON.stringify({ status: 'converted', links }, null, 2)}\n`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><rect width="1200" height="1200" fill="#073c35"/><circle cx="1100" cy="250" r="350" fill="#145248"/><g font-family="Arial,sans-serif" font-weight="700"><text x="80" y="110" fill="white" font-size="44">CHOLLOS AL DÍA</text><text x="80" y="300" fill="#ff782a" font-size="160">11.11</text><text x="80" y="425" fill="white" font-size="78">NINTENDO</text><text x="80" y="535" fill="white" font-size="112">SWITCH 2</text><rect x="75" y="610" width="1050" height="230" rx="34" fill="#ff681f"/><text x="600" y="700" fill="white" font-size="55" text-anchor="middle">4 OPCIONES PARA COMPARAR</text><text x="600" y="785" fill="white" font-size="46" text-anchor="middle">Comprueba el total en la cesta</text><text x="80" y="940" fill="#cce9df" font-size="40">Cupones: ESD1175 / AEES75</text><text x="80" y="1010" fill="#cce9df" font-size="30">Alternativos · Sujetos a condiciones y disponibilidad</text><text x="80" y="1100" fill="white" font-size="29">Sin precio final ni mínimo histórico confirmados</text><text x="80" y="1160" fill="#ff9c62" font-size="30">@aldiachollos · #Publi</text></g></svg>`;
  const imageFile = `public/images/${ID}.png`;
  await sharp(Buffer.from(svg)).png().toFile(imageFile);
  const keyboard = links.map((l, i) => [{ text: i ? `🎮 SWITCH 2 · ALTERNATIVA ${i}` : '🎮 SWITCH 2 · OPCIÓN PRINCIPAL', url: l.affiliate }]);
  const form = new FormData(); form.set('chat_id', chat); form.set('parse_mode', 'HTML'); form.set('caption', caption());
  form.set('photo', new Blob([fs.readFileSync(imageFile)], { type: 'image/png' }), `${ID}.png`);
  form.set('reply_markup', JSON.stringify({ inline_keyboard: keyboard }));
  const r = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
  const data = await r.json(); if (!r.ok || !data.ok) throw new Error(`Telegram: ${data.description || r.status}`);
  const record = { id: ID, source_product_id: `campaign:${ID}`, date: data.result.date, message_id: data.result.message_id, title: 'Nintendo Switch 2 en el 11.11: cuatro opciones y cupones para comparar', image: `/images/${ID}.png`, source: 'campaign', url: links[0].affiliate, body: 'Selección de enlaces enviada por el propietario de Chollos al Día para preparar el 11.11. No es una confirmación de precio final ni de mínimo histórico. Revisa cada variante, vendedor, envío y garantía antes de comprar.\n\nCupones a comprobar: ESD1175 o AEES75. Son alternativos, no acumulables entre sí, y dependen de compra mínima, elegibilidad y disponibilidad. No descontamos ninguna ventaja de PayPal sin confirmarla en la cuenta y en el carrito.\n\nLos cuatro enlaces de compra están asociados a nuestra integración de afiliación de AliExpress.', links: links.map((l,i)=>({title:i?`Nintendo Switch 2 · alternativa ${i}`:'Nintendo Switch 2 · opción principal',url:l.affiliate})) };
  // Links are included inline too: older article renderers may ignore `links`.
  record.body += '\n\n' + record.links.map(l => `${l.title}\n${l.url}`).join('\n\n');
  fs.writeFileSync(statusFile, `${JSON.stringify({ status: 'published', record, links }, null, 2)}\n`);
  fs.writeFileSync(postsFile, `${JSON.stringify([record, ...posts], null, 2)}\n`);
  console.log(`Publicado: https://t.me/aldiachollos/${record.message_id}`);
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main().catch(error => { console.error(error.message); process.exitCode = 1; });
