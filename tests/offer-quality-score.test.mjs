import assert from 'node:assert/strict';
import test from 'node:test';
import { offerQuality } from '../scripts/offer-quality-score.mjs';

test('scores a complete useful discounted offer above catalogue filler', () => {
  const now = Math.floor(Date.now() / 1000);
  const good = offerQuality({ title: 'Robot aspirador Cecotec con estación', price: '199 €', previousPrice: '299 €', image: '/tg/robot.jpg', url: 'https://example.com/robot', date: now, coupon: 'AHORRA20' });
  const filler = offerQuality({ title: 'Mochila casual unisex', price: '18 €', previousPrice: '90 €', image: '/tg/bag.jpg', url: 'https://example.com/bag', date: now });
  assert.equal(good.publishable, true);
  assert.ok(good.score >= 60);
  assert.equal(filler.publishable, false);
  assert.ok(filler.score < good.score);
});

test('caps an expensive offer whose reference price is implausible', () => {
  const result = offerQuality({ title: 'Tablet Samsung profesional', price: '614,17 €', previousPrice: '1546,95 €', image: '/tg/tablet.jpg', url: 'https://example.com/tablet', date: Math.floor(Date.now() / 1000) });
  assert.equal(result.publishable, false);
  assert.ok(result.score <= 49);
});
