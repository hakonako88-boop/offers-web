import test from 'node:test';
import assert from 'node:assert/strict';
import { automaticInterest, interestFamily, selectInterestingOffers } from '../scripts/editorial-interest.mjs';

test('automatic discovery excludes backpacks even with a large source score', () => {
  const source = [{ title: 'Nike Mochila Academy', score: 2000 }, { title: 'SONIC mochila con ruedas', score: 3000 }, { title: 'Cafetera espresso', score: 40 }];
  assert.deepEqual(selectInterestingOffers(source).map(x => x.title), ['Cafetera espresso']);
  assert.equal(source.length, 3);
});

test('fans and vacuum variants are prioritised above generic clothing', () => {
  for (const title of ['Ventilador de techo', 'Ventiladores silenciosos', 'Aspiradora Xiaomi', 'Robot aspirador', 'Robot Vacuum ILIFE', 'Aspiradoras sin cable']) {
    assert.equal(automaticInterest({title}), 2, title);
  }
  assert.equal(interestFamily({title:'Aspiradora Xiaomi'}), 'limpieza');
});

test('automatic batches give different useful product families a turn', () => {
  const input = [{title:'Aspiradora A',score:100}, {title:'Aspirador B',score:90}, {title:'Ventilador techo',score:50}, {title:'Camiseta',score:2000}];
  assert.deepEqual(selectInterestingOffers(input).map(x=>x.title), ['Aspiradora A','Ventilador techo','Aspirador B','Camiseta']);
  assert.equal(input[1].title, 'Aspirador B');
});
test('useful products outrank generic fashion without suppressing other legitimate offers', () => {
  assert.deepEqual(selectInterestingOffers([{title:'Camiseta',score:2000},{title:'SSD 1TB',score:40}]).map(x=>x.title), ['SSD 1TB','Camiseta']);
  assert.ok(automaticInterest({title:'Auriculares inalámbricos'}) > 0);
  assert.equal(automaticInterest({title:'Backpack impermeable'}), -1);
});
