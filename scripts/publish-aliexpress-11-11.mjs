import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateAliExpressAffiliateLink } from './aliexpress-link-resolver.mjs';
import { ALIEXPRESS_11_COUPONS, ALIEXPRESS_11_GUIDE_ID } from './aliexpress-11-11-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CAMPAIGN_ID = ALIEXPRESS_11_GUIDE_ID;
export const COUPONS_11 = ALIEXPRESS_11_COUPONS.map(({ code, alternative, discount, minimum }) => [`${code} / ${alternative}`, discount, minimum]);

export function campaignCaption() {
  return [
    '<b>🧡 11.11 ALIEXPRESS · CUPONES</b>', '',
    '📅 <b>1–18 noviembre 2026</b> · España', '',
    ...COUPONS_11.map(([code, discount, minimum], index) => `${index === 3 ? '\n' : ''}<b>${discount} €</b> desde <b>${minimum} €</b> · <code>${code.split(' / ')[0]}</code>`), '',
    '<b>⚠️ SOLO 1–3 y 11–12 NOVIEMBRE</b>',
    '<b>100 €</b> desde <b>500 €</b> · <code>ESD11100</code>',
    '<b>120 €</b> desde <b>600 €</b> · <code>ESD11120</code>', '',
    'Elige un código. No se suman entre sí. Sujetos a disponibilidad y productos elegibles. Confirma el total en el carrito. Extras personales o de PayPal: solo si aparecen en tu cuenta.', '',
    '👇 Guía visual y códigos alternativos en el botón.',
    '@aldiachollos #AliExpress #Publi',
  ].join('\n');
}

export function buildCampaignPost(affiliateUrl, message = {}, now = new Date()) {
  return {
    id: CAMPAIGN_ID, source_product_id: `campaign:${CAMPAIGN_ID}`,
    date: Number(message.date) || Math.floor(now.getTime() / 1000),
    title: '11.11 AliExpress 2026: cupones, fechas y cómo conseguir el mejor precio final',
    image: '/images/aliexpress-11-11-2026.png', url: affiliateUrl,
    source: 'campaign', message_id: Number(message.message_id) || 0,
    body: [
      'El 11.11 de AliExpress ya tiene campaña anunciada para España del 1 al 18 de noviembre de 2026. En esta guía reunimos los códigos publicados por tramos y un método para comparar el total de la compra. No presentamos cada descuento como un mínimo histórico ni damos por hecho que todos los productos participen.',
      'Cómo elegir el cupón según tu carrito',
      'Usa un solo código, el de mayor descuento cuyo mínimo cumpla tu pedido elegible. Los códigos alternativos de la misma fila son opciones, no descuentos acumulables. Estas condiciones han sido contrastadas con la información publicada de la campaña; no garantizamos que cada cuenta conserve disponibilidad en el momento de comprar.',
      COUPONS_11.map(([code, discount, minimum]) => `${discount} € de descuento desde ${minimum} € de compra · ${code}`).join('\n'),
      'Antes de usar los códigos de mayor importe',
      'ESD11100: 100 € desde 500 € de compra.\nESD11120: 120 € desde 600 € de compra.\nEstos dos códigos están anunciados únicamente para los días 1–3 y 11–12 de noviembre de 2026. No los damos por disponibles durante toda la campaña. Si el carrito los rechaza, comprueba el día, el mínimo y los productos participantes.',
      'Cómo calcular lo que realmente vas a pagar',
      'Ejemplo ilustrativo, no oferta de un producto: un carrito elegible de 80 € podría quedarse en 68 € con un cupón de 12 €, antes de posibles gastos de envío. Primero confirma el subtotal elegible; después aplica el código y comprueba el importe que AliExpress pide pagar. No restes un cupón otra vez si la oferta ya muestra el precio con ese código aplicado.',
      'Cómo tratar PayPal y las ventajas personales',
      'No sumamos un ahorro adicional de PayPal, monedas, bienvenida o ventajas de una cuenta sin verlo aplicado. Puede depender del usuario, del vendedor, de un cupo de usos o del medio de pago. Una oferta que necesita una ventaja personalizada debe anunciarse como precio condicionado, no como precio disponible para todos.',
      'Nuestra selección: qué merece la pena comparar',
      'Busca productos que ya necesites: pequeños electrodomésticos y limpieza, herramientas útiles, móviles con variante y garantía identificables o packs de alimentación con precio por unidad claro. Compara el modelo exacto, las unidades incluidas y el coste de envío. No añadimos productos innecesarios solo para llegar al mínimo de un cupón.',
      'Consejos para detectar un buen chollo',
      'Compara el precio final con otras tiendas, no solo el porcentaje tachado. Revisa las valoraciones y el vendedor. Comprueba el envío y las devoluciones. Guarda una captura del total y de las condiciones si vas a comprar. No afirmamos que un descuento sea un mínimo histórico sin un registro independiente que lo demuestre.',
      'Antes de comprar',
      'Las condiciones anunciadas se refieren a pedidos enviados a España. Puede haber restricciones por producto, incompatibilidades con otras promociones, límites por usuario o códigos agotados. Los productos virtuales pueden estar excluidos. Las condiciones de AliExpress en la pantalla de pago prevalecen: si no aparece el descuento esperado, no compres dando por hecho que se aplicará después.',
      'Información contrastada el 2 de noviembre de 2026. Referencias: Xataka Selección, «Cupones de descuento de hasta 120 euros… empieza el 11.11 de AliExpress» (1 de noviembre), y Nintendúo, «Todos los códigos del 11.11 de AliExpress y cómo usarlos» (1 de noviembre). La aceptación de los códigos solo puede confirmarse en el carrito de una cuenta elegible. Esta es una guía independiente de Chollos al Día, no un comunicado oficial de AliExpress.',
    ].join('\n\n'),
  };
}

