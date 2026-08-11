import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatMiraviaCaption,
  formatMiraviaTelegramCaption,
  isGzipFeed,
  miraviaFeedEntries,
  normalizeMiraviaProduct,
  parseFeedList,
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
  assert.match(formatMiraviaTelegramCaption(offer), /CHOLLO EN MIRAVIA/);
  assert.match(formatMiraviaTelegramCaption(offer), /<s>59,99 €<\/s>/);
  assert.doesNotMatch(formatMiraviaTelegramCaption(offer), /Categoría/);
});

test('turns a catalogue-style title into a shorter Telegram headline with breathing room', () => {
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

  assert.equal(offer.title, 'Relleno de cojín Tesosy 35×55 cm de fibra siliconada');
  const caption = formatMiraviaTelegramCaption(offer);
  assert.match(caption, /<b>🔥 CHOLLO EN MIRAVIA<\/b>\n\n<b>Relleno de cojín Tesosy/);
  assert.match(caption, /<s>64,95 €<\/s>\s{2}➜\s{2}<b>12,99 €<\/b> · <b>−80%<\/b>/);
  assert.match(caption, /#ChollosAlDia #Miravia #Hogar #publi/);
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

test('recognizes the gzip downloads produced by Awin feeds', () => {
  assert.equal(isGzipFeed('https://feeds.example/compression/gzip/products'), true);
  assert.equal(isGzipFeed('https://feeds.example/products', 'gzip'), true);
  assert.equal(isGzipFeed('https://feeds.example/products'), false);
});
