import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatManualTelegramCaption,
  manualOfferFromMessage,
} from '../scripts/telegram-inbox-commands.mjs';

const controlCode = 'test-private-code';

test('accepts a complete private publication command with an Amazon affiliate URL', () => {
  const result = manualOfferFromMessage({
    controlCode,
    photoFileId: 'telegram-photo-id',
    text: [
      '/publicar test-private-code',
      'https://www.amazon.es/dp/B0ABCDE123?tag=example-21',
      'Título: Auriculares & micrófono',
      'Precio: 19,99 €',
      'Antes: 59,99 €',
      'Categoría: Tecnología',
    ].join('\n'),
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.offer.store, 'Amazon');
  assert.equal(result.offer.priceLabel, '19,99 €');
  assert.equal(result.offer.discount, 67);
  assert.match(formatManualTelegramCaption(result.offer), /Auriculares &amp; micrófono/);
  assert.match(formatManualTelegramCaption(result.offer), /<s>59,99\s€<\/s>/);
  assert.match(formatManualTelegramCaption(result.offer), /#Amazon/);
  assert.match(formatManualTelegramCaption(result.offer), /PRECIO OFERTA/);
  assert.match(formatManualTelegramCaption(result.offer), /Más ofertas en @aldiachollos/);
  assert.doesNotMatch(formatManualTelegramCaption(result.offer), /Categoría/);
});

test('does not let an incorrect control code publish an offer', () => {
  const result = manualOfferFromMessage({
    controlCode,
    photoFileId: 'telegram-photo-id',
    text: '/publicar wrong-code\nhttps://www.amazon.es/dp/B0ABCDE123?tag=example-21\nTítulo: Producto\nPrecio: 19,99 €',
  });
  assert.equal(result.status, 'unauthorized');
});

test('requires an image, price and direct tagged Amazon URL', () => {
  const result = manualOfferFromMessage({
    controlCode,
    text: '/publicar test-private-code\nhttps://www.amazon.es/dp/B0ABCDE123\nTítulo: Producto',
  });
  assert.equal(result.status, 'invalid');
  assert.match(result.message, /precio/);
  assert.match(result.message, /foto/);
  assert.match(result.message, /tag=/);
});
