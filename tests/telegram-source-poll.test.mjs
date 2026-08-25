import assert from 'node:assert/strict';
import test from 'node:test';

import {
  channelUsername,
  cleanSourceProductText,
  compareCheckpoint,
  isPromotionalSourcePost,
  latestPublicMessageId,
  parseTelegramPublicMessages,
} from '../scripts/check-telegram-source-changes.mjs';

test('normalizes public Telegram channel URLs', () => {
  assert.equal(channelUsername('https://t.me/Ofertos'), 'Ofertos');
  assert.equal(channelUsername('https://t.me/s/una_ganga'), 'una_ganga');
  assert.equal(channelUsername('https://example.com/no'), null);
});

test('finds the newest visible message and ignores older or pinned posts', () => {
  const html = `
    <div data-post="Ofertos/91"></div>
    <div data-post='Ofertos/105'></div>
    <div data-post="Ofertos/99"></div>
    <div data-post="another/999"></div>`;
  assert.equal(latestPublicMessageId(html, 'Ofertos'), 105);
});

test('initializes a channel without publishing its existing backlog', () => {
  assert.deepEqual(compareCheckpoint(undefined, 105), { changed: false, nextId: 105 });
  assert.deepEqual(compareCheckpoint(105, 106), { changed: true, nextId: 106 });
  assert.deepEqual(compareCheckpoint(106, 105), { changed: false, nextId: 106 });
});

test('extracts every supported product link as an individual queue candidate', () => {
  const html = `
    <div class="tgme_widget_message_wrap"><div data-post="Ofertos/106">
      <div class="tgme_widget_message_text">Robot aspirador Xiaomi en AliExpress</div>
      <a href="https://s.click.aliexpress.com/e/_abc">Comprar</a>
      <time datetime="2026-08-16T08:00:00Z"></time>
    </div></div>
    <div class="tgme_widget_message_wrap"><div data-post="Ofertos/107">
      <div class="tgme_widget_message_text">Fire TV Stick en Amazon</div>
      <a href="https://www.amazon.es/dp/B012345678">Ver oferta</a>
      <time datetime="2026-08-16T08:01:00Z"></time>
    </div></div>`;
  const messages = parseTelegramPublicMessages({ store: '' }, html);
  assert.deepEqual(messages.map((message) => message.messageId), [106, 107]);
  assert.deepEqual(messages.map((message) => message.links[0].store), ['AliExpress', 'Amazon']);
  assert.equal(messages[0].text, 'Robot aspirador Xiaomi en AliExpress');
});

test('recognizes the official and channel-specific shorteners used by the configured sources', () => {
  const html = `
    <div class="tgme_widget_message_wrap"><div data-post="una_ganga/201">
      <div class="tgme_widget_message_text">Oferta Amazon con descuento</div>
      <a href="https://link.amazon/ABC">Comprar</a>
    </div></div>
    <div class="tgme_widget_message_wrap"><div data-post="tiesometro/202">
      <div class="tgme_widget_message_text">Taladro en AliExpress</div>
      <a href="https://www.cholloschina.com/oferta/taladro">Comprar</a>
    </div></div>`;
  const amazon = parseTelegramPublicMessages({ store: '' }, html)[0];
  const aliExpress = parseTelegramPublicMessages({ store: 'AliExpress' }, html)[1];
  assert.equal(amazon.links[0].store, 'Amazon');
  assert.equal(aliExpress.links[0].store, 'AliExpress');
});

test('ignores linked channel images and repeated campaign buttons', () => {
  const source = { id: 'telegram-tiesometro', url: 'https://t.me/tiesometro', store: 'AliExpress' };
  const posts = [301, 302, 303].map((id) => `<div class="tgme_widget_message_wrap"><div data-post="tiesometro/${id}"></div>
    <div class="tgme_widget_message_text">Oferta AliExpress ${id}</div>
    <a href="https://www.cholloschina.com/uploads/product-${id}.jpg">foto</a>
    <a href="https://chz.to/product-${id}">producto</a>
    <a href="https://s.click.aliexpress.com/e/_campaign">cupones</a></div>`).join('');
  const messages = parseTelegramPublicMessages(source, posts);
  assert.deepEqual(messages.map((message) => message.links.map((link) => link.url)), [
    ['https://chz.to/product-301'],
    ['https://chz.to/product-302'],
    ['https://chz.to/product-303'],
  ]);
});

test('blocks Ofertos channel-list promotions but keeps real product offers', () => {
  const source = { id: 'telegram-ofertos', url: 'https://t.me/Ofertos', productOnly: true, priority: true };
  assert.equal(isPromotionalSourcePost(source, '🔥 NUESTROS CANALES 🔥 Síguenos en nuestros canales. La Casa del Chollo 3X2 Promociones Ofertas Comida Chollos Hogar'), true);
  assert.equal(isPromotionalSourcePost(source, '🔥 Auriculares Sony #Amazon 🔥 Precio: 59,99€'), false);
  assert.equal(
    cleanSourceProductText(source, '🔥 Auriculares Sony #Amazon 🔥 Precio: 59,99€ 📉 Evolución de Precio Te aviso cuando baje el precio de tú producto favorito @Rastreadictos_bot'),
    '🔥 Auriculares Sony #Amazon 🔥 Precio: 59,99€',
  );
});

test('marks an Ofertos self-promotion as blocked while retaining its checkpoint message', () => {
  const source = { id: 'telegram-ofertos', productOnly: true };
  const html = `<div class="tgme_widget_message_wrap"><div data-post="Ofertos/500">
    <div class="tgme_widget_message_text">🔥 NUESTROS CANALES 🔥 Síguenos en nuestros canales</div>
    <a href="https://t.me/otra_canal">Abrir</a></div></div>`;
  const [message] = parseTelegramPublicMessages(source, html);
  assert.equal(message.messageId, 500);
  assert.equal(message.blocked, true);
  assert.deepEqual(message.links, []);
});
