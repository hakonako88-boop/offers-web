import fs from 'node:fs';
import { tvCollageCaption } from './tv-collage-caption.mjs';
import guide from '../data/tv-selection.json' with {type:'json'};
const file='data/posts.json';
const posts=JSON.parse(fs.readFileSync(file,'utf8'));
const offers=JSON.parse(fs.readFileSync('data/offers.json','utf8'));
const post=posts.find(p=>p.id===guide.id);
if(!post) throw new Error('No existe la guía de televisores.');
post.image=guide.collage; post.images=[guide.collage];
fs.writeFileSync(file,JSON.stringify(posts,null,2)+'\n');
if(post.collage_message_id && post.collage_revision==='per-product-links-v3') {console.log(`Enlaces individuales ya actualizados: ${post.collage_message_id}`);process.exit(0);}
if(process.env.PUBLISH_TELEGRAM!=='true') {console.log('Resumen visual guardado, sin envío.');process.exit(0);}
const token=process.env.TELEGRAM_BOT_TOKEN, chat=process.env.TELEGRAM_CHANNEL_ID;
if(!token||!chat) throw new Error('Faltan credenciales de Telegram.');
const entries=guide.products.map(p=>({...p,offer:offers.find(o=>o.source_product_id===p.offerId)}));
if(entries.some(p=>!p.offer?.url)) throw new Error('Faltan enlaces comerciales.');
const caption=tvCollageCaption(entries,guide.id);
// Remove the previous grouped buttons: each URL now belongs to its own block.
const keyboard={inline_keyboard:[]};
const form=new FormData();
form.set('chat_id',chat);form.set('reply_markup',JSON.stringify(keyboard));
if(post.collage_message_id) {
  form.set('message_id',String(post.collage_message_id));
  form.set('media',JSON.stringify({type:'photo',media:'attach://photo',caption}));
} else form.set('caption',caption);
form.set('photo',new Blob([fs.readFileSync(`public${guide.collage}`)],{type:'image/png'}),'comparativa-tv.png');
const method=post.collage_message_id?'editMessageMedia':'sendPhoto';
const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',body:form});
const result=await response.json();
if(!response.ok||!result.ok) throw new Error(`No se confirmó la imagen única: ${result.description||response.status}`);
post.collage_message_id=result.result.message_id;
post.collage_revision='per-product-links-v3';
fs.writeFileSync(file,JSON.stringify(posts,null,2)+'\n');
console.log(`Imagen única confirmada: ${post.collage_message_id}`);
