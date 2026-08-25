import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AWIN_RETAILERS,
  createOwnedAwinLink,
  isOwnedAwinLink,
  normalizeRetailProduct,
  originalImageFromProductServe,
  retailerFeedEntries,
  retailQualityScore,
  socialImageFromHtml,
} from '../scripts/awin-retailers.mjs';

const pc = AWIN_RETAILERS.find((retailer) => retailer.store === 'PcComponentes');
const eci = AWIN_RETAILERS.find((retailer) => retailer.store === 'El Corte Inglés');

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

test('applies a stricter El Corte Inglés editorial filter', () => {
  assert.equal(retailQualityScore({ title: 'Maxi pamela de paja', category: 'Moda', price: 176, oldPrice: 440 }, eci), 0);
  assert.equal(retailQualityScore({ title: 'Colchón de muelles ensacados', category: 'Hogar', price: 580, oldPrice: 1160 }, eci), 0);
  assert.equal(retailQualityScore({ title: 'Vestido de fiesta con pedrería', category: 'Moda', price: 75, oldPrice: 250 }, eci), 0);
  assert.equal(retailQualityScore({ title: 'Bolso de mano marca desconocida', category: 'Moda', price: 140, oldPrice: 350 }, eci), 0);
  assert.ok(retailQualityScore({ title: 'Proyector Samsung The Freestyle Smart TV', category: 'Tecnología', price: 449, oldPrice: 999 }, eci) > 0);
  assert.ok(retailQualityScore({ title: 'Zapatillas Adidas Ultraboost', category: 'Moda y calzado', price: 72, oldPrice: 130 }, eci) > 0);
});

test('applies a PcComponentes filter for popular products and credible brands', () => {
  assert.equal(retailQualityScore({ title: 'AMD EPYC 7443 2.85GHz servidor', category: 'Procesadores', price: 789, oldPrice: 2875 }, pc), 0);
  assert.equal(retailQualityScore({ title: 'Epical-Q Soho179 Ryzen 7 ordenador', category: 'Ordenadores', price: 799, oldPrice: 2429 }, pc), 0);
  assert.equal(retailQualityScore({ title: 'TV Philips 43HFL6214U 43\" 4K Smart TV', category: 'Televisores', price: 423, oldPrice: 800 }, pc), 0);
  assert.equal(retailQualityScore({ title: 'Auriculares Jabra Engage 50 para contact center', category: 'Audio', price: 162, oldPrice: 436 }, pc), 0);
  assert.equal(retailQualityScore({ title: 'Marco de fotos digital Arzopa 15 pulgadas', category: 'Electrónica', price: 125, oldPrice: 499 }, pc), 0);
  assert.equal(retailQualityScore({ title: 'Bicicleta eléctrica URLIFE plegable', category: 'Movilidad', price: 449, oldPrice: 999 }, pc), 0);
  assert.equal(retailQualityScore({ title: 'TV LG OLED 83 pulgadas', category: 'Televisores', price: 2275, oldPrice: 5999 }, pc), 0);
  assert.ok(retailQualityScore({ title: 'Portátil gaming Lenovo Legion RTX 5070', category: 'Informática', price: 1199, oldPrice: 1599 }, pc) > 0);
  assert.ok(retailQualityScore({ title: 'Samsung QLED The Frame 50 pulgadas Smart TV', category: 'Televisores', price: 669, oldPrice: 1299 }, pc) > 0);
  assert.ok(retailQualityScore({ title: 'Roborock robot aspirador con autovaciado', category: 'Hogar', price: 259, oldPrice: 599 }, pc) > 0);
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

test('unwraps PcComponentes original images from Awin thumbnails', () => {
  const wrapped = 'https://images2.productserve.com/?w=200&h=200&url=ssl%3Aimg.pccomponentes.com%2Farticles%2F1094%2Fproduct.jpg';
  assert.equal(
    originalImageFromProductServe(wrapped, pc),
    'https://img.pccomponentes.com/articles/1094/product.jpg',
  );
  const untrusted = 'https://images2.productserve.com/?url=ssl%3Aexample.com%2Fproduct.jpg';
  assert.equal(originalImageFromProductServe(untrusted, pc), '');
});
