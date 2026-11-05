import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { freshTeslaPrice, teslaCoupon } from '../scripts/tesla-pricing.mjs';
const now = Date.parse('2026-11-05T15:00:00Z');
const observations = JSON.parse(await readFile(new URL('../data/tesla-price-observations.json', import.meta.url), 'utf8'));
test('prices come from exact affiliate API records, not original-price guesses', () => {
  assert.equal(observations.items.length, 10); assert.equal(observations.discoveries.length >= 2, true);
  assert.ok(observations.items.every(row => row.priceBasis === 'product_level_not_selected_sku' && row.skuVerified === false && row.shipping === null));
  assert.equal(freshTeslaPrice(observations.items[0], Date.parse(observations.items[0].checkedAt) + 60000), true);
});
test('expired, future, non-EUR and unavailable prices are not shown as fresh', () => {
  const row = { ...observations.items[0], checkedAt: '2026-11-05T14:30:00Z' };
  for (const patch of [{ checkedAt: '2026-11-01' }, { checkedAt: '2026-11-06' }, { currency: 'USD' }, { listedPrice: null }, { listedPrice: 0 }]) assert.equal(freshTeslaPrice({ ...row, ...patch }, now), false);
});
test('coupon is product-specific, conditional and never silently deducted', () => {
  const row = { listedPrice: 49.99, currency: 'EUR', checkedAt: '2026-11-05T14:30:00Z', coupon: { promo_code: '1CQW1SKAERXJ', code_value: 'On order over EUR 20.4 , get EUR 1.09 off', code_mini_spend: '20.4', code_availabletime_start: '2025-11-15 18:08:08', code_availabletime_end: '2026-11-25 23:59:59' } };
  const coupon = teslaCoupon(row, now);
  assert.equal(coupon.code, '1CQW1SKAERXJ'); assert.equal(coupon.amount, 1.09); assert.equal(coupon.minimum, 20.4); assert.equal(coupon.requiresCheckout, true);
  assert.equal(teslaCoupon({ ...row, coupon: null }, now), null);
  assert.equal(teslaCoupon({ ...row, coupon: { ...row.coupon, code_availabletime_end: '2026-11-04 23:59:59' } }, now), null);
});
test('hub and guides use truthful structured data, no catalogue Product or fake reviews', async () => {
  const seo = await readFile(new URL('../app/tesla/TeslaSeo.tsx', import.meta.url), 'utf8');
  assert.match(seo, /BreadcrumbList/); assert.match(seo, /CollectionPage/); assert.match(seo, /Article/); assert.doesNotMatch(seo, /aggregateRating|InStock|'Product'/);
  const cards = await readFile(new URL('../app/tesla/ImportedProducts.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(cards, /Los accesorios que nos has enviado|Precio pendiente de comprobar/); assert.match(cards, /rel="sponsored noopener noreferrer"/);
});
test('automation preserves failed observations and is isolated from Telegram', async () => {
  const script = await readFile(new URL('../scripts/audit-tesla-prices.mjs', import.meta.url), 'utf8');
  assert.match(script, /--update-catalogue/); assert.match(script, /merge\(previous.items/); assert.doesNotMatch(script, /sendPhoto|sendMessage|TELEGRAM_BOT_TOKEN/);
  const workflow = await readFile(new URL('../.github/workflows/tesla-price-audit.yml', import.meta.url), 'utf8');
  assert.match(workflow, /23 \*\/6/); assert.match(workflow, /refs\/heads\/main/);
});
