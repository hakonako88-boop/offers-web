import assert from 'node:assert/strict';
import test from 'node:test';
import { filterDuplicateDeals, isEquivalentDeal, isInboxDuplicate, recentDeals, telegramMessageIdForProduct } from '../scripts/offer-deduplication.mjs';

test('blocks catalogue variants of an offer already published', () => {
  assert.equal(isEquivalentDeal(
    { title: 'Tesosy Relleno de Cojín 35 x 55 cm Fibra Virgen Hueca Siliconada' },
    { title: 'Relleno de cojín Tesosy 35×55 cm de fibra siliconada' },
  ), true);
  assert.equal(isEquivalentDeal(
    { title: 'Alfombrilla gaming XXL Charizard' },
    { title: 'Alfombrilla gaming' },
  ), true);
});

test('keeps genuinely different products and removes duplicates in one batch', () => {
  const candidates = filterDuplicateDeals([
    { title: 'Alfombrilla gaming XXL Charizard' },
    { title: 'Alfombrilla gaming Charizard para escritorio' },
    { title: 'Auriculares inalámbricos SoundPEATS' },
  ], []);
  assert.equal(candidates.length, 2);
  assert.equal(candidates[1].title, 'Auriculares inalámbricos SoundPEATS');
});

test('blocks the same affiliate product even if the feed changes its title', () => {
  assert.equal(isEquivalentDeal(
    { title: 'Auriculares inalámbricos con cancelación', sourceProductId: '445566', store: 'Miravia' },
    { title: 'Cascos Bluetooth oferta especial', source_product_id: 'miravia-445566', store: 'Miravia' },
  ), true);
  assert.equal(isEquivalentDeal(
    { title: 'Ratón gaming edición negra', store: 'Miravia' },
    { title: 'Ratón gaming negro edición 2026', store: 'Miravia' },
  ), true);
});

test('never merges different known AliExpress products merely because their titles overlap', () => {
  assert.equal(isEquivalentDeal(
    {
      title: 'Ventilador de sobremesa 40 W silencioso',
      sourceProductId: 'aliexpress:1005011111111111',
      store: 'AliExpress',
    },
    {
      title: 'Ventilador de sobremesa 40 W con 3 velocidades',
      source_product_id: 'manual-2999',
      store: 'AliExpress',
    },
  ), false);
  assert.equal(isEquivalentDeal(
    { title: 'TÃ­tulo nuevo', sourceProductId: 'aliexpress:1005012222222222', store: 'AliExpress' },
    { title: 'TÃ­tulo anterior', source_product_id: '1005012222222222', store: 'AliExpress' },
  ), true);
});

test('only rejects an inbox offer when the same verified catalogue product is present', () => {
  assert.equal(isInboxDuplicate(
    { title: 'Nuevo difusor para habitación', sourceProductId: 'aliexpress:1005012354617649', url: 'https://s.click.aliexpress.com/e/_nuevo' },
    { title: 'Difusor de aceites para habitación', source_product_id: 'manual-3000', url: 'https://s.click.aliexpress.com/e/_otro' },
  ), false);
  assert.equal(isInboxDuplicate(
    { sourceProductId: 'aliexpress:1005012354617649', store: 'AliExpress' },
    { source_product_id: '1005012354617649', store: 'AliExpress' },
  ), true);
  assert.equal(isInboxDuplicate(
    { url: 'https://www.amazon.es/dp/B0ABCDE123?tag=one-21' },
    { url: 'https://www.amazon.es/dp/B0ABCDE123?tag=two-21' },
  ), true);
  assert.equal(isInboxDuplicate(
    { url: 'https://a.aliexpress.com/_nueva' },
    { source_product_id: 'manual-3001', url: 'https://a.aliexpress.com/_anterior' },
  ), false);
});

test('blocks an Amazon relisting with another ASIN only when title and numeric variant match', () => {
  assert.equal(isInboxDuplicate(
    { title: 'Belkin Gaming Funda con Batería Externa 10000 mAh Nintendo Switch 2 Carbón', sourceProductId: 'amazon:B0F8WTXRXY' },
    { title: 'Belkin Gaming Pro Funda con Batería Externa 10000 mAh para Switch 2 Carbón', source_product_id: 'amazon:B0GPQXVB1C' },
  ), true);
  assert.equal(isInboxDuplicate(
    { title: 'Samsung TV Mini LED M80H 55 pulgadas 4K Smart TV', sourceProductId: 'amazon:B0AAAAA111' },
    { title: 'Samsung TV Mini LED M80H 75 pulgadas 4K Smart TV', source_product_id: 'amazon:B0BBBBB222' },
  ), false);
});

test('recognises a product already visible in the recent public Telegram channel', () => {
  const html = `<div class="tgme_widget_message" data-post="aldiachollos/6873"><a href="https://chollosaldia.com/oferta/1005012519652820/?utm_source=telegram">VER FICHA</a></div>`;
  assert.equal(telegramMessageIdForProduct(html, '1005012519652820'), 6873);
  assert.equal(telegramMessageIdForProduct(html, '1005019999999999'), 0);
});

test('protects recent duplicates but permits a new deal after the cooldown', () => {
  const now = Date.parse('2026-09-23T20:00:00Z');
  const existing = [
    { title: 'Oferta reciente', date: Math.floor(Date.parse('2026-09-20T10:00:00Z') / 1000) },
    { title: 'Oferta antigua', date: Math.floor(Date.parse('2026-09-01T10:00:00Z') / 1000) },
    { title: 'Sin fecha' },
  ];
  assert.deepEqual(
    recentDeals(existing, { now, cooldownMs: 14 * 24 * 60 * 60 * 1000 }).map((deal) => deal.title),
    ['Oferta reciente', 'Sin fecha'],
  );
});
