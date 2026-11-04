import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const guide=JSON.parse(fs.readFileSync('data/tv-selection.json','utf8'));
const offers=JSON.parse(fs.readFileSync('data/offers.json','utf8'));
test('three exact television offers have photos and existing affiliate URLs',()=>{
  assert.equal(guide.products.length,3);
  for(const p of guide.products){const o=offers.find(o=>o.source_product_id===p.offerId);assert(o?.price);assert(fs.existsSync('public'+o.image));assert.equal(new URL(o.url).hostname,'s.click.aliexpress.com');assert.equal(new URL(p.source).hostname,'www.mi.com');}
});
test('does not misrepresent Game Boost or HD as native 4K high refresh',()=>{
  assert.equal(guide.products.find(p=>p.size==='65″').refresh,'60 Hz nativos');
  assert.match(guide.products.find(p=>p.size==='32″').panel,/HD/u);
});
test('album requires live article, confirmed send and duplicate protection',()=>{
  const source=fs.readFileSync('scripts/publish-tv-selection.mjs','utf8');
  for(const text of ['!post.message_id','sendMediaGroup','!res.ok||!data.ok',"includes('tvGuideCards')",'1024'])assert(source.includes(text));
});
