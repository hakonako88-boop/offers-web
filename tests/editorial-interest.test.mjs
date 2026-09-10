import assert from 'node:assert/strict';
import test from 'node:test';
import { automaticInterest, interestFamily, selectInterestingOffers } from '../scripts/editorial-interest.mjs';

test('rejects catalogue filler even when it includes a nominal discount', () => {
  assert.equal(automaticInterest({ title: 'Fundas de almohada decorativas bordadas', price: 13.21, oldPrice: 25, discount: 47 }, { requireDealEvidence: true }), -1);
  assert.equal(automaticInterest({ title: 'Hucha mágica infantil', price: 18.5, oldPrice: 30, discount: 38 }, { requireDealEvidence: true }), -1);
});

test('rejects an ordinary catalogue price without demonstrated saving', () => {
  assert.equal(automaticInterest({ title: 'Samsung barra de sonido para TV', priceLabel: '280,30 €' }, { requireDealEvidence: true }), -1);
});

test('keeps useful, food and coupon deals with credible savings', () => {
  assert.ok(automaticInterest({ title: 'Ventilador Cecotec de 45 W', price: 25, oldPrice: 39.99 }, { requireDealEvidence: true }) > 0);
  assert.ok(automaticInterest({ title: 'Puleva leche semidesnatada pack de 12', price: 10.94, oldPrice: 15.5 }, { requireDealEvidence: true }) > 0);
  assert.ok(automaticInterest({ title: 'Robot limpiacristales automático', price: 31.55, oldPrice: 34.19, coupon: 'MES06', source: 'telegram-ofertos', sourceWeight: 38 }, { requireDealEvidence: true }) > 0);
});

test('keeps exceptional big-ticket savings and diversifies useful families', () => {
  const selected = selectInterestingOffers([
    { title: 'Monitor gaming LG', price: 199, oldPrice: 249, score: 70 },
    { title: 'Auriculares Sony', price: 35, oldPrice: 55, score: 60 },
    { title: 'Aspiradora Bosch', price: 99, oldPrice: 149, score: 65 },
  ]);
  assert.equal(selected.length, 3);
  assert.deepEqual(new Set(selected.map(interestFamily)), new Set(['informatica', 'moviles-audio', 'limpieza']));
});
