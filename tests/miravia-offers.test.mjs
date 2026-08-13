import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatMiraviaCaption,
  formatMiraviaTelegramCaption,
  highResolutionMiraviaImage,
  isMiraviaProductImageLargeEnough,
  isGzipFeed,
  miraviaQualityScore,
  miraviaFeedEntries,
  normalizeMiraviaProduct,
  parseFeedList,
  productImageFromPage,
  selectMiraviaFeed,
} from '../scripts/miravia-offers.mjs';

test('keeps only the Spanish Miravia feeds available to the private network', () => {
  const entries = miraviaFeedEntries(parseFeedList([
    'Advertiser ID,Advertiser Name,Language,Feed ID,Feed Name,URL',
    '37168,Miravia Private Network,Spanish,99603,Miravia ES 2_new local,https://feeds.example/local-2',
    '37168,Miravia Private Network,Spanish,99604,Miravia ES 4_new local,https://feeds.example/local-4',
    '37168,Miravia Private Network,English,114937,Premium product feed,https://feeds.example/premium',
    '99999,Another Merchant,Spanish,1,Other,https://feeds.example/other',
  ].join('\n')));

  assert.equal(entries.length, 2);
  assert.equal(selectMiraviaFeed(entries, 0).feed_id, '99603');
  assert.equal(selectMiraviaFeed(entries, 1).feed_id, '99604');
});

