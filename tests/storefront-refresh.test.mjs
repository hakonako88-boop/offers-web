import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {editorialProductBlocks} from '../scripts/editorial-product-blocks.mjs';
import {offerBuyingNotes,priceConditionSummary} from '../scripts/offer-buying-notes.mjs';
const loadTS=async file=>import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(fs.readFileSync(file,'utf8'))).toString('base64')}`);
const {offerDisplayTitle}=await loadTS('app/lib/display-title.ts');
const {classifyProduct}=await loadTS('app/lib/taxonomy.ts');
test('natural titles retain pack quantity and size without inventing attributes',()=>{
  assert.equal(offerDisplayTitle('SOXCO 10 Pares Quarter Calcetines Hombre Trabajo Cortos WORK Socks, 43-46'),'Calcetines de trabajo SOXCO · 10 pares · tallas 43-46');
  assert.equal(offerDisplayTitle('Winrhome Ultra-Soft Flannel Fleece Blanket Coat'),'Manta Winrhome');
  assert.match(offerDisplayTitle('Xiaomi Pad 7 Global Version 11.2 Display 144Hz'),/versión global/);
});
test('classify actual category regressions before incidental keywords',()=>{
  assert.equal(classifyProduct('Gafas DJI Goggles 3 FPV Experiencia de Vuelo').category,'Tecnología');
  assert.equal(classifyProduct('SOXCO 10 pares calcetines').category,'Moda');
  assert.equal(classifyProduct('Winrhome Flannel Fleece Blanket').category,'Hogar');
  assert.equal(classifyProduct('Android 15 Tablet 10 pulgadas').category,'Informática');
});
test('four editorial products keep their own record and link even outside the homepage cap',()=>{
  const raw=JSON.parse(fs.readFileSync('data/posts.json','utf8')).find(p=>p.id==='mejores-productos-semana-2026-11-04');
  const deals=raw.offer_ids.map((id,i)=>({sourceProductId:id,id:`safe-${i}`}));
  const post={body:raw.body,offerIds:raw.offer_ids,imageUrls:raw.images,imageUrl:raw.image};
  const blocks=editorialProductBlocks(post,deals);
  assert.equal(blocks.sections.length,4);
  blocks.sections.forEach((s,i)=>assert.equal(s.deal.sourceProductId,raw.offer_ids[i]));
  assert.equal(editorialProductBlocks(post,deals.slice(1)).sections[0].deal,undefined);
  assert(!blocks.sections.flatMap(s=>s.paragraphs).join(' ').includes('ficha enlazada al final'));
});
test('buying notes distinguish known code-in-box limitations from unknown facts',()=>{
  const gta=offerBuyingNotes({title:'GTA VI PS5 reserva con código en caja',priceCondition:'CIAB sin disco',store:'Miravia'});
  assert(gta.checks.some(c=>c.includes('No incluye disco')));
  assert(gta.checks.some(c=>c.includes('región')));
  const unknown=offerBuyingNotes({title:'Producto de prueba',store:'Amazon'});
  assert.deepEqual(unknown.facts,[]);
  assert(!JSON.stringify(unknown).includes('probado'));
});
test('shared stylesheet controls equal cards, phone ordering, and minimum tap sizes',()=>{
  const css=fs.readFileSync('app/shopping-system.css','utf8');
  assert(css.includes('.dealCard:first-child h3'));
  assert(css.includes('grid-column:auto;grid-row:auto;min-height:0;height:auto'));
  assert(css.includes('.catalogueHighlights{width:100%;order:1;position:static}'));
  assert(css.includes('min-height:44px'));
  assert(css.includes('nth-child(n+3){display:none}'));
  const layout=fs.readFileSync('app/layout.tsx','utf8');
  assert(layout.indexOf('shopping-system.css')>layout.indexOf('buyer-journey.css'));
});
test('conditional price keeps the actual coupon condition; full text remains available',()=>{
  const condition='Precio condicionado: 76,63 € en ficha; 69,63 € con el cupón 11.11 de 7 €. Reserva sin disco.';
  assert.equal(priceConditionSummary(condition),'Precio condicionado: 76,63 € en ficha; 69,63 € con el cupón 11.11 de 7 €.');
  const page=fs.readFileSync('app/oferta/[id]/page.tsx','utf8');
  assert(page.includes('<details className="offerConditions">'));
  assert(page.includes('<p>{deal.priceCondition}</p></details>'));
});
test('consent does not flash before reading a stored decision',()=>{
  const component=fs.readFileSync('app/components/AnalyticsConsent.tsx','utf8');
  assert(component.includes('if (!loaded || preference !== null) return null;'));
  assert(component.includes('if (value === "granted") startAnalytics()'));
});
