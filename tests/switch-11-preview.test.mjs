import test from 'node:test';
import assert from 'node:assert/strict';
import { caption, originals, convertLinks } from '../scripts/publish-switch-11-preview.mjs';
test('converts each exact owner-selected URL through the affiliate function', async () => {
  const seen = [];
  const links = await convertLinks({ trackingId: 'owner' }, async (url, config) => { seen.push(url); assert.equal(config.trackingId, 'owner'); return `https://s.click.aliexpress.com/e/owner${seen.length}`; });
  assert.deepEqual(seen, originals); assert.equal(links.length, 4);
  assert.ok(links.every(l => l.affiliate !== l.original));
});
test('never falls back to unconfirmed original tracking', async () => {
  await assert.rejects(convertLinks({}, async () => ''), /no ha convertido/);
  await assert.rejects(convertLinks({}, async () => 'https://example.com'), /no ha convertido/);
});
test('does not promise unverified historical lows, PayPal benefits or Spanish warranty', () => {
  assert.ok(caption().length <= 1024);
  assert.match(caption(), /no se suman/);
  assert.match(caption(), /No damos por confirmados 40 € extra/);
  assert.match(caption(), /no están confirmadas/);
});
