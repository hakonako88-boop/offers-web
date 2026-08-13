import assert from 'node:assert/strict';
import test from 'node:test';
import {
  miraviaAffiliateUrl,
  miraviaAwinAffiliateUrl,
  miraviaAwinDeepLink,
  miraviaProductIdFromHtml,
  miraviaProductIdFromUrl,
} from '../scripts/miravia-affiliate-resolver.mjs';

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

test('creates this publisher’s Awin deep link from a direct Miravia product URL', () => {
  assert.equal(
    miraviaAwinDeepLink('https://www.miravia.es/p/producto-de-prueba-i1234567890.html?spm=old#reviews'),
    'https://www.awin1.com/cread.php?awinmid=37168&awinaffid=2023977&ued=https%3A%2F%2Fwww.miravia.es%2Fp%2Fproducto-de-prueba-i1234567890.html%3Fspm%3Dold',
  );
});

test('prefers the exact Miravia destination over an unverified feed id', () => {
  assert.match(
    miraviaAffiliateUrl({ productId: '42552297239', destinationUrl: 'https://www.miravia.es/p/producto-i1234567890.html' }),
    /^https:\/\/www\.awin1\.com\/cread\.php\?awinmid=37168&awinaffid=2023977&ued=/u,
  );
});

test('rejects a non-Miravia destination instead of creating an unsafe deep link', () => {
  assert.equal(miraviaAwinDeepLink('https://example.com/producto/123456'), '');
});
