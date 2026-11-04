import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { tvCollageCaption } from '../scripts/tv-collage-caption.mjs';
const guide=JSON.parse(fs.readFileSync('data/tv-selection.json','utf8'));
test('Telegram collage is square instead of a tall poster',async()=>{
  const image=await sharp(`public${guide.collage}`).metadata();
  assert.equal(image.width,image.height);
  assert(image.width>=1000);
});
test('update existing message, preserve affiliate URLs and include model in buttons',()=>{
  const source=fs.readFileSync('scripts/publish-tv-collage.mjs','utf8');
  assert(source.includes("'editMessageMedia':'sendPhoto'"));
  assert(source.includes('tvCollageCaption(entries,guide.id)'));
  assert(source.includes('inline_keyboard:[]'));
  assert(source.includes("post.collage_revision='per-product-links-v3'"));
});
test('each real affiliate link is inside the block for its exact model',()=>{
  const offers=JSON.parse(fs.readFileSync('data/offers.json','utf8'));
  const entries=guide.products.map(p=>({...p,offer:offers.find(o=>o.source_product_id===p.offerId)}));
  const caption=tvCollageCaption(entries,guide.id);
  assert(caption.length<=1024);
  entries.forEach((p,index)=>{
    const start=caption.indexOf(p.name);
    const end=index+1<entries.length?caption.indexOf(entries[index+1].name):caption.indexOf('📖');
    const block=caption.slice(start,end);
    assert(block.includes(p.offer.url));
    assert.equal(block.split('https://').length-1,1);
  });
});
