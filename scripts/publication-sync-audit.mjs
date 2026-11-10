import {publicOfferUrl} from './offer-presentation.mjs';

const SITE='https://chollosaldia.com';
const CHANNEL='aldiachollos';
function character(number){return number>=0&&number<=0x10ffff?String.fromCodePoint(number):'�';}
function decode(value='') {
 return String(value).replace(/&#x([0-9a-f]+);/gi,(_,n)=>character(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>character(Number(n))).replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
export function auditPrice(value) {
 if(typeof value==='number') return Number.isFinite(value)?value:null;
 const text=String(value||'').replace(/[^\d,.-]/g,'');
 if(!text) return null;
 const normalized=text.includes(',')?(text.lastIndexOf(',')>text.lastIndexOf('.')?text.replace(/\./g,'').replace(',','.'):text.replace(/,/g,'')):text;
 const number=Number(normalized);
 return Number.isFinite(number)?number:null;
}
const samePrice=(left,right)=>left!==null&&right!==null&&Math.abs(left-right)<0.005;
function attributes(tag='') {
 return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map(match=>[match[1].toLowerCase(),decode(match[3])]));
}
function hrefs(html){return [...html.matchAll(/<a\b[^>]*>/gi)].map(match=>attributes(match[0]).href).filter(Boolean);}
function sameUrl(left,right){try{const a=new URL(left),b=new URL(right);a.hash='';b.hash='';return a.href===b.href;}catch{return false;}}
export function inspectWebPublication({html='',status=200,url,expectedPrice,affiliateUrl,offerDate,build}={}) {
 if(status===404){const waiting=Boolean(build?.built_at&&Date.parse(build.built_at)<offerDate);return {status:waiting?'waiting-deploy':'missing',label:waiting?'No encontrada · despliegue anterior a la oferta':'Ficha no encontrada'};}
 if(status!==200) return {status:'unverified',label:status?`Web no comprobada · HTTP ${status}`:'Sin respuesta verificable de la web'};
 const links=[...html.matchAll(/<link\b[^>]*>/gi)].map(match=>attributes(match[0]));
 const canonical=links.find(link=>link.rel?.split(/\s/).includes('canonical'))?.href;
 if(!sameUrl(canonical,url)) return {status:'wrong-page',label:'La URL no confirma la ficha esperada'};
 const article=[...html.matchAll(/<article\b[^>]*>/gi)].map(match=>attributes(match[0])).find(attr=>attr['data-offer-id']);
 if(article&&article['data-offer-id']!==decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).at(-1))) return {status:'wrong-page',label:'El identificador de la ficha no coincide'};
 const visibleBox=html.match(/class=["']offerPriceBox["'][^>]*>([\s\S]*?)<\/strong>/i)?.[1];
 const rawPrice=article?.['data-offer-price']??(visibleBox?decode(visibleBox.replace(/<[^>]+>/g,' ')).match(/([\d.,]+)\s*€/)?.[1]:undefined);
 const actualPrice=auditPrice(rawPrice);
 if(actualPrice===null) return {status:'unverified',label:'Ficha encontrada; precio no comprobado'};
 if(!samePrice(actualPrice,expectedPrice)) return {status:'price-difference',label:'El precio de la web difiere del guardado',actualPrice};
 const expired=article?.['data-offer-state']==='expired'||/class=["']expiredNotice["']/.test(html);
 if(expired) return {status:'archived',label:'Ficha encontrada · oferta finalizada',actualPrice};
 const purchaseLinks=[...html.matchAll(/<a\b[^>]*>/gi)].map(match=>attributes(match[0])).filter(attr=>attr.class?.split(/\s+/).includes('offerCta')).map(attr=>attr.href);
 if(!purchaseLinks.some(href=>sameUrl(href,affiliateUrl))) return {status:'link-difference',label:'Enlace de compra distinto o no encontrado',actualPrice};
 return {status:'confirmed',label:'Ficha, precio guardado y enlace coinciden',actualPrice};
}
export function inspectTelegramPublication({html='',status=200,messageId,affiliateUrl,expectedPrice}={}) {
 if(status!==200) return {status:'unverified',label:status?`Telegram no comprobado · HTTP ${status}`:'Sin respuesta verificable de Telegram'};
 const marker=`data-post="${CHANNEL}/${messageId}"`;
 const start=html.indexOf(marker);
 if(start<0) return {status:'unverified',label:'Mensaje no confirmado en la vista pública'};
 const next=html.indexOf('data-post=',start+marker.length);
 const block=html.slice(start,next<0?undefined:next);
 if(!hrefs(block).some(href=>sameUrl(href,affiliateUrl))) return {status:'message-only',label:'Mensaje encontrado; botón de compra no confirmado'};
 if(expectedPrice!==undefined){
  const text=decode(block.replace(/<[^>]+>/g,' '));
  const price=auditPrice(text.match(/\b(?:precio\s+oferta|precio\s+final|ahora|precio)\s*:?\s*(?:desde\s*)?([0-9][\d.,]*)\s*€/iu)?.[1]);
  if(price===null)return {status:'message-only',label:'Mensaje y enlace encontrados; precio no comprobado'};
  if(!samePrice(price,expectedPrice))return {status:'price-difference',label:'El precio de Telegram difiere del guardado',actualPrice:price};
  return {status:'confirmed',label:'Mensaje, precio guardado y enlace coinciden',actualPrice:price};
 }
 return {status:'confirmed',label:'Mensaje y enlace de compra encontrados'};
}
async function readPublic(url,fetchImpl) {
 try {
  const response=await fetchImpl(url,{headers:{'user-agent':'ChollosAlDiaPublicationAudit/1.0','cache-control':'no-cache'},signal:AbortSignal.timeout(6500),redirect:'follow'});
  if(response.url&&new URL(response.url).hostname!==new URL(url).hostname) return {status:0,error:'Redirección fuera del servicio esperado'};
  const html=await response.text();
  return html.length>3_000_000?{status:0,error:'Respuesta demasiado grande para comprobarla'}:{status:response.status,html};
 } catch{return {status:0,error:'Sin respuesta verificable del servicio'};}
}
export async function auditRecentPublications({offers=[],fetchImpl=fetch,now=new Date(),limit=5}={}) {
 const max=Math.max(1,Math.min(5,Number(limit)||5));
 const candidates=[...(Array.isArray(offers)?offers:[])].filter(offer=>offer&&Number.isSafeInteger(Number(offer.message_id))&&Number(offer.message_id)>0&&offer.title&&offer.url&&auditPrice(offer.price)>0).sort((a,b)=>Number(b.date)-Number(a.date));
 const selected=[];const seen=new Set();
 for(const offer of candidates){const id=offer.chollometroId||offer.source_product_id||offer.message_id;const url=publicOfferUrl(id,SITE);if(url.length>350||seen.has(url))continue;seen.add(url);selected.push({offer,url});if(selected.length===max)break;}
 if(!selected.length) return {checkedAt:now.toISOString(),build:null,items:[],confirmed:0};
 const manifestResponse=await readPublic(`${SITE}/web-build.json`,fetchImpl);
 let build=null;
 if(manifestResponse.status===200){try{const parsed=JSON.parse(manifestResponse.html);if(parsed?.built_at)build={built_at:parsed.built_at,source_sha:parsed.source_sha};}catch{/* Invalid data is not proof of a deployed build. */}}
 const items=[];
 // At most four simultaneous public reads; no bot token or merchant API.
 for(let index=0;index<selected.length;index+=2){
  const batch=await Promise.all(selected.slice(index,index+2).map(async({offer,url})=>{
   const telegramUrl=`https://t.me/s/${CHANNEL}/${Number(offer.message_id)}`;
   const [webPage,telegramPage]=await Promise.all([readPublic(url,fetchImpl),readPublic(telegramUrl,fetchImpl)]);
   const timestamp=Number(offer.date);
   return {id:String(offer.source_product_id||offer.message_id),messageId:Number(offer.message_id),title:String(offer.title),url,telegramUrl,telegram:inspectTelegramPublication({...telegramPage,messageId:offer.message_id,affiliateUrl:offer.url,expectedPrice:auditPrice(offer.price)}),web:inspectWebPublication({...webPage,url,expectedPrice:auditPrice(offer.price),affiliateUrl:offer.url,offerDate:timestamp>10_000_000_000?timestamp:timestamp*1000,build})};
  }));
  items.push(...batch);
 }
 return {checkedAt:now.toISOString(),build,items,confirmed:items.filter(item=>item.telegram.status==='confirmed'&&['confirmed','archived'].includes(item.web.status)).length};
}
