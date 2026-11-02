import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignCaption, buildCampaignPost, COUPONS_11 } from '../scripts/publish-aliexpress-11-11.mjs';
test('campaign has separate eligibility windows and fits a Telegram photo caption', () => {
  const caption = campaignCaption();
  assert.ok(caption.length <= 1024, `caption too long: ${caption.length}`);
  assert.match(caption, /1–3 y 11–12/);
  assert.match(caption, /No se suman entre sí/);
  assert.equal(COUPONS_11.length, 7);
});
test('web post keeps affiliate destination, conditions and a dedicated cover', () => {
  const post = buildCampaignPost('https://s.click.aliexpress.com/e/own-link', { message_id: 1, date: 1793606400 });
  assert.equal(post.url, 'https://s.click.aliexpress.com/e/own-link');
  assert.match(post.image, /aliexpress-11-11-2026/);
  assert.match(post.body, /únicamente para los días 1–3 y 11–12/);
  assert.match(post.body, /precio condicionado/);
  assert.ok(post.body.length < 5000);
});
