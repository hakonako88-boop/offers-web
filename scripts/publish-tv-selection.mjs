import fs from 'node:fs';
import guide from '../data/tv-selection.json' with { type: 'json' };
import { couponOptions } from './coupon-options.mjs';
const file = 'data/posts.json';
const posts = JSON.parse(fs.readFileSync(file,'utf8'));
const offers = JSON.parse(fs.readFileSync('data/offers.json','utf8'));
const entries = guide.products.map(p => ({...p,offer:offers.find(o=>o.source_product_id===p.offerId)}));
for (const p of entries) if (!p.offer?.image || !/^https:\/\//u.test(p.offer?.url||'')) throw new Error(`Falta ficha completa: ${p.name}`);
const articleUrl = `https://chollosaldia.com/publicacion/${guide.id}/`;
let post = posts.find(p=>p.id===guide.id);
if (!post) {
  post = {id:guide.id,title:guide.title,body:guide.intro,date:Math.floor(Date.now()/1000),image:entries[0].offer.image,images:entries.map(p=>p.offer.image),source:'editorial-tv-selection'};
  posts.unshift(post);
}
post.image=guide.images[entries[0].offerId].local;
post.images=entries.map(p=>guide.images[p.offerId].local);
fs.writeFileSync(file,JSON.stringify(posts,null,2)+'\n');
if(process.env.PUBLISH_TELEGRAM==='true' && !post.message_id) {
  let available = false;
  // Pages activation follows the web build; wait without posting a broken link.
  for(let attempt=0;attempt<30;attempt++) {
    const live=await fetch(`${articleUrl}?revision=tv-${Date.now()}`).catch(()=>null);
    if(live?.ok && (await live.text()).includes('tvGuideCards')) { available=true; break; }
    console.log(`Esperando activación de la guía: ${attempt+1}/30`);
    await new Promise(resolve=>setTimeout(resolve,30000));
  }
  if(!available) throw new Error('La guía aún no está disponible en la web. No se envía Telegram.');
  const token=process.env.TELEGRAM_BOT_TOKEN, chat=process.env.TELEGRAM_CHANNEL_ID;
  if(!token||!chat) throw new Error('Faltan credenciales de Telegram.');
  const media=entries.map((p,i)=>{
    const code=couponOptions(p.offer.coupon||'').codes[0];
    return {type:'photo',media:new URL(p.offer.image,'https://chollosaldia.com').href,caption:`${i===0?'📺 TRES TELEVISORES PARA TRES USOS\n\n':''}${p.badge}\n${p.name}\n\n💶 Último precio registrado: ${p.offer.price}\n📺 ${p.size} · ${p.panel}\n⚡ ${p.refresh} · ${p.system}\n${code?`🎟 Código publicado: ${code} (no lo restes otra vez)\n`:''}\n${p.verdict}\n\n🛒 Consultar oferta:\n${p.offer.url}\n\n📖 Comparativa y condiciones:\n${articleUrl}\n\nConfirma variante, cupón y total en tienda. #Publi @aldiachollos`};
  });
  if(media.some(m=>m.caption.length>1024)) throw new Error('Texto de álbum demasiado largo.');
  const res=await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,media})});
  const data=await res.json();
  if(!res.ok||!data.ok) throw new Error(`Telegram no confirmó el álbum: ${data.description||res.status}`);
  post.message_id=data.result[0].message_id;
  post.message_ids=data.result.map(m=>m.message_id);
  fs.writeFileSync(file,JSON.stringify(posts,null,2)+'\n');
  console.log(`Álbum confirmado: ${post.message_ids.join(', ')}`);
} else console.log('Guía guardada; no se ha enviado otro álbum.');
if(process.env.PUBLISH_TELEGRAM==='true' && post.message_ids?.length===3 && post.image_revision!=='official-v1') {
  const token=process.env.TELEGRAM_BOT_TOKEN, chat=process.env.TELEGRAM_CHANNEL_ID;
  if(!token||!chat) throw new Error('Faltan credenciales para actualizar fotos.');
  for(let i=0;i<entries.length;i++) {
    const p=entries[i], code=couponOptions(p.offer.coupon||'').codes[0];
    const caption=`${i===0?'📺 TRES TELEVISORES PARA TRES USOS\n\n':''}${p.badge}\n${p.name}\n\n💶 Último precio registrado: ${p.offer.price}\n📺 ${p.size} · ${p.panel}\n⚡ ${p.refresh} · ${p.system}\n${code?`🎟 Código publicado: ${code} (no lo restes otra vez)\n`:''}\n${p.verdict}\n\n🛒 Consultar oferta:\n${p.offer.url}\n\n📖 Comparativa y condiciones:\n${articleUrl}\n\nConfirma variante, cupón y total en tienda. #Publi @aldiachollos`;
    const media={type:'photo',media:guide.images[p.offerId].official,caption};
    const res=await fetch(`https://api.telegram.org/bot${token}/editMessageMedia`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,message_id:post.message_ids[i],media})});
    const result=await res.json();
    if(!result.ok && !String(result.description||'').includes('message is not modified')) throw new Error(`No se confirmó la foto ${i+1}: ${result.description||res.status}`);
  }
  post.image_revision='official-v1';
  fs.writeFileSync(file,JSON.stringify(posts,null,2)+'\n');
  console.log('Tres fotos oficiales actualizadas en el álbum existente.');
}
