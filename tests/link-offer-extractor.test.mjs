import assert from 'node:assert/strict';
import test from 'node:test';
import { extractProductMetadata, merchantLinkFromHtml, outboundOfferLinkFromHtml, productMetadataFromHtml } from '../scripts/link-offer-extractor.mjs';

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

test('follows a merchant button from a forwarded deals page to the product page', async () => {
  const sourceUrl = 'https://nolodejesescapar.example/oferta/auriculares';
  const amazonUrl = 'https://www.amazon.es/dp/B012345678';
  const pages = new Map([
    [sourceUrl, '<a class="buy" href="/ir/a-amazon">Ver oferta en Amazon</a>'],
    ['https://nolodejesescapar.example/ir/a-amazon', ''],
    [amazonUrl, '<meta property="og:title" content="Auriculares de prueba"><meta property="og:image" content="https://images.example/auriculares.jpg"><meta property="product:price:amount" content="29,99">'],
  ]);
  const fetchImpl = async (url) => {
    const finalUrl = url.endsWith('/ir/a-amazon') ? amazonUrl : url;
    return {
      ok: true,
      url: finalUrl,
      text: async () => pages.get(finalUrl),
    };
  };

  assert.equal(merchantLinkFromHtml(pages.get(sourceUrl), sourceUrl), '');
  assert.equal(outboundOfferLinkFromHtml(pages.get(sourceUrl), sourceUrl), 'https://nolodejesescapar.example/ir/a-amazon');
  const result = await extractProductMetadata(sourceUrl, { fetchImpl });
  assert.equal(result.finalUrl, amazonUrl);
  assert.equal(result.affiliateUrl, amazonUrl);
  assert.equal(result.title, 'Auriculares de prueba');
  assert.equal(result.price, 29.99);
});
