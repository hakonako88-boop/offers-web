import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignStage, selectCampaignDeals } from '../scripts/black-friday-selection.mjs';

const product = (id, overrides = {}) => ({
  id: String(id), active: true, title: `Producto verificable ${id}`,
  store: 'Amazon', category: 'Tecnología', categoryConfidence: .9,
  price: 70, oldPrice: 100, imageUrl: `https://example.com/${id}.jpg`,
  affiliateUrl: `https://example.com/${id}`, verifiedDate: '2026-11-27T10:00:00+01:00',
  ...overrides,
});

test('switches the campaign message on Madrid dates', () => {
  assert.equal(campaignStage(new Date('2026-11-26T22:59:00Z')), 'preparation');
  assert.equal(campaignStage(new Date('2026-11-26T23:00:00Z')), 'black-friday');
  assert.equal(campaignStage(new Date('2026-11-29T23:00:00Z')), 'cyber-monday');
  assert.equal(campaignStage(new Date('2026-11-30T23:00:00Z')), 'finished');
});

test('ranks real recent reductions and keeps the cover varied', () => {
  const now = new Date('2026-11-27T12:00:00+01:00');
  const deals = Array.from({ length: 8 }, (_, id) => product(id));
  deals.push(product('coupon', { store: 'AliExpress', category: 'Hogar', price: 45, oldPrice: 70, coupon: 'AHORRA5' }));
  deals.push(product('old', { verifiedDate: '2026-11-15T10:00:00+01:00' }));
  deals.push(product('no-image', { imageUrl: '' }));
  deals.push(product('weak', { price: 99, oldPrice: 100 }));
  const selected = selectCampaignDeals(deals, now);
  assert.equal(selected.some((item) => item.deal.id === 'coupon'), true);
  assert.equal(selected.filter((item) => item.deal.store === 'Amazon').length, 4);
  assert.equal(selected.some((item) => ['old', 'no-image', 'weak'].includes(item.deal.id)), false);
});
