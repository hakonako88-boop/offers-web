import test from 'node:test';
import './telegram-caption-quality.test.mjs';
import assert from 'node:assert/strict';
import { couponOptions } from '../scripts/coupon-options.mjs';
import { meaningfulSaving, offerQuality } from '../scripts/offer-quality-score.mjs';
import { formatTelegramDealCard } from '../scripts/offer-presentation.mjs';
test('alternative coupons are distinct and cashback is never a copyable code', () => {
  assert.deepEqual(couponOptions('ESD1139 / AEES39 / ESD1139 / CASHBACK'), { codes:['ESD1139','AEES39'], cashback:['CASHBACK'] });
  assert.deepEqual(couponOptions('AHORRA-20'), { codes:['AHORRA-20'], cashback:[] });
});
test('a five cent saving is not an automatic deal, even with a coupon', () => {
  assert.equal(meaningfulSaving({price:'46,90 €',previousPrice:'46,95 €'}),false);
  assert.equal(offerQuality({title:'Refrigeración líquida MSI MAG CORELIQUID',price:'46,90 €',previousPrice:'46,95 €',coupon:'TEST',image:'/a.jpg',url:'https://example.com',date:Date.now()/1000}).publishable,false);
  assert.equal(meaningfulSaving({price:'5,23 €',previousPrice:'9,90 €'}),true);
  assert.equal(meaningfulSaving({price:99,previousPrice:100}),true);
});
test('caption distinguishes alternatives and does not repeat the product description', () => {
  const title='Neutrogena Fórmula Noruega Crema Manos Concentrada con Perfume 50 ml pack 2';
  const caption=formatTelegramDealCard({title,description:title+' con glicerina y vitamina E',store:'Amazon',price:'5,23 €',coupon:'UNO / DOS / CASHBACK'});
  assert.ok(!caption.includes('✨'));
  assert.ok(caption.includes('<code>UNO</code>'));
  assert.ok(caption.includes('Alternativa: <code>DOS</code>'));
  assert.ok(!caption.includes('<code>CASHBACK</code>'));
  assert.ok(!caption.includes('ya incluye el cupón'));
  assert.ok(caption.includes('#Publi'));
});
test('missing product facts are not fabricated in category descriptions', () => {
  const caption=formatTelegramDealCard({title:'Ventilador SPARK',price:'17 €',store:'AliExpress'});
  assert.ok(!caption.includes('dirección ajustable'));
  assert.ok(!caption.includes('Ideal para'));
});
