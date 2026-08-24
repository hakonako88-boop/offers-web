import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AWIN_RETAILERS,
  createOwnedAwinLink,
  isOwnedAwinLink,
  normalizeRetailProduct,
  retailerFeedEntries,
  retailQualityScore,
  socialImageFromHtml,
} from '../scripts/awin-retailers.mjs';

const pc = AWIN_RETAILERS.find((retailer) => retailer.store === 'PcComponentes');

test('keeps only the requested merchant feeds', () => {
  const feeds = retailerFeedEntries([
    { advertiser_id: '20982', language: 'Spanish', url: 'https://feeds.awin.com/pc.csv' },
    { advertiser_id: '37168', language: 'Spanish', url: 'https://feeds.awin.com/miravia.csv' },
  ], pc);
  assert.equal(feeds.length, 1);
});

test('creates and validates a link owned by publisher 2021553', () => {
  const link = createOwnedAwinLink('https://www.pccomponentes.com/portatil-ejemplo', pc);
  assert.equal(isOwnedAwinLink(link, pc.merchantId), true);
  assert.equal(isOwnedAwinLink(link.replace('2021553', '999999'), pc.merchantId), false);
  assert.equal(createOwnedAwinLink('https://example.com/producto', pc), '');
});

test('rejects inflated or uninteresting catalogue rows', () => {
  assert.equal(retailQualityScore({ title: 'Funda de plástico', price: 4, oldPrice: 40 }), 0);
  assert.equal(retailQualityScore({ title: 'Portátil gaming Lenovo', category: 'Informática', price: 699, oldPrice: 899 }) > 0, true);
});

test('normalizes a real discounted product and never borrows another publisher link', () => {
  const offer = normalizeRetailProduct({
    aw_product_id: 'sku-42',
    product_name: 'Portátil gaming Lenovo 16 GB RAM',
    aw_image_url: 'https://images2.productserve.com/?w=200&h=200&url=thumbnail.jpg',
    merchant_image_url: 'https://cdn.pccomponentes.com/product-original.jpg',
    search_price: '699.00',
    product_price_old: '899.00',
    merchant_category: 'Informática',
    aw_deep_link: 'https://www.awin1.com/cread.php?awinmid=20982&awinaffid=999999&ued=https%3A%2F%2Fwww.pccomponentes.com%2Fportatil-ejemplo',
    merchant_deep_link: 'https://www.pccomponentes.com/portatil-ejemplo',
    in_stock: '1',
  }, pc);
  assert.ok(offer);
  assert.equal(offer.store, 'PcComponentes');
  assert.equal(offer.image, 'https://cdn.pccomponentes.com/product-original.jpg');
  assert.equal(isOwnedAwinLink(offer.url, '20982'), true);
  assert.equal(offer.discount, 22);
});

test('recovers an official high-resolution social image from a product page', () => {
  const html = '<meta property="og:image" content="https://cdn.example.com/product-1200.jpg?x=1&amp;y=2">';
  assert.equal(socialImageFromHtml(html), 'https://cdn.example.com/product-1200.jpg?x=1&y=2');
});
