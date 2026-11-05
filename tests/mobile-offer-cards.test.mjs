import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('phone cards preserve readable price, before price, coupon and tap target', () => {
  const css = readFileSync('app/mobile-offer-cards.css', 'utf8');
  assert.match(css, /max-width: 600px/);
  assert.match(css, /112px minmax\(0, 1fr\)/);
  assert.match(css, /priceWas \{ display: block/);
  assert.match(css, /font-size: 32px/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /max-width: 360px/);
  const layout = readFileSync('app/layout.tsx', 'utf8');
  assert.ok(layout.indexOf('./mobile-offer-cards.css') > layout.indexOf('./shopping-system.css'));
});
