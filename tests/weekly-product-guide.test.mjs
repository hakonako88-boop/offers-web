import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildWeeklyProductGuide, selectWeeklyProducts } from '../scripts/publish-weekly-product-guide.mjs';

function offer(id, title, store, price, previousPrice, date, coupon = '') {
  return { source_product_id: id, title, store, price, previousPrice, date, coupon, image: `/tg/${id}.jpg`, url: `https://example.com/${id}`, source: 'ofertos', sourceHeat: 200 };
}

test('selects diverse useful weekly products and excludes filler', () => {
  const now = new Date('2026-09-13T10:00:00Z');
  const date = Math.floor(new Date('2026-09-12T10:00:00Z').getTime() / 1000);
  const selected = selectWeeklyProducts([
    offer('robot', 'Robot aspirador Cecotec con estación', 'Amazon', '199,00 €', '299,00 €', date),
    offer('phone', 'Smartphone Samsung Galaxy 5G 256 GB', 'PcComponentes', '299,00 €', '399,00 €', date),
    offer('coffee', 'Café en grano natural pack ahorro', 'Amazon', '12,00 €', '20,00 €', date),
    offer('game', 'Videojuego Nintendo Switch edición española', 'MediaMarkt', '29,00 €', '49,00 €', date),
    offer('inflated-tv', 'Televisor profesional 55 pulgadas', 'PcComponentes', '700,00 €', '1999,00 €', date),
    offer('shoe', 'Zapatillas de moda casual', 'AliExpress', '15,00 €', '80,00 €', date),
  ], now);
  assert.equal(selected.length, 4);
  assert.doesNotMatch(selected.map((item) => item.title).join(' '), /Zapatillas/u);
  assert.doesNotMatch(selected.map((item) => item.title).join(' '), /Televisor profesional/u);
  assert.equal(new Set(selected.map((item) => item.store)).size >= 3, true);
});

test('builds a substantial indexable weekly article from factual prices', () => {
  const date = Math.floor(new Date('2026-09-12T10:00:00Z').getTime() / 1000);
  const products = [
    offer('robot', 'Robot aspirador Cecotec con estación', 'Amazon', '199,00 €', '299,00 €', date),
    offer('phone', 'Smartphone Samsung Galaxy 5G 256 GB', 'PcComponentes', '299,00 €', '399,00 €', date, 'AHORRA20'),
    offer('game', 'Videojuego Nintendo Switch edición española', 'MediaMarkt', '29,00 €', '49,00 €', date),
  ];
  const post = buildWeeklyProductGuide(products, '2026-09-13');
  assert.equal(post.id, 'mejores-productos-semana-2026-09-13');
  assert.match(post.title, /mejores productos en oferta/u);
  assert.match(post.body, /AHORRA20/u);
  assert.match(post.body, /últimos siete días/u);
  assert.equal(post.images.length, 3);
  assert.deepEqual(post.offer_ids, ['robot', 'phone', 'game']);
  const workflow = fs.readFileSync(new URL('../.github/workflows/weekly-product-guide.yml', import.meta.url), 'utf8');
  assert.match(workflow, /30 9,10 \* \* 0/u);
});
