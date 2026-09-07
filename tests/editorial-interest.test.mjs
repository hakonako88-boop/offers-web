import test from 'node:test';
import assert from 'node:assert/strict';
import { automaticInterest, selectInterestingOffers } from '../scripts/editorial-interest.mjs';

test('automatic discovery excludes backpacks even with a large source score', () => {
  const source = [{ title: 'Nike Mochila Academy', score: 2000 }, { title: 'SONIC mochila con ruedas', score: 3000 }, { title: 'Cafetera espresso', score: 40 }];
  assert.deepEqual(selectInterestingOffers(source).map(x => x.title), ['Cafetera espresso']);
  assert.equal(source.length, 3);
});
test('useful products outrank generic fashion without suppressing other legitimate offers', () => {
  assert.deepEqual(selectInterestingOffers([{title:'Camiseta',score:2000},{title:'SSD 1TB',score:40}]).map(x=>x.title), ['SSD 1TB','Camiseta']);
  assert.ok(automaticInterest({title:'Auriculares inalámbricos'}) > 0);
  assert.equal(automaticInterest({title:'Backpack impermeable'}), -1);
});
