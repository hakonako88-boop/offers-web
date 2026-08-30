import test from 'node:test';
import assert from 'node:assert/strict';
import {
  instagramCaption,
  instagramImageUrl,
  instagramPublicationWindow,
  selectInstagramOffer,
} from '../scripts/instagram-publication.mjs';

const recent = Math.floor(Date.parse('2026-08-31T12:00:00+02:00') / 1000);

test('selects a recent visual offer that has not been posted to Instagram', () => {
  const offers = [
    { source_product_id: 'a1', title: 'Auriculares con cancelación de ruido', price: '29,99 €', store: 'AliExpress', image: '/tg/a1.jpg', date: recent, text: 'DESCUENTO: 40%' },
    { source_product_id: 'm1', title: 'Televisor OLED 55 pulgadas', price: '799 €', store: 'MediaMarkt', image: '/tg/m1.jpg', date: recent, text: 'DESCUENTO: 25%' },
  ];
  const selected = selectInstagramOffer(offers, { published: [{ offerId: 'a1' }] }, { now: new Date('2026-08-31T13:00:00+02:00') });
  assert.equal(selected.source_product_id, 'm1');
  assert.equal(instagramImageUrl(selected), 'https://chollosaldia.com/tg/m1.jpg');
});

test('limits Instagram to useful daytime slots and four posts per day', () => {
  assert.equal(instagramPublicationWindow({}, { now: new Date('2026-08-31T03:00:00+02:00') }).reason, 'quiet-hours');
  const state = { published: Array.from({ length: 4 }, (_, index) => ({ offerId: `x${index}`, publishedAt: `2026-08-31T${10 + index}:00:00.000Z` })) };
  assert.equal(instagramPublicationWindow(state, { now: new Date('2026-08-31T21:00:00+02:00') }).reason, 'daily-limit');
});

test('builds an Instagram caption with price, coupon and the web offer', () => {
  const caption = instagramCaption({
    source_product_id: 'ali-123', title: 'Robot aspirador inteligente', store: 'AliExpress', price: '99,99 €', coupon: 'AHORRO10', image: '/tg/x.jpg',
  });
  assert.match(caption, /99,99 €/u);
  assert.match(caption, /AHORRO10/u);
  assert.match(caption, /chollosaldia\.com\/oferta\/ali-123\//u);
});