async function main() {
  const postsFile = path.join(ROOT, 'data/posts.json');
  const stateFile = path.join(ROOT, 'data/aliexpress-11-11-publication.json');
  const posts = JSON.parse(fs.readFileSync(postsFile, 'utf8'));
  if (process.env.UPDATE_11_11_TELEGRAM_CAPTION === 'true') {
    const existing = posts.find((post) => post.id === CAMPAIGN_ID);
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHANNEL_ID;
    if (!existing?.message_id || !existing?.url || !token || !chatId) throw new Error('No se puede localizar y editar el mensaje existente; no se crea otro.');
    const response = await fetch(`https://api.telegram.org/bot${token}/editMessageCaption`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: existing.message_id, caption: campaignCaption(), parse_mode: 'HTML', reply_markup: { inline_keyboard: [
        [{ text: '🛍 ABRIR ALIEXPRESS', url: existing.url }],
        [{ text: '🎟 GUÍA VISUAL Y CUPONES', url: `https://chollosaldia.com/publicacion/${CAMPAIGN_ID}/` }],
      ] } }),
    });
    const result = await response.json();
    if ((!response.ok || !result.ok) && !/message is not modified/iu.test(result.description || '')) throw new Error(`No se pudo editar la guía de Telegram: ${result.description || response.status}`);
    console.log(`Formato de Telegram actualizado sin reenviar: ${existing.message_id}`);
    return;
  }
  if (posts.some((post) => post.id === CAMPAIGN_ID)) return console.log('La guía 11.11 ya está publicada; no se repite.');
  // A saved acknowledgement also protects a retry after a failed Git push.
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (state.record?.message_id) {
      fs.writeFileSync(postsFile, JSON.stringify([state.record, ...posts], null, 2) + '\n');
      return console.log(`Recuperada la publicación 11.11 existente: ${state.record.message_id}`);
    }
  }
  if (new Date() > new Date('2026-11-18T22:59:59Z')) throw new Error('Campaña finalizada: no se envía una promoción caducada.');
  const config = { appKey: process.env.ALIEXPRESS_APP_KEY, appSecret: process.env.ALIEXPRESS_APP_SECRET, trackingId: process.env.ALIEXPRESS_TRACKING_ID };
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chatId || Object.values(config).some((value) => !value)) throw new Error('Faltan credenciales; no se publica.');
  const affiliateUrl = await generateAliExpressAffiliateLink('https://es.aliexpress.com/', config);
  if (!/^https:\/\/(?:s\.click|a)\.aliexpress\.com\//iu.test(affiliateUrl || '')) throw new Error('La API no ha confirmado tu enlace afiliado; no se publica.');
  const imageFile = path.join(ROOT, 'public/images/aliexpress-11-11-2026.png');
  const form = new FormData();
  form.set('chat_id', chatId); form.set('parse_mode', 'HTML'); form.set('caption', campaignCaption());
  form.set('photo', new Blob([fs.readFileSync(imageFile)], { type: 'image/png' }), 'aliexpress-11-11-2026.png');
  form.set('reply_markup', JSON.stringify({ inline_keyboard: [
    [{ text: '🛍 ABRIR ALIEXPRESS', url: affiliateUrl }],
    [{ text: '📖 GUÍA Y CUPONES', url: `https://chollosaldia.com/publicacion/${CAMPAIGN_ID}/` }],
  ] }));
  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`Telegram no publicó la guía: ${result.description || response.status}`);
  const record = buildCampaignPost(affiliateUrl, result.result);
  fs.writeFileSync(stateFile, JSON.stringify({ record }, null, 2) + '\n');
  fs.writeFileSync(postsFile, JSON.stringify([record, ...posts], null, 2) + '\n');
  console.log(`11.11 publicado en Telegram: ${record.message_id}; guía guardada para la web.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
