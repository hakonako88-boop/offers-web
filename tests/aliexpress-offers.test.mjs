import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAliExpressSignature,
  formatAliExpressCaption,
  formatAliExpressTelegramCaption,
  normalizeAliExpressProduct,
  topicsForAliExpressRun,
} from '../scripts/aliexpress-offers.mjs';

test('signs AliExpress API parameters in canonical order', () => {
  const signature = createAliExpressSignature({
    app_key: '535312',
    method: 'aliexpress.affiliate.product.query',
    sign_method: 'sha256',
    timestamp: '20260811120000',
    v: '2.0',
  }, 'app-secret-for-test');

  assert.equal(signature, '38C9C295F38B6F7A989F17B0F20E5F36E10F883CC6A3E101A5775BB1B7742812');
});

test('keeps only discounted AliExpress products with an affiliate link', () => {
  const offer = normalizeAliExpressProduct({
    product_id: 123456,
    product_title: 'Auriculares inalámbricos con cancelación de ruido',
    product_main_image_url: 'https://ae-pic.example/product.jpg',
    promotion_link: 'https://s.click.aliexpress.com/e/example',
    target_sale_price: '24.99',
    target_original_price: '59.99',
    discount: '58%',
    lastest_volume: 250,
    commission_rate: '8.5%',
    first_level_category_name: 'Electrónica',
  }, 'Tecnología', ['auriculares']);

  assert.equal(offer.id, '123456');
  assert.equal(offer.price, 24.99);
  assert.equal(offer.discount, 58);
  assert.equal(offer.siteCategory, 'Tecnología');
  assert.match(formatAliExpressCaption(offer), /24,99\s?€/);
  assert.match(formatAliExpressCaption(offer), /58%/);
  assert.match(formatAliExpressCaption(offer), /Ahorras/);
  assert.match(formatAliExpressCaption(offer), /CHOLLO EN ALIEXPRESS/);
  assert.match(formatAliExpressTelegramCaption(offer), /CHOLLO EN ALIEXPRESS/);
  assert.match(formatAliExpressTelegramCaption(offer), /<s>59,99 €<\/s>/);
  assert.match(formatAliExpressTelegramCaption(offer), /\n\n<b>/);
  assert.doesNotMatch(formatAliExpressTelegramCaption(offer), /Categoría/);
});

test('rejects normal-priced products without a real discount', () => {
  assert.equal(normalizeAliExpressProduct({
    product_id: 999,
    product_title: 'Producto normal',
    product_main_image_url: 'https://ae-pic.example/product.jpg',
    promotion_link: 'https://s.click.aliexpress.com/e/example',
    target_sale_price: '29.99',
    target_original_price: '31.99',
    discount: '6%',
  }, 'Tecnología'), null);
});

test('rejects products without enough recent demand', () => {
  assert.equal(normalizeAliExpressProduct({
    product_id: 998,
    product_title: 'Producto nuevo sin pedidos',
    product_main_image_url: 'https://ae-pic.example/product.jpg',
    promotion_link: 'https://s.click.aliexpress.com/e/example',
    target_sale_price: '9.99',
    target_original_price: '29.99',
    discount: '66%',
    lastest_volume: 0,
  }, 'Tecnología'), null);
});

test('rejects a discounted product when its title does not match the searched category', () => {
  assert.equal(normalizeAliExpressProduct({
    product_id: 997,
    product_title: 'Rueda de hendido para manualidades',
    product_main_image_url: 'https://ae-pic.example/product.jpg',
    promotion_link: 'https://s.click.aliexpress.com/e/example',
    target_sale_price: '9.99',
    target_original_price: '29.99',
    discount: '66%',
    lastest_volume: 100,
  }, 'Tecnología', ['teclado', 'keyboard']), null);
});

test('rotates AliExpress searches between executions', () => {
  assert.notEqual(topicsForAliExpressRun(0, 2)[0].keywords, topicsForAliExpressRun(2, 2)[0].keywords);
});
