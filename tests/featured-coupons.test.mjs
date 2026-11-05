import test from 'node:test';
import assert from 'node:assert/strict';
import { selectFeaturedCoupons } from '../scripts/featured-coupons.mjs';
import fs from 'node:fs';

const now = Date.parse('2026-11-05T12:00:00Z');
const deal = (id, coupon, extra = {}) => ({id, store:'AliExpress', coupon, verifiedDate:'2026-11-05T10:00:00Z', ...extra});
test('coupon shelf deduplicates published codes and keeps product scope', () => {
  const chosen = selectFeaturedCoupons([deal('a','ESD1112'), deal('b','ESD1112'), deal('c','AEES08'), deal('d','AEES03'), deal('e','Recoge el cupón de 7 € en la ficha', {store:'Miravia'})], now);
  assert.deepEqual(chosen.map(d => d.id), ['a','c','e']);
  assert.equal(chosen[0].couponMinimumSpend, undefined);
  assert.equal(chosen[0].couponDiscount, undefined);
  assert.equal(chosen[2].collectable, true);
});
test('stale, future and cashback-only entries are not promoted as coupon codes', () => {
  assert.deepEqual(selectFeaturedCoupons([
    deal('old','OLD99',{verifiedDate:'2026-10-01T00:00:00Z'}),
    deal('future','NEXT99',{verifiedDate:'2026-11-06T00:00:00Z'}),
    deal('cash','cashback 5%'), deal('unknown','descuento disponible para algunas cuentas'),
  ], now), []);
});
test('a blocked clipboard exposes the actual code instead of claiming success', () => {
  const component = fs.readFileSync('app/components/CouponCopy.tsx','utf8');
  assert.match(component, /setCopyFailed\(value\)/);
  assert.match(component, /No se ha podido copiar automáticamente/);
  assert.match(component, /<code tabIndex=\{0\}>\{copyFailed\}<\/code>/);
});
