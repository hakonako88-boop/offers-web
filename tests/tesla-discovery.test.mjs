import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lowRiskTeslaAccessory, admissibleDiscovery, growDiscoveryCatalogue, discoveryTopics } from '../scripts/tesla-discovery.mjs';
const now = Date.parse('2026-11-05T16:00:00Z');
const row = (id, store = 'AliExpress') => ({ productId: id, store, name: 'Organizador consola Tesla Model Y Juniper', imageUrl: 'https://example.com/photo.jpg', generatedAffiliateUrl: store === 'Amazon' ? 'https://www.amazon.es/dp/B012345678?tag=owned-21' : 'https://s.click.aliexpress.com/e/test', listedPrice: 20, currency: 'EUR', checkedAt: '2026-11-05T15:00:00Z' });
test('discovery limits scope to Tesla accessories, not electrical or safety parts', () => {
  assert.equal(lowRiskTeslaAccessory('Alfombrillas para Tesla Model 3 Highland'), true);
  assert.equal(lowRiskTeslaAccessory('Organizador consola Tesla Model Y coche eléctrico'), true);
  for (const title of ['Wallbox cargador Tesla Model Y', 'Tesla Model 3 spoiler', 'Tesla Model Y jack pad elevación', 'Organizador BMW Model Y', 'Tesla Model Y airbag', 'Tesla Model 3 protector de cámara']) assert.equal(lowRiskTeslaAccessory(title), false);
});
test('each store admits two unique products while renewing existing ones', () => {
  const first = growDiscoveryCatalogue([], [row('1'), row('1'), row('2'), row('3')], { now });
  assert.equal(first.items.length, 2); assert.equal(first.added, 2);
  const second = growDiscoveryCatalogue(first.items, [row('1'), row('2'), row('3'), row('4')], { now });
  assert.equal(second.items.length, 4); assert.equal(second.added, 2);
  assert.ok(second.items.every(item => item.compatibilityStatus === 'pending'));
});
test('stale data and bad affiliate domains cannot enter the automatic catalogue', () => {
  assert.equal(admissibleDiscovery({ ...row('1'), generatedAffiliateUrl: 'https://attacker.example/x' }, now), false);
  assert.equal(admissibleDiscovery({ ...row('1'), checkedAt: '2026-11-01' }, now), false);
  const result = growDiscoveryCatalogue([{ ...row('old'), checkedAt: '2026-11-01' }], [row('new')], { maxTotal: 1, now });
  assert.deepEqual(result.items.map(item => item.productId), ['new']);
});
test('topics rotate on the existing six hour cadence', () => {
  const topics = ['a','b','c','d','e','f']; const date = new Date(now);
  assert.equal(discoveryTopics(topics, date).length, 2);
  assert.notDeepEqual(discoveryTopics(topics, date), discoveryTopics(topics, new Date(now + 6 * 3600000)));
});
test('Amazon publication persists identifiers, not permanent API price/image content', async () => {
  const script = await readFile(new URL('../scripts/sync-tesla-amazon.mjs', import.meta.url), 'utf8');
  assert.match(script, /result.items = result.items.map/); assert.match(script, /never permanent API/); assert.doesNotMatch(script, /amazonPageImage|sendPhoto|sendMessage/);
  const workflow = await readFile(new URL('../.github/workflows/tesla-price-audit.yml', import.meta.url), 'utf8');
  assert.match(workflow, /AMAZON_CREATOR_CREDENTIAL_ID/); assert.match(workflow, /sync-tesla-amazon.mjs/);
});
