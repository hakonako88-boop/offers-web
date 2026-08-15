import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAmazonCaption, normalizeAmazonItem, topicsForRun } from '../scripts/amazon-offers.mjs';

const qualifyingItem = {
  asin: 'B0TESTDEAL1',
  detailPageURL: 'https://www.amazon.es/dp/B0TESTDEAL1?tag=chollos00a-21',
  images: { primary: { medium: { url: 'https://images.example.test/item.jpg' } } },
  itemInfo: { title: { displayValue: 'Auriculares inalámbricos de prueba' } },
  offersV2: {
    listings: [{
      isBuyBoxWinner: true,
      condition: { value: 'New' },
      availability: { type: 'IN_STOCK' },
      type: 'LIGHTNING_DEAL',
      price: {
        money: { amount: 39.99, displayAmount: '39,99 €' },
        savingBasis: { money: { displayAmount: '79,99 €' } },
        savings: { money: { displayAmount: '40,00 €' }, percentage: 50 },
      },
    }],
  },
};

test('keeps only real Amazon discounts with all publishable data', () => {
  const offer = normalizeAmazonItem(qualifyingItem, 'Tecnología');
  assert.equal(offer.asin, 'B0TESTDEAL1');
  assert.equal(offer.discount, 50);
  assert.match(formatAmazonCaption(offer), /CHOLLO EN AMAZON/);
  assert.match(formatAmazonCaption(offer), /Ahora: 39,99 €/);
  assert.match(formatAmazonCaption(offer), /Antes: 79,99 €/);
  assert.match(formatAmazonCaption({ ...offer, checkedAt: '2026-08-15T10:00:00.000Z' }), /Precio Amazon comprobado/);
});

test('does not publish a normal product with no deal or meaningful discount', () => {
  const ordinary = structuredClone(qualifyingItem);
  ordinary.offersV2.listings[0].type = 'NEW';
  ordinary.offersV2.listings[0].price.savings.percentage = 5;
  assert.equal(normalizeAmazonItem(ordinary, 'Tecnología'), null);
});

test('rotates product searches between runs', () => {
  assert.notEqual(topicsForRun(0)[0].keywords, topicsForRun(2)[0].keywords);
});
