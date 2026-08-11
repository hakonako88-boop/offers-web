import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activateChatFromMessage,
  formatManualTelegramCaption,
  manualOfferFromMessage,
  offerFromProductMetadata,
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

test('activates a private chat before it accepts URL-only publications', () => {
  assert.equal(activateChatFromMessage({ text: '/activar test-private-code', controlCode }).status, 'authorized');
  assert.equal(activateChatFromMessage({ text: '/activar incorrecta', controlCode }).status, 'unauthorized');
});

test('builds a ready Amazon offer from public product metadata and adds the tag', () => {
  const result = offerFromProductMetadata({
    url: 'https://www.amazon.es/dp/B0ABCDE123',
    partnerTag: 'example-21',
    metadata: {
      title: 'Auriculares inalámbricos SoundPEATS',
      description: 'Cancelación de ruido para llamadas.',
      imageUrl: 'https://images.example/product.jpg',
      price: 19.99,
      previousPrice: 39.99,
    },
  });
  assert.equal(result.status, 'ready');
  assert.match(result.offer.url, /tag=example-21/);
  assert.equal(result.offer.imageUrl, 'https://images.example/product.jpg');
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
