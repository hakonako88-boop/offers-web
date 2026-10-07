import assert from 'node:assert/strict';
import test from 'node:test';
import { todayNoloAmazonCandidates } from '../scripts/publish-nolo-today.mjs';

test('selecciona productos Amazon de hoy, conserva el precio y descarta páginas generales', async () => {
  const now = Date.parse('2026-10-06T12:00:00Z');
  const posts = [
    {
      link: 'https://nolodejesescapar.com/oferta-producto/',
      date_gmt: '2026-10-06T09:00:00',
      title: { rendered: 'Ofertón Amazon! Monitor OLED por 199,99€' },
      excerpt: { rendered: '' },
      content: { rendered: '<a href="https://www.amazon.es/dp/B0ABCDEFGH">Comprar en Amazon</a>' },
      yoast_head_json: { og_image: [{ url: 'https://example.com/product.jpg' }] },
    },
    {
      link: 'https://nolodejesescapar.com/fiesta-prime/',
      date_gmt: '2026-10-06T08:00:00',
      title: { rendered: 'Todas las ofertas de la Fiesta Prime' },
      excerpt: { rendered: '' },
      content: { rendered: '<a href="https://www.amazon.es/prime">Ver campaña</a>' },
    },
  ];
  const offers = await todayNoloAmazonCandidates({ posts, now });
  assert.equal(offers.length, 1);
  assert.equal(offers[0].asin, 'B0ABCDEFGH');
  assert.equal(offers[0].priceAmount, 199.99);
  assert.equal(offers[0].title, 'Monitor OLED');
});
