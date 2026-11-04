import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const guide = JSON.parse(fs.readFileSync('data/mobile-comparison.json','utf8'));
const offers = JSON.parse(fs.readFileSync('data/offers.json','utf8'));
test('comparison uses exact existing offers, photos and primary sources', () => {
  assert.equal(new Set(guide.products.map(p => p.offerId)).size, guide.products.length);
  for (const product of guide.products) {
    const offer = offers.find(o => o.source_product_id === product.offerId);
    assert(offer?.url && offer?.image);
    assert(fs.existsSync(`public${offer.image}`));
    assert.equal(new URL(product.source).hostname,'www.mi.com');
    assert(product.pros.length >= 3 && product.cons.length >= 3);
  }
});
test('comparison keeps affiliate URLs and warns against subtracting coupons twice', () => {
  const source = fs.readFileSync('app/components/MobileComparison.tsx','utf8');
  assert.match(source,/href=\{p\.deal\.affiliateUrl\}/u);
  assert.match(source,/No restes el cupón otra vez/u);
  assert.match(source,/scope="col"/u);
  assert.match(source,/scope="row"/u);
});
test('publisher requires Telegram confirmation and prevents routine duplicate sends', () => {
  const source = fs.readFileSync('scripts/publish-mobile-comparison.mjs','utf8');
  assert.match(source,/!post\.message_id/u);
  assert.match(source,/!res\.ok \|\| !data\.ok/u);
  assert.match(source,/data\.result\.message_id/u);
});
