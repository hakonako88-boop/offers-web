import test from 'node:test';
import assert from 'node:assert/strict';
import { affiliateUrl, caption, buildPost, expires } from '../scripts/publish-mediamarkt-singles.mjs';
import { isOwnedTradeDoublerMediaMarktLink } from '../scripts/tradedoubler-mediamarkt.mjs';
test('MediaMarkt campaign uses owner affiliation and the exact campaign destination', () => {
  assert.ok(isOwnedTradeDoublerMediaMarktLink(affiliateUrl()));
  assert.equal(new URL(affiliateUrl()).searchParams.get('url'), 'https://www.mediamarkt.es/es/campaign/singles-days');
});
test('caption is readable, honest about eligibility and below photo limits', () => {
  assert.ok(caption().length <= 1024);
  assert.match(caption(), /artículos seleccionados/);
  assert.match(caption(), /12\/11 a las 09:00/);
  assert.match(caption(), /#Publi/);
  assert.equal(new Date(expires).toISOString(), '2026-11-12T08:00:00.000Z');
});
test('web record retains the Telegram receipt and campaign artwork', () => {
  const post = buildPost({ message_id: 9000, date: 1794334800 });
  assert.equal(post.message_id, 9000);
  assert.equal(post.url, affiliateUrl());
  assert.match(post.image, /mediamarkt-singles-day/);
  assert.match(post.body, /No es un descuento para toda la tienda/);
});