test('normalizes a real Miravia deal only when it has price, image and tracking URL', () => {
  const offer = normalizeMiraviaProduct({
    aw_product_id: 'sku-123',
    product_name: 'Auriculares inalámbricos con cancelación de ruido',
    aw_deep_link: 'https://www.awin1.com/cread.php?s=affiliate-link',
    aw_image_url: 'https://cdn.example/auriculares.jpg',
    search_price: '24,99',
    product_price_old: '59,99',
    in_stock: '1',
    merchant_category: 'Electronics',
    reviews: '200',
  });

  assert.equal(offer.id, 'miravia-sku-123');
  assert.equal(offer.price, 24.99);
  assert.equal(offer.discount, 58);
  assert.equal(offer.category, 'Tecnología');
  assert.match(formatMiraviaCaption(offer), /MIRAVIA/);
  assert.match(formatMiraviaCaption(offer), /58%/);
  assert.match(formatMiraviaCaption(offer), /Ahorras/);
  assert.match(formatMiraviaCaption(offer), /CHOLLO EN MIRAVIA/);
  assert.match(formatMiraviaTelegramCaption(offer), /#Miravia/);
  assert.match(formatMiraviaTelegramCaption(offer), /<s>59,99 €<\/s>/);
  assert.match(formatMiraviaTelegramCaption(offer), /PRECIO OFERTA/);
  assert.doesNotMatch(formatMiraviaTelegramCaption(offer), /Categoría/);
});

test('rejects inflated home-textile catalogue items even when their percentage is high', () => {
  const offer = normalizeMiraviaProduct({
    aw_product_id: 'sku-cushion',
    product_name: 'Tesosy Relleno de Cojín 35 X 55 Cm Fibra Virgen Hueca Siliconada',
    aw_deep_link: 'https://www.awin1.com/cread.php?s=affiliate-link',
    aw_image_url: 'https://cdn.example/cojin.jpg',
    search_price: '12,99',
    product_price_old: '64,95',
    in_stock: '1',
    merchant_category: 'Bedding & Bath > Bedding > Pillows & Bolsters',
  });

  assert.equal(offer, null);
});

test('rejects a Miravia product that is out of stock or has no real saving', () => {
  const base = {
    aw_product_id: 'sku-456',
    product_name: 'Producto sin descuento',
    aw_deep_link: 'https://www.awin1.com/cread.php?s=affiliate-link',
    aw_image_url: 'https://cdn.example/producto.jpg',
    search_price: '25.00',
    product_price_old: '28.00',
  };

  assert.equal(normalizeMiraviaProduct(base), null);
  assert.equal(normalizeMiraviaProduct({ ...base, product_price_old: '50.00', in_stock: '0' }), null);
});

test('keeps only proven, high-interest Miravia deals and rejects catalogue filler', () => {
  const promising = normalizeMiraviaProduct({
    aw_product_id: 'sku-console-headset',
    product_name: 'Logitech Auriculares Gaming Inalámbricos G Pro X',
    aw_deep_link: 'https://www.awin1.com/cread.php?s=affiliate-link',
    aw_image_url: 'https://cdn.example/headset.jpg',
    search_price: '59,99',
    product_price_old: '129,99',
    in_stock: '1',
    merchant_category: 'Electronics > Gaming',
    reviews: '250',
  });
  const filler = normalizeMiraviaProduct({
    aw_product_id: 'sku-mesh',
    product_name: 'Mini Rollo Malla Ocultación Verde',
    aw_deep_link: 'https://www.awin1.com/cread.php?s=affiliate-link',
    aw_image_url: 'https://cdn.example/mesh.jpg',
    search_price: '12,79',
    product_price_old: '64,95',
    in_stock: '1',
    merchant_category: 'Home & Garden > Fencing',
    reviews: '300',
  });
  assert.ok(promising.score >= 100);
  assert.equal(filler, null);
  assert.equal(miraviaQualityScore({
    title: 'Auriculares Gaming genéricos',
    category: 'Electronics > Gaming',
    price: 25,
    oldPrice: 60,
    reviews: 2,
  }), 0);
});

test('rejects table linen even when it is listed under a high-interest kitchen category', () => {
  assert.equal(miraviaQualityScore({
    title: 'Mantel antimanchas para mesa de comedor',
    category: 'Kitchen & Dining > Kitchen & Table Linen',
    price: 18,
    oldPrice: 90,
    reviews: 300,
  }), 0);
});

test('rejects the tiny Miravia feed thumbnails before publication', () => {
  assert.equal(isMiraviaProductImageLargeEnough(3_732), false);
  assert.equal(isMiraviaProductImageLargeEnough(11_999), false);
  assert.equal(isMiraviaProductImageLargeEnough(12_000), true);
});

test('requires meaningful demand for an unbranded Miravia catalogue product', () => {
  assert.equal(miraviaQualityScore({
    title: 'Luz LED USB para escritorio',
    category: 'Electronics > Lighting',
    price: 14,
    oldPrice: 39,
    reviews: 60,
  }), 0);
});

test('accepts a proven-brand deal without feed reviews only when its saving is substantial', () => {
  assert.ok(miraviaQualityScore({
    title: 'Sony Auriculares inalÃ¡mbricos con cancelaciÃ³n de ruido',
    category: 'Electronics > Audio',
    price: 49.99,
    oldPrice: 109.99,
    reviews: 0,
  }) > 0);
  assert.equal(miraviaQualityScore({
    title: 'Sony Auriculares inalÃ¡mbricos',
    category: 'Electronics > Audio',
    price: 39.99,
    oldPrice: 59.99,
    reviews: 0,
  }), 0);
});

test('recognizes the gzip downloads produced by Awin feeds', () => {
  assert.equal(isGzipFeed('https://feeds.example/compression/gzip/products'), true);
  assert.equal(isGzipFeed('https://feeds.example/products', 'gzip'), true);
  assert.equal(isGzipFeed('https://feeds.example/products'), false);
});

test('prefers the high-resolution product image exposed by Miravia over a feed thumbnail', () => {
  const image = productImageFromPage(
    '<meta content="https://img2.miravia.es/g/fb/kf/product.png_720x720q75.jpg" property="og:image">',
    'https://img2.miravia.es/g/fb/kf/product.png_200x200q75.jpg',
  );
  assert.match(image, /720x720/);
  assert.equal(productImageFromPage('<meta property="og:image" content="https://images.example/product.jpg">', 'https://cdn.example/thumb.jpg'), 'https://cdn.example/thumb.jpg');
  assert.equal(
    productImageFromPage('<meta property="og:image" content="https://cdn.merchant.example/product.jpg">', 'https://cdn.example/thumb.jpg', { allowExternalCdn: true }),
    'https://cdn.merchant.example/product.jpg',
  );
});

test('upgrades the small Miravia feed rendition to a card-ready CDN image', () => {
  assert.equal(
    highResolutionMiraviaImage('https://img2.miravia.es/g/fb/kf/product.png_200x200q75.jpg'),
    'https://img2.miravia.es/g/fb/kf/product.png_720x720q85.jpg',
  );
  assert.equal(highResolutionMiraviaImage('https://cdn.example/product.jpg'), 'https://cdn.example/product.jpg');
});
