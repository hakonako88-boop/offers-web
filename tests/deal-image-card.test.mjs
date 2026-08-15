import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { createDealImageCard, dealImageCardFilename } from '../scripts/deal-image-card.mjs';

test('builds a square branded JPEG from the clean product image', async () => {
  const product = Buffer.from(`
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#ffffff"/>
      <circle cx="400" cy="300" r="210" fill="#dbeafe" stroke="#2563eb" stroke-width="28"/>
    </svg>
  `);
  const result = await createDealImageCard({
    imageBytes: product,
    store: 'AliExpress',
    price: '169,00 €',
    previousPrice: '299,00 €',
    discount: 43,
  });
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 1200);
  assert.ok(result.length > 20_000);
});

test('creates safe and recognisable Telegram filenames', () => {
  assert.equal(dealImageCardFilename('AliExpress', '123/ABC'), 'aliexpress-123-ABC-telegram.jpg');
});
