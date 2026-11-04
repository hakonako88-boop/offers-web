import fs from 'node:fs';
import guide from '../data/tv-selection.json' with {type:'json'};
const file='data/posts.json';
const posts=JSON.parse(fs.readFileSync(file,'utf8'));
const offers=JSON.parse(fs.readFileSync('data/offers.json','utf8'));
const post=posts.find(p=>p.id===guide.id);
if(!post) throw new Error('No existe la guía de televisores.');
post.image=guide.collage; post.images=[guide.collage];
fs.writeFileSync(file,JSON.stringify(posts,null,2)+'\n');
if(post.collage_message_id) {console.log(`Imagen única ya publicada: ${post.collage_message_id}`);process.exit(0);}
if(process.env.PUBLISH_TELEGRAM!=='true') {console.log('Resumen visual guardado, sin envío.');process.exit(0);}
const token=process.env.TELEGRAM_BOT_TOKEN, chat=process.env.TELEGRAM_CHANNEL_ID;
if(!token||!chat) throw new Error('Faltan credenciales de Telegram.');
const entries=guide.products.map(p=>({...p,offer:offers.find(o=>o.source_product_id===p.offerId)}));
if(entries.some(p=>!p.offer?.url)) throw new Error('Faltan enlaces comerciales.');
const caption=`📺 ¿QUÉ TELEVISOR ENCAJA CONTIGO?\n\nUna sola imagen con las tres opciones, nombres y precios en grande.\n\n55″ Mini LED · 4K y 144 Hz\n65″ Xiaomi F · 4K y 60 Hz nativos\n32″ Xiaomi A · HD para otra habitación\n\n📖 Características, cupones y condiciones:\nhttps://chollosaldia.com/publicacion/${guide.id}/\n\nPrecios registrados: no garantizados en tiempo real. Confirma modelo, cupón, envío y total antes de pagar.\n\n👇 Elige tu televisor en los botones\n@aldiachollos #Publi`;
const keyboard={inline_keyboard:entries.map(p=>[{text:`📺 ${p.size} · ${p.offer.price}`,url:p.offer.url}])};
const form=new FormData();
form.set('chat_id',chat);form.set('caption',caption);form.set('reply_markup',JSON.stringify(keyboard));
form.set('photo',new Blob([fs.readFileSync(`public${guide.collage}`)],{type:'image/png'}),'comparativa-tv.png');
const response=await fetch(`https://api.telegram.org/bot${token}/sendPhoto`,{method:'POST',body:form});
const result=await response.json();
if(!response.ok||!result.ok) throw new Error(`No se confirmó la imagen única: ${result.description||response.status}`);
post.collage_message_id=result.result.message_id;
fs.writeFileSync(file,JSON.stringify(posts,null,2)+'\n');
console.log(`Imagen única confirmada: ${post.collage_message_id}`);
