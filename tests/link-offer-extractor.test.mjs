import assert from 'node:assert/strict';
import test from 'node:test';
import { productMetadataFromHtml } from '../scripts/link-offer-extractor.mjs';

test('extracts title, image and prices from public product metadata', () => {
  const result = productMetadataFromHtml(`
    <meta property="og:title" content="Auriculares inalámbricos">
    <meta property="og:image" content="/producto.jpg">
    <script type="application/ld+json">{"@type":"Product","name":"Auriculares inalámbricos","description":"Con cancelación de ruido","image":"/producto.jpg","offers":{"price":"19,99","highPrice":"39,99"}}</script>
  `, 'https://tienda.example/producto');
  assert.equal(result.title, 'Auriculares inalámbricos');
  assert.equal(result.imageUrl, 'https://tienda.example/producto.jpg');
  assert.equal(result.price, 19.99);
  assert.equal(result.previousPrice, 39.99);
});
