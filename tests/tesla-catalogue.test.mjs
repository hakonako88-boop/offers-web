import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compatibilityMatches, compareOffers, validateCatalogue } from '../scripts/tesla-catalogue.mjs';
const now = Date.parse('2026-11-05T14:00:00Z');
const evidence = { url: 'https://example.com/exact-sku', note: 'Test fixture only, not real product data', checkedAt: '2026-11-05T13:00:00Z' };
const vehicle = { model: 'Model Y', generation: 'Juniper', year: 2026, yearBasis: 'manufacture', market: 'ES', trim: 'test-trim' };
const rule = { ...vehicle, years: [2026], status: 'confirmed', trimPolicy: 'specific', trims: ['test-trim'], evidence };
const variant = { id: 'fixture-variant', identityKey: 'fixture-sku-size-quantity', compatibilities: [rule], offers: [] };
const offer = { store: 'Fixture A', status: 'available', price: 10, shipping: 3, currency: 'EUR', market: 'ES', taxIncluded: true, affiliateConfirmed: true, affiliateUrl: 'https://example.com/a', originalUrl: 'https://example.com/a', identityKey: variant.identityKey, checkedAt: evidence.checkedAt, evidence, identityEvidence: evidence };
test('ten original links are preserved and no products or configurations are invented', async () => {
  const data = JSON.parse(await readFile(new URL('../data/tesla-catalogue.json', import.meta.url), 'utf8'));
  assert.equal(data.imports.length, 10); assert.equal(new Set(data.imports.map(x => x.productId)).size, 10);
  assert.equal(data.products.length, 0); assert.equal(data.vehicleConfigurations.length, 0); assert.deepEqual(validateCatalogue(data), []);
  assert.deepEqual(data.imports.map(x => x.originalUrl), ['_EyP9Y0K','_ExYAoME','_EJOSu6e','_EvZu8aW','_EQ8aFvs','_EIV5Ni6','_EuzjpLM','_EQsWiCw','_EJNtQlM','_EwlAYIA'].map(code => `https://s.click.aliexpress.com/e/${code}`));
});
test('exact model/generation/year/market/basis/trim match is required', () => {
  assert.equal(compatibilityMatches(variant, vehicle), true);
  for (const delta of [{ model: 'Model 3' }, { generation: 'original' }, { year: 2025 }, { market: 'FR' }, { yearBasis: 'model' }, { trim: '' }, { trim: 'other' }]) assert.equal(compatibilityMatches(variant, { ...vehicle, ...delta }), false);
});
test('pending or unsourced compatibility is never confirmed', () => {
  assert.equal(compatibilityMatches({ ...variant, compatibilities: [{ ...rule, status: 'pending' }] }, vehicle), false);
  assert.equal(compatibilityMatches({ ...variant, compatibilities: [{ ...rule, evidence: null }] }, vehicle), false);
  assert.equal(compatibilityMatches(variant, { ...vehicle, year: 0 }), false);
});
test('trim independence must be explicitly evidenced', () => {
  assert.equal(compatibilityMatches({ ...variant, compatibilities: [{ ...rule, trimPolicy: 'not_relevant' }] }, { ...vehicle, trim: '' }), true);
});
test('comparison includes shipping and only distinct stores produce savings', () => {
  const result = compareOffers({ ...variant, offers: [offer, { ...offer, store: 'Fixture B', price: 20, shipping: 0 }] }, now);
  assert.equal(result.rows[0].total, 13); assert.deepEqual(result.savings, { amount: 7, percentage: 35 });
  assert.equal(compareOffers({ ...variant, offers: [offer, { ...offer, price: 20 }] }, now).savings, null);
});
test('stale, future, unknown shipping, taxes, coupons and unrelated identities cannot imply savings', () => {
  for (const delta of [{ checkedAt: '2026-11-01' }, { checkedAt: '2026-11-06' }, { shipping: null }, { taxIncluded: false }, { conditions: 'personal coupon' }, { identityKey: 'other-size' }, { affiliateConfirmed: false }, { status: 'sold_out' }, { currency: 'USD' }, { identityEvidence: null }]) {
    assert.equal(compareOffers({ ...variant, offers: [{ ...offer, ...delta }] }, now).rows.length, 0);
  }
});
test('malformed catalogues and duplicate variants are rejected', () => {
  assert.ok(validateCatalogue({}).length);
  assert.ok(validateCatalogue({ schemaVersion: 1, imports: [], vehicleConfigurations: [], products: [{ id: 'p', name: 'Fixture', category: 'Consola', variants: [variant, variant] }] }).length);
});
test('public Tesla hub is linked, original imports have real images and management stays noindex', async () => {
  const page = await readFile(new URL('../app/tesla/page.tsx', import.meta.url), 'utf8');
  const management = await readFile(new URL('../app/tesla/gestion/page.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /index: false/); assert.match(management, /index: false/);
  const sitemap = await readFile(new URL('../app/sitemap.ts', import.meta.url), 'utf8'); assert.match(sitemap, /\/tesla\//);
  const home = await readFile(new URL('../app/components/DealExplorer.tsx', import.meta.url), 'utf8'); assert.match(home, /href="\/tesla\/"/);
  const details = JSON.parse(await readFile(new URL('../data/tesla-import-details.json', import.meta.url), 'utf8'));
  assert.equal(details.items.length, 10); assert.ok(details.items.every(item => item.imageUrl.startsWith('https://ae-pic-a1.aliexpress-media.com/')));
});
