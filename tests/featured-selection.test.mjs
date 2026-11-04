import test from 'node:test';
import assert from 'node:assert/strict';
import { selectFeaturedOffers, editorialReason } from '../scripts/editorial-selection.mjs';
import { buildDailySummary } from '../scripts/publish-daily-summary.mjs';
const now=new Date('2026-11-04T12:00:00Z');
const deal=(id,store='Amazon')=>({id,title:'Robot aspirador Cecotec con estación automática',active:true,store,price:199,oldPrice:299,category:'Hogar',categoryConfidence:1,imageUrl:'/robot.jpg',affiliateUrl:'https://example.com/'+id,verifiedDate:now.toISOString()});
test('featured inventory excludes stale, tiny savings and duplicate products',()=>{
  const chosen=selectFeaturedOffers([deal('a'),deal('a'),deal('b','Miravia'),{...deal('old'),verifiedDate:'2026-10-01T12:00:00Z'},{...deal('tiny'),price:46.9,oldPrice:46.95}],now);
  assert.deepEqual(chosen.map(d=>d.id),['a','b']);
  assert.ok(chosen.every(d=>d.editorialReason.includes('100,00')));
  assert.equal(selectFeaturedOffers([],now).length,0);
});
test('reason states published saving, never an unobserved historic low',()=>{
  assert.match(editorialReason(deal('a')),/precio anterior publicado/);
  assert.doesNotMatch(editorialReason(deal('a')),/mínimo|mejor del mercado/);
});
test('three summary items have reasons, a single coupon, and a caption under Telegram limit',()=>{
  const offers=Array.from({length:5},(_,i)=>({title:'Robot aspirador de prueba con una descripción muy larga '.repeat(8),price:'199,00 €',previousPrice:'299,00 €',coupon:'ESD1123 / AEES23 / CASHBACK',store:'AliExpress',source_product_id:String(i),url:'https://example.com/'+i,image:'/robot.jpg'}));
  const summary=buildDailySummary(offers,'2026-11-04');
  assert.equal(summary.album.length,3);
  assert.match(summary.telegram,/Ahorras/);
  assert.ok(!summary.telegram.includes(' / '));
  const plain=summary.telegram.replace(/<[^>]*>/gu,'').replace(/&(?:amp|lt|gt|quot);/gu,'x');
  assert.ok(plain.length<=1024,plain.length);
  assert.ok(summary.album.every(p=>p.caption.includes('💡')));
  assert.ok(summary.post.body.includes('Por qué entra en la selección'));
  assert.ok(summary.post.body.includes('Alternativas: AEES23'));
  assert.ok(!summary.post.body.includes('Necesita el cupón ESD1123 /'));
});
