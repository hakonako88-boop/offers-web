import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTelegramDealCard } from '../scripts/offer-presentation.mjs';

test('caption has a single price and a distinct copyable coupon block',()=>{
 const caption=formatTelegramDealCard({title:'Robot aspirador de prueba',store:'AliExpress',price:'199,99 €',previousPrice:'299,99 €',savings:'100,00 €',coupon:'AHORRA20',discount:33});
 assert.equal(caption.split('199,99 €').length-1,1);
 assert.equal(caption.split('100,00 €').length-1,1);
 assert.match(caption,/\n\n🎟️ Cupón: <code>AHORRA20<\/code>/);
 assert.match(caption,/#Publi/);
});
test('long escaped content never cuts an HTML tag or exceeds the photo caption budget',()=>{
 const caption=formatTelegramDealCard({title:'A & <modelo> '.repeat(100),store:'Amazon',price:'19,99 €',description:'Descripción & <real> '.repeat(150),coupon:['UNO','DOS','TRES'].join(' / '),highlight:'Detalle '.repeat(100)});
 assert.ok(caption.length<=1024);
 for(const tag of ['b','code','s']) assert.equal((caption.match(new RegExp(`<${tag}>`,'g'))||[]).length,(caption.match(new RegExp(`</${tag}>`,'g'))||[]).length);
 assert.ok(caption.endsWith('#Publi'));
});
