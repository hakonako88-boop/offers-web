import assert from 'node:assert/strict';
import test from 'node:test';
import { miraviaAwinAffiliateUrl, miraviaProductIdFromHtml, miraviaProductIdFromUrl } from '../scripts/miravia-affiliate-resolver.mjs';

test('extracts a Miravia/Awin product id from an existing affiliate click', () => {
  assert.equal(
    miraviaProductIdFromUrl('https://www.awin1.com/pclick.php?p=42552297239&a=2023977&m=37168'),
    '42552297239',
  );
});

test('reads a Miravia product id from public product markup', () => {
  assert.equal(miraviaProductIdFromHtml('<script>{"productId":"42552297239"}</script>'), '42552297239');
});

test('creates this publisher’s Miravia Awin link from a product id', () => {
  assert.equal(
    miraviaAwinAffiliateUrl('42552297239'),
    'https://www.awin1.com/pclick.php?p=42552297239&a=2023977&m=37168',
  );
});
