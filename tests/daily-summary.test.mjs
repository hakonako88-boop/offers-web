import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildDailySummary, selectDailyOffers } from '../scripts/publish-daily-summary.mjs';

function offer({ id, store, price, previousPrice, date, coupon = '' }) {
  return { source_product_id: id, title: `Producto interesante ${id}`, store, price, previousPrice, date, coupon, image: `/tg/${id}.jpg`, url: `https://example.com/${id}` };
}

test('selects complete high-saving offers from the requested Madrid day and diversifies stores', () => {
  const target = '2026-08-25';
  const midday = Math.floor(Date.parse('2026-08-25T12:00:00+02:00') / 1000);
  const offers = [
    offer({ id: 'a1', store: 'Amazon', price: '20,00 €', previousPrice: '100,00 €', date: midday }),
    offer({ id: 'a2', store: 'Amazon', price: '30,00 €', previousPrice: '100,00 €', date: midday }),
    offer({ id: 'a3', store: 'Amazon', price: '40,00 €', previousPrice: '100,00 €', date: midday }),
    offer({ id: 'm1', store: 'Miravia', price: '50,00 €', previousPrice: '100,00 €', date: midday }),
    offer({ id: 'p1', store: 'PcComponentes', price: '60,00 €', previousPrice: '100,00 €', date: midday }),
    offer({ id: 'old', store: 'AliExpress', price: '1,00 €', previousPrice: '100,00 €', date: midday - 86400 }),
    { ...offer({ id: 'broken', store: 'AliExpress', price: '1,00 €', previousPrice: '100,00 €', date: midday }), image: '' },
  ];
  const selected = selectDailyOffers(offers, target);
  assert.deepEqual(selected.map((item) => item.source_product_id), ['a1', 'm1', 'p1', 'a2']);
  assert.equal(selected.filter((item) => item.store === 'Amazon').length, 2);
});

test('creates a compact Telegram summary with affiliate destinations and a web post', () => {
  const date = Math.floor(Date.parse('2026-08-25T12:00:00+02:00') / 1000);
  const offers = [
    offer({ id: 'one', store: 'AliExpress', price: '12,99 €', previousPrice: '29,99 €', date, coupon: 'AHORRA3' }),
    offer({ id: 'two', store: 'PcComponentes', price: '299,00 €', previousPrice: '399,00 €', date }),
  ];
  const summary = buildDailySummary(offers, '2026-08-25');
  assert.match(summary.telegram, /LAS MEJORES OFERTAS DEL DÍA/u);
  assert.match(summary.telegram, /https:\/\/example\.com\/one/u);
  assert.match(summary.telegram, /Cupón: AHORRA3/u);
  assert.equal(summary.post.id, 'resumen-diario-2026-08-25');
  assert.equal(summary.post.image, '/tg/one.jpg');
});

test('schedules both possible Madrid midnights and stores duplicate protection', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/daily-summary.yml', import.meta.url), 'utf8');
  const script = fs.readFileSync(new URL('../scripts/publish-daily-summary.mjs', import.meta.url), 'utf8');
  assert.match(workflow, /cron:\s*"0 22,23 \* \* \*"/u);
  assert.match(workflow, /TELEGRAM_BOT_TOKEN/u);
  assert.match(script, /Europe\/Madrid/u);
  assert.match(script, /publishedDates/u);
});
