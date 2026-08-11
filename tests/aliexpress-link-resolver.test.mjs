import assert from 'node:assert/strict';
import test from 'node:test';
import { aliexpressProductId, metadataFromAliExpressProduct } from '../scripts/aliexpress-link-resolver.mjs';

test('extracts an AliExpress product id from an attributed destination URL', () => {
  assert.equal(aliexpressProductId('https://www.aliexpress.com/item/1005011620902362.html?aff_fsk=example'), '1005011620902362');
});

test('converts affiliate API product data into publishable metadata', () => {
  assert.deepEqual(metadataFromAliExpressProduct({
    product_title: 'Auriculares inalámbricos con cancelación de ruido',
    product_main_image_url: 'https://example.test/image.jpg',
    target_sale_price: '19.99',
    target_original_price: '39.99',
  }), {
    title: 'Auriculares inalámbricos con cancelación de ruido',
    description: 'Auriculares inalámbricos con cancelación de ruido',
    imageUrl: 'https://example.test/image.jpg',
    price: 19.99,
    previousPrice: 39.99,
  });
});
