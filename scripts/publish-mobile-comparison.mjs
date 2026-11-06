import fs from 'node:fs';
import guide from '../data/mobile-comparison.json' with { type: 'json' };
import { mobileCaption, mobileSummary } from './mobile-comparison-content.mjs';
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
post.title = guide.title;
post.body = guide.intro;
post.reviewed = guide.reviewed;
post.image = selected[0].image;
post.images = selected.map(offer=>offer.image);
fs.writeFileSync(file, JSON.stringify(posts,null,2)+'\n');
if (process.env.PUBLISH_TELEGRAM === 'true' && post.telegram_reviewed !== guide.reviewed) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chat) throw new Error('Faltan credenciales de Telegram.');
  const url = `https://chollosaldia.com/publicacion/${guide.id}/`;
  const live = await fetch(url, {signal:AbortSignal.timeout(20000)});
  if (!live.ok) throw new Error('La comparativa no está accesible en la web; no se envía un enlace roto.');
  const media = guide.products.map((product,index) => ({type:'photo',media:new URL(selected[index].image,'https://chollosaldia.com').href,caption:mobileCaption(product,selected[index],url)}));
  if (media.some(item=>item.caption.length>1024)) throw new Error('La descripción supera el límite seguro del álbum.');
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,media}),signal:AbortSignal.timeout(30000)});
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(`Telegram no confirmó la publicación: ${data.description || res.status}`);
  post.message_id = data.result[0].message_id;
  post.telegram_message_ids = data.result.map(message=>message.message_id);
  post.telegram_reviewed = guide.reviewed;
  fs.writeFileSync(file,JSON.stringify(posts,null,2)+'\n');
  console.log(`Comparativa publicada. Mensaje Telegram: ${post.message_id}`);
} else console.log('Comparativa guardada; no se ha enviado otro mensaje.');
// Album captions are not all visible in the normal channel view. Send a
// standalone readable comparison once per review, without resending photos.
if (process.env.PUBLISH_TELEGRAM === 'true') {
  const stateFile = 'data/mobile-publication-state.json';
  const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile,'utf8')) : {};
  if (state.textReviewed !== guide.reviewed) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHANNEL_ID;
    if (!token || !chat) throw new Error('Faltan credenciales de Telegram.');
    const url = `https://chollosaldia.com/publicacion/${guide.id}/`;
    const text = mobileSummary(guide,selected,url);
    if (text.length > 4096) throw new Error('Comparativa demasiado larga para un mensaje.');
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chat,text,link_preview_options:{is_disabled:true},reply_markup:{inline_keyboard:[[{text:'📱 Leer comparativa completa',url}]]}}),signal:AbortSignal.timeout(30000)});
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(`Telegram no confirmó el texto: ${result.description || response.status}`);
    fs.writeFileSync(stateFile,JSON.stringify({textReviewed:guide.reviewed,messageId:result.result.message_id},null,2)+'\n');
    console.log(`Texto independiente publicado: ${result.result.message_id}`);
  } else console.log('El texto de esta revisión ya está publicado.');
}
