import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditPrice,auditRecentPublications,inspectWebPublication,inspectTelegramPublication} from '../scripts/publication-sync-audit.mjs';
import {dashboardKeyboard,formatDashboard} from '../scripts/telegram-admin-dashboard.mjs';
const url='https://chollosaldia.com/oferta/amazon-B012345678/';
const affiliate='https://www.amazon.es/dp/B012345678?tag=owner-21&ref=test';
const escaped=affiliate.replaceAll('&','&amp;');
const page=(price='24.99',extra='')=>`<link rel="canonical" href="${url}"><article data-offer-id="amazon-B012345678" data-offer-price="${price}" data-offer-state="active"><a class="offerCta" href="${escaped}">Comprar</a>${extra}</article>`;
const message=(id=42,link=escaped)=>`<div data-post="aldiachollos/${id}"><b>PRECIO OFERTA: 24,99 €</b><a href="${link}">Ver oferta</a></div>`;
test('web confirmation requires the exact canonical, saved price and affiliate link',()=>{
 assert.equal(inspectWebPublication({html:page(),url,expectedPrice:24.99,affiliateUrl:affiliate}).status,'confirmed');
 assert.equal(inspectWebPublication({html:page('19.99'),url,expectedPrice:24.99,affiliateUrl:affiliate}).status,'price-difference');
 assert.equal(inspectWebPublication({html:page().replace(escaped,'https://example.com/another'),url,expectedPrice:24.99,affiliateUrl:affiliate}).status,'link-difference');
 assert.equal(inspectWebPublication({html:page().replace(escaped,'https://example.com/another')+`<a href="${escaped}">Otra oferta relacionada</a>`,url,expectedPrice:24.99,affiliateUrl:affiliate}).status,'link-difference');
 assert.equal(inspectWebPublication({html:'<link rel="canonical" href="https://chollosaldia.com/">',url,expectedPrice:24.99,affiliateUrl:affiliate}).status,'wrong-page');
});
test('legacy public pages can be checked without deployment of the new data markers',()=>{
 const html=`<link href='${url}' rel='canonical'><div class="offerPriceBox"><span>PRECIO</span><strong>24,99 €</strong></div><a class="offerCta" href="${escaped}">Comprar</a>`;
 assert.equal(inspectWebPublication({html,url,expectedPrice:24.99,affiliateUrl:affiliate}).status,'confirmed');
 assert.equal(inspectWebPublication({html:html.replace('24,99 €','Sin precio'),url,expectedPrice:24.99,affiliateUrl:affiliate}).status,'unverified');
});
test('an archive is not confused with a live purchase link and a 404 is never success',()=>{
 assert.equal(inspectWebPublication({html:page().replace('active','expired').replace(escaped,'#'),url,expectedPrice:24.99,affiliateUrl:affiliate}).status,'archived');
 assert.equal(inspectWebPublication({status:404,offerDate:200,build:{built_at:'1970-01-01T00:00:00.100Z'}}).status,'waiting-deploy');
 assert.equal(inspectWebPublication({status:404}).status,'missing');
 assert.equal(inspectWebPublication({status:503}).status,'unverified');
});
test('Telegram matches the exact message and never borrows a button from a neighbour',()=>{
 assert.equal(inspectTelegramPublication({html:message(),messageId:42,affiliateUrl:affiliate}).status,'confirmed');
 assert.equal(inspectTelegramPublication({html:message(41)+message(42,'#')+message(43),messageId:42,affiliateUrl:affiliate}).status,'message-only');
 assert.equal(inspectTelegramPublication({html:message(41),messageId:42,affiliateUrl:affiliate}).status,'unverified');
 assert.equal(inspectTelegramPublication({html:message(),messageId:42,affiliateUrl:affiliate,expectedPrice:19.99}).status,'price-difference');
 assert.equal(inspectTelegramPublication({html:message().replace('PRECIO OFERTA: 24,99 €','Consulta condiciones'),messageId:42,affiliateUrl:affiliate,expectedPrice:24.99}).status,'message-only');
});
test('read-only audit deduplicates stable IDs, caps requests and needs no bot token',async()=>{
 const calls=[];let active=0,peak=0;
 const fetchImpl=async(input,options)=>{
  calls.push(input);assert.ok(!options.method||options.method==='GET');assert.ok(!options.headers.authorization);
  active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,1));active--;
  if(input.endsWith('web-build.json'))return {status:200,text:async()=>JSON.stringify({built_at:'2026-11-10T00:00:00Z'})};
  const id=Number(input.split('/').filter(Boolean).at(-1));
  return {status:200,text:async()=>input.startsWith('https://t.me/')?message(id):`<link rel="canonical" href="${input}"><article data-offer-id="${id}" data-offer-price="24.99"><a class="offerCta" href="${escaped}">Comprar</a></article>`};
 };
 const offers=Array.from({length:8},(_,i)=>({title:'Producto',price:'24,99 €',url:affiliate,source_product_id:String(i+1),message_id:i+1,date:i+1}));
 offers.push({...offers[7],message_id:99,date:99});
 const audit=await auditRecentPublications({offers,limit:100,fetchImpl});
 assert.equal(audit.items.length,5);assert.equal(calls.length,11);assert.ok(peak<=4);
 assert.equal(new Set(audit.items.map(item=>item.url)).size,5);
 assert.equal(audit.confirmed,5);
 assert.ok(calls.every(value=>value.startsWith('https://chollosaldia.com/')||value.startsWith('https://t.me/s/aldiachollos/')));
});
test('network errors and redirects remain unverified; no retry can send an offer',async()=>{
 const offers=[{title:'Producto',price:24.99,url:affiliate,message_id:42,date:1}];
 const audit=await auditRecentPublications({offers,fetchImpl:async()=>{throw Error('timeout');}});
 assert.equal(audit.confirmed,0);assert.equal(audit.items[0].web.status,'unverified');
 const redirected=await auditRecentPublications({offers,fetchImpl:async()=>({status:200,url:'https://example.com/',text:async()=>page()})});
 assert.equal(redirected.confirmed,0);
 const empty=await auditRecentPublications({offers:[null],fetchImpl:()=>{throw Error('must not fetch');}});assert.equal(empty.items.length,0);
});
test('panel exposes on-demand sync only inside the authorized callback and adds page markers',()=>{
 assert.ok(dashboardKeyboard({}).inline_keyboard.flat().some(button=>button.callback_data==='dashboard:sync'));
 assert.match(formatDashboard({},'sync'),/todavía no realizada/);
 const text=formatDashboard({publicationAudit:{items:[],checkedAt:new Date().toISOString(),confirmed:0}},'sync');
 assert.match(text,/Solo lectura/);assert.match(text,/no con el precio actual de la tienda/);
 const source=fs.readFileSync('scripts/process-telegram-inbox.mjs','utf8');assert.match(source,/web\|sync/);assert.match(source,/section==='sync'.*await auditRecentPublications/);
 const pageSource=fs.readFileSync('app/oferta/[id]/page.tsx','utf8');assert.match(pageSource,/data-offer-price=/);assert.match(pageSource,/data-offer-state=/);
 assert.equal(auditPrice('1.234,56 €'),1234.56);assert.equal(auditPrice('USD 1,234.56'),1234.56);assert.equal(auditPrice(''),null);
});
