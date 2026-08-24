import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRADEDOUBLER_MEDIAMARKT,
  extractMediaMarktCandidates,
  isOwnedTradeDoublerMediaMarktLink,
  mediaMarktQualityScore,
  normalizeMediaMarktProduct,
  tradeDoublerProductsUrl,
} from '../scripts/tradedoubler-mediamarkt.mjs';

const owned = 'https://pdt.tradedoubler.com/click?a(3457994)p(270504)product(abc)ttid(3)url(https%3A%2F%2Fwww.mediamarkt.es%2Fproducto)';

test('uses only the Spanish MediaMarkt feed and never embeds the token in source constants', () => {
  assert.equal(TRADEDOUBLER_MEDIAMARKT.feedId, '24915');
  assert.equal(TRADEDOUBLER_MEDIAMARKT.programId, '270504');
  assert.match(tradeDoublerProductsUrl('secret', { limit: 500 }), /fid=24915/);
  assert.match(tradeDoublerProductsUrl('secret', { limit: 500 }), /limit=500/);
});

test('accepts only links owned by Chollos al Día for MediaMarkt Spain', () => {
  assert.equal(isOwnedTradeDoublerMediaMarktLink(owned), true);
  assert.equal(isOwnedTradeDoublerMediaMarktLink(owned.replace('3457994', '9999999')), false);
  assert.equal(isOwnedTradeDoublerMediaMarktLink('https://clk.tradedoubler.com/click?p=270504&a=3457994'), true);
  assert.equal(isOwnedTradeDoublerMediaMarktLink('https://www.awin1.com/cread.php?awinmid=1&awinaffid=2021553'), false);
});

test('rejects accessories and weak or implausible discounts', () => {
  assert.equal(mediaMarktQualityScore({ title: 'Cable USB', price: 9, oldPrice: 50 }), 0);
  assert.equal(mediaMarktQualityScore({ title: 'Televisor OLED LG 55 pulgadas', price: 799, oldPrice: 1099 }) > 0, true);
  assert.equal(mediaMarktQualityScore({ title: 'Portátil gaming', price: 99, oldPrice: 999 }), 0);
});

test('normalizes a discounted MediaMarkt product with official image and affiliate link', () => {
  const result = normalizeMediaMarktProduct({
    id: 'td-1',
    name: 'Televisor OLED LG 55 pulgadas 4K',
    description: '<p>Televisor inteligente con panel OLED.</p>',
    productImage: { url: 'https://assets.mediamarkt.es/product.jpg', width: 1200, height: 1200 },
    categories: [{ name: 'Televisores' }],
    offers: [{
      feedId: 24915,
      sourceProductId: 'sku-42',
      productUrl: owned,
      availability: 'In Stock',
      priceHistory: [
        { price: { value: '799.00', currency: 'EUR' }, date: '2026-08-24T10:00:00Z' },
        { price: { value: '1099.00', currency: 'EUR' }, date: '2026-08-20T10:00:00Z' },
      ],
    }],
  });
  assert.ok(result);
  assert.equal(result.store, 'MediaMarkt');
  assert.equal(result.price, 799);
  assert.equal(result.previousPrice, 1099);
  assert.equal(result.discount, 27);
  assert.equal(result.description, 'Televisor inteligente con panel OLED.');
});

test('deduplicates previously published TradeDoubler product ids', () => {
  const payload = {
    products: [{
      name: 'Smartphone Samsung Galaxy 256 GB',
      productImage: { url: 'https://assets.mediamarkt.es/phone.jpg' },
      categories: [{ name: 'Telefonía' }],
      offers: [{ feedId: 24915, sourceProductId: 'phone-1', productUrl: owned, availability: 'In Stock', priceHistory: [
        { price: { value: 499 }, date: '2026-08-24T10:00:00Z' },
        { price: { value: 699 }, date: '2026-08-20T10:00:00Z' },
      ] }],
    }],
  };
  assert.equal(extractMediaMarktCandidates(payload).length, 1);
  assert.equal(extractMediaMarktCandidates(payload, new Set(['tradedoubler-270504-phone-1'])).length, 0);
});
