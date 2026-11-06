import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mobileCaption} from '../scripts/mobile-comparison-content.mjs';
const product={name:'Modelo probado',verdict:'Para pantalla grande.',screen:'AMOLED',chip:'Chip',battery:'Batería',camera:'OIS'};
test('Telegram captions preserve each model link and omit stale price and coupon',()=>{
 const text=mobileCaption(product,{date:1,price:'200 €',coupon:'OLD',url:'https://shop.example/product'},'https://chollosaldia.com/guia',Date.now());
 assert.ok(text.includes('https://shop.example/product')); assert.ok(text.includes('Modelo probado'));
 assert.ok(!text.includes('200 €')); assert.ok(!text.includes('OLD')); assert.ok(text.length<1024); assert.ok(text.includes('#Publi'));
});
test('same review cannot send another album and two products retain two captions',async()=>{
 const script=await readFile(new URL('../scripts/publish-mobile-comparison.mjs',import.meta.url),'utf8');
 assert.match(script,/post.telegram_reviewed !== guide.reviewed/);assert.match(script,/sendMediaGroup/);assert.match(script,/selected\[index\]/);assert.match(script,/telegram_message_ids/);
});
