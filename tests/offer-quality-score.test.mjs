import assert from 'node:assert/strict';
import fs from 'node:fs';
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

test('applies the quality gate to every automatic retailer without blocking the manual inbox', () => {
  for (const script of ['sync-amazon-deals.mjs', 'sync-aliexpress-deals.mjs', 'sync-miravia-deals.mjs', 'sync-awin-retailers.mjs', 'sync-mediamarkt-deals.mjs']) {
    const source = fs.readFileSync(new URL(`../scripts/${script}`, import.meta.url), 'utf8');
    assert.match(source, /offerQuality/u, `${script} must apply the shared quality score`);
    assert.match(source, /\.publishable/u, `${script} must reject low-quality automatic candidates`);
  }
  const manualInbox = fs.readFileSync(new URL('../scripts/process-telegram-inbox.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(manualInbox, /offerQuality/u, 'owner submissions must remain reviewable instead of being silently blocked');
});
