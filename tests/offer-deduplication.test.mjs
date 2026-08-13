import assert from 'node:assert/strict';
import test from 'node:test';
import { filterDuplicateDeals, isEquivalentDeal, isInboxDuplicate } from '../scripts/offer-deduplication.mjs';

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

test('blocks the same affiliate product even if the feed changes its title', () => {
  assert.equal(isEquivalentDeal(
    { title: 'Auriculares inalámbricos con cancelación', sourceProductId: '445566', store: 'Miravia' },
    { title: 'Cascos Bluetooth oferta especial', source_product_id: 'miravia-445566', store: 'Miravia' },
  ), true);
  assert.equal(isEquivalentDeal(
    { title: 'Ratón gaming edición negra', store: 'Miravia' },
    { title: 'Ratón gaming negro edición 2026', store: 'Miravia' },
  ), true);
});

test('never merges different known AliExpress products merely because their titles overlap', () => {
  assert.equal(isEquivalentDeal(
    {
      title: 'Ventilador de sobremesa 40 W silencioso',
      sourceProductId: 'aliexpress:1005011111111111',
      store: 'AliExpress',
    },
    {
      title: 'Ventilador de sobremesa 40 W con 3 velocidades',
      source_product_id: 'manual-2999',
      store: 'AliExpress',
    },
  ), false);
  assert.equal(isEquivalentDeal(
    { title: 'TÃ­tulo nuevo', sourceProductId: 'aliexpress:1005012222222222', store: 'AliExpress' },
    { title: 'TÃ­tulo anterior', source_product_id: '1005012222222222', store: 'AliExpress' },
  ), true);
});

test('only rejects an inbox offer when the same verified product or direct URL is present', () => {
  assert.equal(isInboxDuplicate(
    { title: 'Nuevo difusor para habitación', sourceProductId: 'aliexpress:1005012354617649', url: 'https://s.click.aliexpress.com/e/_nuevo' },
    { title: 'Difusor de aceites para habitación', source_product_id: 'manual-3000', url: 'https://s.click.aliexpress.com/e/_otro' },
  ), false);
  assert.equal(isInboxDuplicate(
    { sourceProductId: 'aliexpress:1005012354617649' },
    { source_product_id: '1005012354617649', store: 'AliExpress' },
  ), true);
  assert.equal(isInboxDuplicate(
    { url: 'https://www.amazon.es/dp/B0ABCDE123?tag=one-21' },
    { url: 'https://www.amazon.es/dp/B0ABCDE123?tag=two-21' },
  ), true);
});
