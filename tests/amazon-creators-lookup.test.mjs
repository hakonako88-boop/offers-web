import assert from 'node:assert/strict';
import test from 'node:test';
import { lookupAmazonProduct } from '../scripts/amazon-creators-lookup.mjs';

test('retrieves exact Amazon inbox facts by ASIN and keeps this affiliate tag', async () => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, body: options.body ? JSON.parse(options.body) : {} });
    if (String(url).includes('/auth/o2/token')) return { ok: true, json: async () => ({ access_token: 'token' }) };
    return {
      ok: true,
      json: async () => ({
        itemsResult: { items: [{
          asin: 'B0DSLBN5FS',
          detailPageURL: 'https://www.amazon.es/dp/B0DSLBN5FS?tag=chollos00a-21',
          itemInfo: { title: { displayValue: 'Roborock QV 35A Set Robot Aspirador 8000Pa' } },
          images: { primary: { large: { url: 'https://m.media-amazon.com/roborock.jpg' } } },
          offersV2: { listings: [{ isBuyBoxWinner: true, price: { money: { amount: 399.99 }, savingBasis: { money: { amount: 599.99 } } } }] },
        }] },
      }),
    };
  };
  const metadata = await lookupAmazonProduct(
    'https://www.amazon.es/dp/B0DSLBN5FS?tag=chollos00a-21',
    { credentialId: 'id', credentialSecret: 'secret', version: '3.2', partnerTag: 'chollos00a-21' },
    fetchImpl,
  );
  assert.equal(metadata.productId, 'B0DSLBN5FS');
  assert.equal(metadata.price, 399.99);
  assert.equal(metadata.previousPrice, 599.99);
  assert.match(metadata.title, /Roborock QV 35A/u);
  assert.equal(metadata.finalUrl, 'https://www.amazon.es/dp/B0DSLBN5FS?tag=chollos00a-21');
  assert.deepEqual(requests[1].body.itemIds, ['B0DSLBN5FS']);
});
