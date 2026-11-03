import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALIEXPRESS_11_COUPONS, ALIEXPRESS_11_LIMITED_COUPONS } from '../scripts/aliexpress-11-11-data.mjs';
test('visual guide preserves every announced coupon and its purchase threshold', () => {
  assert.deepEqual(ALIEXPRESS_11_COUPONS.map(({ discount, minimum }) => [discount, minimum]), [[3,18],[8,45],[12,69],[23,135],[39,230],[58,325],[75,429]]);
  assert.deepEqual(ALIEXPRESS_11_LIMITED_COUPONS.map(({ code, minimum }) => [code, minimum]), [['ESD11100',500],['ESD11120',600]]);
  const codes = [...ALIEXPRESS_11_COUPONS, ...ALIEXPRESS_11_LIMITED_COUPONS].flatMap(({ code, alternative }) => [code, alternative].filter(Boolean));
  assert.equal(new Set(codes).size, 16);
});
test('visual guide provides copy feedback, separate date restrictions and a one-column mobile grid', () => {
  const component = fs.readFileSync(new URL('../app/components/CampaignCouponGuide.tsx', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../app/coupon-guide.css', import.meta.url), 'utf8');
  assert.match(component, /navigator.clipboard.writeText/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /solo 1–3 y 11–12/i);
  assert.match(css, /@media\(max-width:650px\)/);
  assert.match(css, /\.campaignCouponGrid \{ grid-template-columns:1fr/);
});
