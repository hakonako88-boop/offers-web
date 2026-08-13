import assert from 'node:assert/strict';
import test from 'node:test';
import { COMMUNITY_SOURCES, discoverCommunitySignals, nextCommunitySignalState, parseRssSignals, searchTermsForSignal } from '../scripts/community-signals.mjs';

test('extracts compact product terms without copying promotional wording', () => {
  assert.deepEqual(searchTermsForSignal('Ofertón Amazon! Cargador USB-C de 40W con 4 puertos a 6,83€'), ['cargador', 'usb', '40w', 'puertos']);
});

test('parses public RSS entries as discovery signals', () => {
  const source = COMMUNITY_SOURCES.find((entry) => entry.id === 'nolodejesescapar');
  const signals = parseRssSignals(source, `<?xml version="1.0"?><rss><channel><item><title><![CDATA[Rebaja! Auriculares Bluetooth de 40h a 19,99€]]></title><link>https://source.example/auriculares</link><pubDate>Tue, 11 Aug 2026 09:20:05 +0000</pubDate></item></channel></rss>`);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].source, 'nolodejesescapar');
  assert.equal(signals[0].sourceStore, 'Otra');
  assert.equal(signals[0].category, 'Tecnología');
  assert.deepEqual(signals[0].terms, ['auriculares', 'bluetooth', '40h']);
});

test('uses only the AliExpress section from Chollometro RSS', () => {
  const source = COMMUNITY_SOURCES.find((entry) => entry.id === 'chollometro-aliexpress');
  const signals = parseRssSignals(source, `<?xml version="1.0"?><rss><channel>
    <item><pepper:merchant name="Amazon" price="19,99€"/><title>Auriculares Bluetooth Amazon</title><link>https://source.example/amazon</link></item>
    <item><pepper:merchant name="AliExpress" price="12,99€"/><title>Auriculares Bluetooth con cancelación de ruido</title><link>https://source.example/aliexpress</link></item>
  </channel></rss>`);

  assert.equal(signals.length, 1);
  assert.equal(signals[0].source, 'chollometro-aliexpress');
  assert.equal(signals[0].merchant, 'AliExpress');
  assert.equal(signals[0].sourceStore, 'AliExpress');
  assert.equal(signals[0].sourceUrl, 'https://source.example/aliexpress');
});

test('skips Amazon community signals until an official attributed lookup is available', async () => {
  const now = Date.parse('2026-08-11T12:00:00.000Z');
  const response = `<?xml version="1.0"?><rss><channel><item><title>Oferta Amazon! Cafetera 900W a 29€</title><link>https://source.example/cafetera</link><pubDate>Tue, 11 Aug 2026 11:20:05 +0000</pubDate></item></channel></rss>`;
  const discovery = await discoverCommunitySignals({
    now,
    state: { micholloLastCheckedAt: new Date(now).toISOString() },
    fetchImpl: async () => new Response(response, { status: 200 }),
  });
  assert.equal(discovery.signals.length, 0);
});

test('keeps discovery state bounded and records newly processed signals', () => {
  const state = nextCommunitySignalState({ seen: [] }, {
    checkedAt: '2026-08-11T12:00:00.000Z',
    signals: [{ id: 'chollometro:https://source.example/item' }],
    sourceHealth: [{ source: 'michollo', status: 'ok' }],
  });
  assert.equal(state.seen.length, 1);
  assert.equal(state.micholloLastCheckedAt, '2026-08-11T12:00:00.000Z');
});
