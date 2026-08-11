import assert from 'node:assert/strict';
import test from 'node:test';
import { filterDuplicateDeals, isEquivalentDeal } from '../scripts/offer-deduplication.mjs';

test('blocks catalogue variants of an offer already published', () => {
  assert.equal(isEquivalentDeal(
    { title: 'Tesosy Relleno de Cojín 35 x 55 cm Fibra Virgen Hueca Siliconada' },
    { title: 'Relleno de cojín Tesosy 35×55 cm de fibra siliconada' },
  ), true);
  assert.equal(isEquivalentDeal(
    { title: 'Alfombrilla gaming XXL Charizard' },
    { title: 'Alfombrilla gaming' },
  ), true);
});

test('keeps genuinely different products and removes duplicates in one batch', () => {
  const candidates = filterDuplicateDeals([
    { title: 'Alfombrilla gaming XXL Charizard' },
    { title: 'Alfombrilla gaming Charizard para escritorio' },
    { title: 'Auriculares inalámbricos SoundPEATS' },
  ], []);
  assert.equal(candidates.length, 2);
  assert.equal(candidates[1].title, 'Auriculares inalámbricos SoundPEATS');
});
