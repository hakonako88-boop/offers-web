import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { selectAutomaticTikTokOffer } from '../scripts/publish-tiktok-automatic.mjs';

function offer(overrides = {}) {
  return {
    date: Math.floor(Date.parse('2026-09-02T12:00:00+02:00') / 1000),
    source: 'telegram-ofertos',
    source_product_id: 'product-1',
    message_id: 6001,
    title: 'Xiaomi móvil con cámara y carga rápida',
    store: 'AliExpress',
    price: '199,00 €',
    previousPrice: '299,00 €',
    coupon: 'AHORRA20',
    image: '/tg/aliexpress-product-1.jpg',
    url: 'https://s.click.aliexpress.com/e/example',
    ...overrides,
  };
}

test('selects a complete automatic offer and ignores inbox, broken and duplicate records', () => {
  const now = new Date('2026-09-02T18:00:00+02:00');
  const offers = [
    offer({ source_product_id: 'inbox', source: 'telegram-inbox' }),
    offer({ source_product_id: 'broken', image: '' }),
    offer({ source_product_id: 'duplicate' }),
    offer({ source_product_id: 'winner', message_id: 6004 }),
  ];
  const selected = selectAutomaticTikTokOffer(offers, [{ offerId: 'duplicate', date: '2026-09-01', status: 'draft' }], now);
  assert.equal(selected?.source_product_id, 'winner');
});

test('limits automatic TikTok delivery to two offers per Madrid day', () => {
  const now = new Date('2026-09-02T18:00:00+02:00');
  const state = [
    { offerId: 'old-1', date: '2026-09-02', status: 'draft' },
    { offerId: 'old-2', date: '2026-09-02', status: 'published' },
  ];
  assert.equal(selectAutomaticTikTokOffer([offer()], state, now), null);
});

test('deploys TikTok after the public website and prevents state-only loops', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  assert.ok(workflow.indexOf('Publicar en GitHub Pages') < workflow.indexOf('Enviar una oferta automática a TikTok'));
  assert.match(workflow, /publish:tiktok/u);
  assert.match(workflow, /\[tiktok-state\]/u);
  assert.match(workflow, /TIKTOK_ADMIN_SECRET/u);
});

