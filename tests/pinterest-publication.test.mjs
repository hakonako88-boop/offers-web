import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pinterestPinPayload,
  pinterestPublicationWindow,
  selectPinterestOffer,
} from '../scripts/pinterest-publication.mjs';

const recent = Math.floor(Date.parse('2026-09-06T10:00:00+02:00') / 1000);

const offer = {
  source_product_id: 'pin-123',
  title: 'Robot aspirador inteligente con base de autovaciado',
  store: 'AliExpress',
  price: '199,99 €',
  previousPrice: '299,99 €',
  coupon: 'AHORRA20',
  image: '/tg/pin-123.jpg',
  url: 'https://s.click.aliexpress.com/e/example',
  date: recent,
};

test('selects a complete recent offer that has not been published to Pinterest', () => {
  const selected = selectPinterestOffer([offer], { published: [] }, { now: new Date('2026-09-06T11:00:00+02:00') });
  assert.equal(selected.source_product_id, 'pin-123');
  assert.equal(selectPinterestOffer([offer], { published: [{ offerId: 'pin-123' }] }, { now: new Date('2026-09-06T11:00:00+02:00') }), null);
});

test('keeps Pinterest posts in useful hours and prevents excessive frequency', () => {
  assert.equal(pinterestPublicationWindow({}, { now: new Date('2026-09-06T04:00:00+02:00') }).reason, 'quiet-hours');
  const state = { published: Array.from({ length: 3 }, (_, index) => ({ offerId: `p${index}`, publishedAt: `2026-09-06T${10 + index}:00:00.000Z` })) };
  assert.equal(pinterestPublicationWindow(state, { now: new Date('2026-09-06T21:00:00+02:00') }).reason, 'daily-limit');
});

test('builds a direct affiliate Pin with a clean product image and disclosure', () => {
  const pin = pinterestPinPayload(offer, { boardId: '123456' });
  assert.equal(pin.board_id, '123456');
  assert.equal(pin.link, offer.url);
  assert.equal(pin.media_source.url, 'https://chollosaldia.com/tg/pin-123.jpg');
  assert.equal(pin.media_source.is_standard, true);
  assert.match(pin.description, /AHORRA20/u);
  assert.match(pin.description, /afiliado/iu);
});
