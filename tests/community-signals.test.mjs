import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMMUNITY_SOURCES,
  communityMatchForTitle,
  discoverCommunitySignals,
  nextCommunitySignalState,
  parseRssSignals,
  parseTelegramPublicSignals,
  searchTermsForSignal,
} from '../scripts/community-signals.mjs';

test('gives MiChollo and NoLoDejesEscapar the two highest discovery priorities', () => {
  assert.deepEqual(COMMUNITY_SOURCES.slice(0, 2).map((source) => source.id), ['michollo', 'nolodejesescapar']);
  assert.ok(COMMUNITY_SOURCES[0].weight > COMMUNITY_SOURCES[1].weight);
  assert.ok(COMMUNITY_SOURCES[1].weight > COMMUNITY_SOURCES[2].weight);
});

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

test('extracts AliExpress and Miravia links from a public Telegram channel without copying its image', () => {
  const source = { id: 'telegram-ofertas', kind: 'telegram-public', username: 'ofertas_publicas', url: 'https://t.me/s/ofertas_publicas', weight: 20 };
  const html = `<div class="tgme_widget_message_wrap"><div class="tgme_widget_message" data-post="ofertas_publicas/321">
    <div class="tgme_widget_message_text">Robot aspirador Xiaomi S40 Pro con fregado y base</div>
    <a href="https://s.click.aliexpress.com/e/_Example">Ver oferta</a>
    <time datetime="2026-08-15T08:00:00+00:00"></time>
    <a class="tgme_widget_message_photo_wrap" style="background-image:url('https://cdn.example/copied-channel-image.jpg')"></a>
  </div></div>`;
  const signals = parseTelegramPublicSignals(source, html);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].sourceStore, 'AliExpress');
  assert.equal(signals[0].merchantUrl, 'https://s.click.aliexpress.com/e/_Example');
  assert.equal(signals[0].sourceUrl, 'https://t.me/ofertas_publicas/321');
  assert.equal('image' in signals[0], false);
});

test('registers every Telegram channel approved by the owner', () => {
  const usernames = COMMUNITY_SOURCES
    .filter((source) => source.kind === 'telegram-public')
    .map((source) => source.username.toLowerCase());
  assert.deepEqual(usernames, [
    'chollosdiario',
    'ofertos',
    'ofertassupermercadoses',
    'una_ganga',
    'tiesometro',
    'erroresde_precio',
    'paramanitas',
  ]);
});

test('accepts an Awin tidd.ly link as Miravia only when the Telegram post identifies the store', () => {
  const source = { id: 'telegram-mixed', kind: 'telegram-public', username: 'mixed', url: 'https://t.me/s/mixed', weight: 20 };
  const miravia = `<div class="tgme_widget_message_wrap"><div class="tgme_widget_message" data-post="mixed/8">
    <div class="tgme_widget_message_text">Freidora Xiaomi de 6,5 L #Miravia con cupón especial</div>
    <a href="https://tidd.ly/3QCoL8S">Ver oferta</a>
  </div></div>`;
  const unknownMerchant = miravia.replace('#Miravia', '#Oferta');
  assert.equal(parseTelegramPublicSignals(source, miravia)[0]?.sourceStore, 'Miravia');
  assert.equal(parseTelegramPublicSignals(source, unknownMerchant).length, 0);
});

test('accepts a configured chz.to AliExpress shortener but leaves it for official resolution', () => {
  const source = { id: 'telegram-tiesometro', kind: 'telegram-public', username: 'tiesometro', url: 'https://t.me/s/tiesometro', merchant: 'AliExpress', weight: 22 };
  const html = `<div class="tgme_widget_message_wrap"><div class="tgme_widget_message" data-post="tiesometro/123">
    <div class="tgme_widget_message_text">Taladro percutor inalámbrico con dos baterías</div>
    <a href="https://chz.to/8y1al">Ver producto</a>
  </div></div>`;
  const signal = parseTelegramPublicSignals(source, html)[0];
  assert.equal(signal.sourceStore, 'AliExpress');
  assert.equal(signal.merchantUrl, 'https://chz.to/8y1al');
});

test('detects an Amazon product in an individual Telegram message', () => {
  const page = `<div class="tgme_widget_message_wrap"><div class="tgme_widget_message" data-post="chollosdiario/42">
    <div class="tgme_widget_message_text">Robot aspirador con base automática y navegación láser #Amazon</div>
    <a href="https://www.amazon.es/dp/B0TESTASIN1">Ver producto</a>
    <time datetime="2026-08-15T11:30:00+00:00"></time>
  </div></div>`;
  const source = { id: 'telegram-chollosdiario', kind: 'telegram-public', username: 'chollosdiario', url: 'https://t.me/s/chollosdiario', weight: 16 };
  const signals = parseTelegramPublicSignals(source, page);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].sourceStore, 'Amazon');
  assert.equal(signals[0].merchantUrl, 'https://www.amazon.es/dp/B0TESTASIN1');
});

test('keeps factual prices from a queued Telegram offer without inventing a previous price', () => {
  const source = COMMUNITY_SOURCES.find((entry) => entry.id === 'telegram-una-ganga');
  const html = `<div class="tgme_widget_message_wrap" data-post="una_ganga/90934">
    <div class="tgme_widget_message_text">Máquina cortadora láser Precio: 221,69€ <a href="https://s.click.aliexpress.com/e/_c3IR4A8n">Enlace</a></div>
    <time datetime="2026-08-16T01:02:55+00:00"></time>
  </div>`;
  const [signal] = parseTelegramPublicSignals(source, html);
  assert.equal(signal.price, 221.69);
  assert.equal(signal.previousPrice, 0);
});

test('skips Amazon community signals until an official attributed lookup is available', async () => {
  const now = Date.parse('2026-08-11T12:00:00.000Z');
  const response = `<?xml version="1.0"?><rss><channel><item><title>Oferta Amazon! Cafetera 900W a 29€</title><link>https://source.example/cafetera</link><pubDate>Tue, 11 Aug 2026 11:20:05 +0000</pubDate></item></channel></rss>`;
  const discovery = await discoverCommunitySignals({
    now,
    state: { micholloLastCheckedAt: new Date(now).toISOString() },
    includeTelegramQueue: false,
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

test('matches a catalogue product only when a priority signal shares concrete terms', () => {
  const signals = [{
    id: 'michollo:robot',
    source: 'michollo',
    sourceUrl: 'https://michollo.com/chollo-robot-123/',
    terms: ['xiaomi', 'robot', 'aspirador', 's20'],
    sourceWeight: 30,
  }];
  assert.equal(communityMatchForTitle('Robot aspirador Xiaomi S20 con base', signals)?.source, 'michollo');
  assert.equal(communityMatchForTitle('Auriculares Bluetooth deportivos', signals), null);
});
