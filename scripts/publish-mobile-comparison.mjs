import fs from 'node:fs';
import guide from '../data/mobile-comparison.json' with { type: 'json' };
const file = 'data/posts.json';
const posts = JSON.parse(fs.readFileSync(file, 'utf8'));
const offers = JSON.parse(fs.readFileSync('data/offers.json', 'utf8'));
const selected = guide.products.map(p => offers.find(o => o.source_product_id === p.offerId));
if (selected.some(o => !o?.image || !/^https:\/\//u.test(o?.url || ''))) throw new Error('Faltan fichas o enlaces comerciales. No se publica.');
let post = posts.find(p => p.id === guide.id);
if (!post) {
  post = { id: guide.id, title: guide.title, body: guide.intro, date: Math.floor(Date.now()/1000), image: selected[0].image, images: selected.map(o => o.image), source: 'editorial-comparison' };
  posts.unshift(post);
}
fs.writeFileSync(file, JSON.stringify(posts,null,2)+'\n');
if (process.env.PUBLISH_TELEGRAM === 'true' && !post.message_id) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chat) throw new Error('Faltan credenciales de Telegram.');
  const url = `https://chollosaldia.com/publicacion/${guide.id}/`;
  const caption = `📱 ¿Pantalla grande o un móvil más compacto?\n\nPOCO X8 Pro frente a POCO M8 Pro 5G: comparativa para elegir sin pagar de más.\n\n✅ Pantalla, cámara, batería y carga\n✅ Ventajas y límites de cada uno\n✅ Fotos, cupones y enlaces de compra\n\nLos precios son los últimos registrados; confirma variante y total en la tienda.\n\n👉 ${url}\n\n@aldiachollos #Móviles #Publi`;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,photo:new URL(post.image,'https://chollosaldia.com').href,caption,reply_markup:{inline_keyboard:[[{text:'📱 Leer comparativa',url}]]}})});
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(`Telegram no confirmó la publicación: ${data.description || res.status}`);
  post.message_id = data.result.message_id;
  fs.writeFileSync(file,JSON.stringify(posts,null,2)+'\n');
  console.log(`Comparativa publicada. Mensaje Telegram: ${post.message_id}`);
} else console.log('Comparativa guardada; no se ha enviado otro mensaje.');
