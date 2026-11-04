import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const guide=JSON.parse(fs.readFileSync('data/tv-selection.json','utf8'));
test('Telegram collage is square instead of a tall poster',async()=>{
  const image=await sharp(`public${guide.collage}`).metadata();
  assert.equal(image.width,image.height);
  assert(image.width>=1000);
});
test('update existing message, preserve affiliate URLs and include model in buttons',()=>{
  const source=fs.readFileSync('scripts/publish-tv-collage.mjs','utf8');
  assert(source.includes("'editMessageMedia':'sendPhoto'"));
  assert(source.includes('${p.name} · ${p.offer.price}'));
  assert(source.includes('url:p.offer.url'));
  assert(source.includes("post.collage_revision='square-models-v2'"));
  assert(source.includes('caption.length>1024'));
});
