import assert from 'node:assert/strict';
import test from 'node:test';
import {
  amazonAsinFromUrl,
  buildAmazonReviewDraft,
  canonicalAmazonAffiliateUrl,
  resolveAmazonAsin,
} from '../scripts/amazon-review-drafts.mjs';

test('extracts ASIN from direct Amazon URLs', () => {
  assert.equal(amazonAsinFromUrl('https://www.amazon.es/dp/B0DGG9F59B?tag=someone-21'), 'B0DGG9F59B');
  assert.equal(amazonAsinFromUrl('https://link.amazon/B07KVoJUa'), '');
});

test('resolves a link.amazon share URL before extracting its ASIN', async () => {
  const asin = await resolveAmazonAsin('https://link.amazon/B07KVoJUa', async () => ({
    url: 'https://www.amazon.es/dp/B07W5JKFQC?tag=someone-21',
  }));
  assert.equal(asin, 'B07W5JKFQC');
});

test('replaces another publisher tag with the ChollosAlDia tag', () => {
  assert.equal(
    canonicalAmazonAffiliateUrl('B0DGG9F59B', 'chollos00a-21'),
    'https://www.amazon.es/dp/B0DGG9F59B?tag=chollos00a-21',
  );
});

test('builds a complete reviewed draft from a factual Amazon source post', async () => {
  const result = await buildAmazonReviewDraft({
    partnerTag: 'chollos00a-21',
    item: {
      id: 'telegram-ofertos:1:amazon:0',
      store: 'Amazon',
      merchantUrl: 'https://www.amazon.es/dp/B0DGG9F59B?tag=another-21',
      sourceUrl: 'https://t.me/Ofertos/1',
      text: '🔥 Pantene Pro-V Repara y Protege Mascarilla de Keratina, Pelo Dañado, 3x300ml 🔥 | #Amazon #Publicidad 📉 DESCUENTO: 33% 🔥 Precio: 9,99€ ❌ Precio recomendado: 14,99€ 👉 Ver aquí en Amazon',
    },
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.offer.price, 9.99);
  assert.equal(result.offer.previousPrice, 14.99);
  assert.equal(result.offer.discount, 33);
  assert.equal(result.offer.url, 'https://www.amazon.es/dp/B0DGG9F59B?tag=chollos00a-21');
  assert.match(result.offer.imageUrl, /^https:\/\/m\.media-amazon\.com\/images\/(?:I|P)\//u);
  assert.equal(result.offer.sourceProductId, 'amazon:B0DGG9F59B');
  assert.doesNotMatch(result.offer.title, /Oferta reenviada/iu);
});

test('understands Amazon source posts that show a pair of prices after the money icon', async () => {
  const result = await buildAmazonReviewDraft({
    partnerTag: 'chollos00a-21',
    item: {
      id: 'telegram-chollosdiario:1:amazon:0',
      store: 'Amazon',
      merchantUrl: 'https://www.amazon.es/dp/B0F6VQBY29?tag=other-21',
      text: '⚡️ TOP CHOLLO ⭐️ Princess SlimFry Airfryer, 8L Capacidad, 2000W 💰 94,99€ 104,99€ 💥 Ahorras 10,00€ (10%) #Amazon',
    },
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.offer.price, 94.99);
  assert.equal(result.offer.previousPrice, 104.99);
});

test('refuses to prepare incomplete source posts', async () => {
  const result = await buildAmazonReviewDraft({
    partnerTag: 'chollos00a-21',
    item: {
      id: 'telegram-source:1:amazon:0',
      store: 'Amazon',
      merchantUrl: 'https://www.amazon.es/dp/B0DGG9F59B',
      text: 'Producto sin precio verificable',
    },
  });
  assert.equal(result.status, 'needs_details');
  assert.ok(result.missing.includes('precio'));
});
