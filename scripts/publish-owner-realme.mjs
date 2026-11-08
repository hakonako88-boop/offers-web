import fs from 'node:fs';
import {resolveAliExpressAffiliateProduct} from './aliexpress-link-resolver.mjs';
import {extractProductMetadata} from './link-offer-extractor.mjs';
import {COMMUNITY_SOURCES,parseWordPressSignals} from './community-signals.mjs';
import {createDealImageCard} from './deal-image-card.mjs';
const statusFile='data/owner-realme-status.json';
let stage='initialization';
async function reliableFetch(input,options={}){let last;for(let attempt=0;attempt<3;attempt++){try{return await fetch(input,{...options,signal:AbortSignal.timeout(20000)})}catch(error){last=error;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1)))}}throw last;}
process.on('uncaughtException',error=>{fs.writeFileSync(statusFile,JSON.stringify({status:'failed',stage,message:String(error.message).slice(0,300)},null,2)+'\n');process.exit(1)});
const id='1005012130919755';const offers=JSON.parse(fs.readFileSync('data/offers.json','utf8'));
const known=offers.find(row=>String(row.source_product_id)===id||String(row.url).includes(id));
if(known){fs.writeFileSync(statusFile,JSON.stringify({status:'already_published',messageId:known.message_id},null,2)+'\n');process.exit(0)}
if(new Date().toISOString().slice(0,10)!=='2026-11-08')throw Error('Revisar oferta antes de otra fecha.');
const source='https://nolodejesescapar.com/realme-16/';
stage='source';
const posts=await(await reliableFetch('https://nolodejesescapar.com/wp-json/wp/v2/posts?slug=realme-16&_embed=1')).json();
const signal=parseWordPressSignals(COMMUNITY_SOURCES.find(row=>row.id==='nolodejesescapar'),posts)[0];
if(!signal||!(signal.price>0)||!/ESDE1139/.test(signal.sourceText))throw Error('Precio o cupón han cambiado; revisar.');
stage='product_photo';
let metadata;
try{metadata=await extractProductMetadata(source,{fetchImpl:reliableFetch})}catch{
 // Exact product page inspected locally on the owner's request date; never
 // substitute an image from a similar phone when GitHub cannot read the page.
 metadata={finalUrl:'https://es.aliexpress.com/item/1005012130919755.html',title:'realme 16 5G Smartphone 2026 Nuevo, Batería Titan de 6550mAh, Carga Rápida de 45W, IP69 Versión europea',imageUrl:'https://ae-pic-a1.aliexpress-media.com/kf/S753fd5efd1b14a40847c383c94705b02L.jpg'};
}
if(!metadata.finalUrl?.includes('/'+id+'.html')||!/realme\s*16/i.test(metadata.title)||!/^https:\/\/ae-pic[^/]*aliexpress-media\.com\//.test(metadata.imageUrl))throw Error('No se ha corroborado identidad o foto.');
const config={appKey:process.env.ALIEXPRESS_APP_KEY,appSecret:process.env.ALIEXPRESS_APP_SECRET,trackingId:process.env.ALIEXPRESS_TRACKING_ID};
stage='affiliate_generation';
const result=await resolveAliExpressAffiliateProduct(`https://es.aliexpress.com/item/${id}.html`,config,{sourceMetadata:{title:metadata.title,imageUrl:metadata.imageUrl}});
if(!/^https:\/\/(?:s\.click|a)\.aliexpress\.com\//.test(result.affiliateUrl||''))throw Error('La API no ha generado un enlace de afiliado para el realme exacto.');
const price=signal.price.toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const title='realme 16 5G · 6 GB + 256 GB, versión europea';
const description=`Precio anunciado por la fuente: ${price} con ESDE1139 para la variante 6/256 GB. Confirma variante europea, elegibilidad, cupos, compra mínima, envío y total en la cesta. La fuente menciona una promoción PayPal sin importe confirmado: no la restamos. No se ha comprobado el pago final.`;
const caption=[`📱 <b>realme 16 5G: batería grande para el día a día</b>`,'','6 GB + 256 GB · versión europea. Comprueba esa variante antes de pagar.','','🔋 La ficha anuncia batería de 6550 mAh y carga de 45 W.',`💶 <b>${price} anunciados con cupón</b>`,'🎟 Código: <code>ESDE1139</code>','','⚠️ Sujeto a elegibilidad, cupos y condiciones. Confirma total y envío en la cesta; no restes otra vez el cupón. No descontamos una posible promoción PayPal sin verificar su importe.','','🪐 @aldiachollos #AliExpress #Publi'].join('\n');
stage='image_card';
const card=await createDealImageCard({imageUrl:metadata.imageUrl,store:'AliExpress',price,coupon:'ESDE1139 · condicionado'});
const token=process.env.TELEGRAM_BOT_TOKEN;const chat=process.env.TELEGRAM_CHANNEL_ID;if(!token||!chat)throw Error('Falta configuración Telegram.');
const form=new FormData();form.set('chat_id',chat);form.set('caption',caption);form.set('parse_mode','HTML');form.set('photo',new Blob([card],{type:'image/jpeg'}),'realme-16.jpg');form.set('reply_markup',JSON.stringify({inline_keyboard:[[{text:'📱 VER REALME 16',url:result.affiliateUrl}]]}));
stage='telegram_send';
const response=await fetch(`https://api.telegram.org/bot${token}/sendPhoto`,{method:'POST',body:form,signal:AbortSignal.timeout(30000)});const sent=await response.json();if(!response.ok||!sent.ok)throw Error(`Telegram no confirmó: ${sent.description||response.status}`);
fs.mkdirSync('public/tg',{recursive:true});const image=`/tg/owner-realme-${id}.jpg`;fs.writeFileSync('public'+image,card);
offers.unshift({source_product_id:id,message_id:sent.result.message_id,date:sent.result.date,title,description,text:description,image,url:result.affiliateUrl,price,previousPrice:'',coupon:'ESDE1139',priceCondition:description,store:'AliExpress',category:'Tecnología',source:'telegram-owner-selected',source_url:source});
fs.writeFileSync('data/offers.json',JSON.stringify(offers,null,2)+'\n');fs.writeFileSync(statusFile,JSON.stringify({status:'published',messageId:sent.result.message_id,productId:id},null,2)+'\n');
