import assert from 'node:assert/strict';
import test from 'node:test';
import { formatAliExpressCaption, formatAliExpressTelegramCaption } from '../scripts/aliexpress-offers.mjs';
import { filterDuplicateDeals } from '../scripts/offer-deduplication.mjs';

test('keeps personalised price eligibility visible on Telegram and the web', () => {
  const offer = {
    title: 'Coca-Cola pack de 24 latas de 330 ml', priceLabel: 'Desde 10,10 €',
    previousPriceLabel: '18,10 €', price: 10.10, previousPrice: 18.10,
    description: 'Solo cuentas con ventaja personalizada de 5 € y cupón compatible de 3 €. No disponible para todos.',
    coupon: 'ESD1103', discount: 44, url: 'https://example.com/product',
  };
  for (const caption of [formatAliExpressCaption(offer), formatAliExpressTelegramCaption(offer)]) {
    assert.match(caption, /Desde 10,10/);
    assert.match(caption, /ventaja personalizada de 5/);
    assert.match(caption, /No disponible para todos/);
  }
});

test('an AliExpress pack is not discarded merely because Amazon offered the same brand', () => {
  const title = 'Coca-Cola Sabor Original refresco de cola Pack de 24 x 330 ml';
  const candidate = { title, store: 'AliExpress', sourceProductId: 'aliexpress:1005008375729710', url: 'https://s.click.aliexpress.com/e/example' };
  const existing = [{ title, store: 'Amazon', source_product_id: 'amazon:B00DPKUKPC' }];
  assert.equal(filterDuplicateDeals([candidate], existing).length, 1);
  assert.equal(filterDuplicateDeals([candidate], [{ ...candidate }]).length, 0);
});
