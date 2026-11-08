import fs from 'node:fs';
import {generateAliExpressAffiliateLink} from './aliexpress-link-resolver.mjs';
import {extractProductMetadata} from './link-offer-extractor.mjs';
import {COMMUNITY_SOURCES,parseWordPressSignals} from './community-signals.mjs';
import {createDealImageCard} from './deal-image-card.mjs';
const id='1005008758211379';const source='https://nolodejesescapar.com/nintendo-switch-2/';
const offers=JSON.parse(fs.readFileSync('data/offers.json','utf8'));
const known=offers.find(row=>String(row.source_product_id)===id||String(row.url).includes(id));
if(known){console.log(`Ya publicada: ${known.message_id}; no se reenvía.`);process.exit(0);}
if(new Date().toISOString().slice(0,10)!=='2026-11-08') throw Error('Revisar la solicitud y sus condiciones antes de otro día.');
const posts=await(await fetch('https://nolodejesescapar.com/wp-json/wp/v2/posts?slug=nintendo-switch-2&_embed=1',{signal:AbortSignal.timeout(20000)})).json();
const signal=parseWordPressSignals(COMMUNITY_SOURCES.find(row=>row.id==='nolodejesescapar'),posts)[0];
if(!signal||!signal.merchantUrl.includes(id)||!(signal.price>0))throw Error('No hay una oferta exacta con precio legible.');
const sourceText=signal.sourceText;
// This owner request is the coupon + PayPal promotion; do not silently reuse
// the conditional price if either condition disappears from the source.
if(!/AEES75/.test(sourceText)||!/PayPal.*20\s*€/i.test(sourceText))throw Error('Las condiciones del cupón o PayPal han cambiado; revisar.');
const config={appKey:process.env.ALIEXPRESS_APP_KEY,appSecret:process.env.ALIEXPRESS_APP_SECRET,trackingId:process.env.ALIEXPRESS_TRACKING_ID};
if(Object.values(config).some(value=>!value))throw Error('Falta la integración de afiliación.');
const url=await generateAliExpressAffiliateLink(signal.merchantUrl,config);
if(!/^https:\/\/s\.click\.aliexpress\.com\//.test(url))throw Error('No se ha confirmado la generación del enlace de afiliado.');
const metadata=await extractProductMetadata(signal.merchantUrl);
if(!/^https:\/\/(?:ae-pic|ae01|ae04)[^/]*\./.test(metadata.imageUrl||'')||!/nintendo.*switch\s*2/i.test(metadata.title||''))throw Error('No se ha obtenido una foto y un título fiables del producto.');
const price=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(signal.price);
const title='Nintendo Switch 2 · versión europea BTR con batería extraíble';
const description=`Precio anunciado por la fuente: ${price}, condicionado al cupón AEES75 y a la promoción PayPal de 20 €. Confirma elegibilidad, compra mínima, cupos, variante BTR y total con envío en el carrito. No se ha comprobado el pago final ni se descuenta otra vez el cupón.`;
const caption=[`🎮 <b>Nintendo Switch 2 para dar el salto</b>`,'','Versión europea BTR con batería extraíble. Comprueba la opción seleccionada y la garantía del vendedor.','',`💶 <b>${price} anunciados con condiciones</b>`,'🎟 Cupón: <code>AEES75</code>','💳 La fuente indica 20 € adicionales al pagar con PayPal. Sujeto a elegibilidad y cupos.','','⚠️ Confirma el total en la cesta: no es un precio garantizado para todas las cuentas. No vuelvas a restar los descuentos.','','🪐 @aldiachollos #AliExpress #Publi'].join('\n');
const card=await createDealImageCard({imageUrl:metadata.imageUrl,store:'AliExpress',price, coupon:'AEES75 + PayPal · condicionado'});
const token=process.env.TELEGRAM_BOT_TOKEN;const chat=process.env.TELEGRAM_CHANNEL_ID;if(!token||!chat)throw Error('Falta Telegram.');
const form=new FormData();form.set('chat_id',chat);form.set('caption',caption);form.set('parse_mode','HTML');form.set('photo',new Blob([card],{type:'image/jpeg'}),'nintendo-switch-2.jpg');form.set('reply_markup',JSON.stringify({inline_keyboard:[[{text:'🎮 VER SWITCH 2 EN ALIEXPRESS',url}]]}));
const response=await fetch(`https://api.telegram.org/bot${token}/sendPhoto`,{method:'POST',body:form,signal:AbortSignal.timeout(30000)});const result=await response.json();if(!response.ok||!result.ok)throw Error(`Telegram no confirmó: ${result.description||response.status}`);
fs.mkdirSync('public/tg',{recursive:true});const image=`/tg/owner-switch-${id}.jpg`;fs.writeFileSync('public'+image,card);
offers.unshift({source_product_id:id,message_id:result.result.message_id,date:result.result.date,title,description,text:description,price,previousPrice:'',coupon:'AEES75 + promoción PayPal de 20 €; confirma condiciones',priceCondition:description,image,url,store:'AliExpress',category:'Videojuegos',source:'telegram-owner-selected',source_url:source});
fs.writeFileSync('data/offers.json',JSON.stringify(offers,null,2)+'\n');console.log(`Confirmada: https://t.me/aldiachollos/${result.result.message_id}`);
