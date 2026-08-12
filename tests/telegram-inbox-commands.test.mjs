import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activateChatFromMessage,
  amazonProductImageFromUrl,
  forwardedOfferMetadata,
  formatManualTelegramCaption,
  isReliableProductTitle,
  manualOfferFromMessage,
  mergeProductMetadata,
  offerFromProductMetadata,
  processingOfferReply,
  urlFromTelegramMessage,
} from '../scripts/telegram-inbox-commands.mjs';
import { formatTelegramDealCard } from '../scripts/offer-presentation.mjs';

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
  assert.match(formatManualTelegramCaption(result.offer), /Más en @aldiachollos/);
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

test('confirms that a product link is being checked before publication', () => {
  assert.match(processingOfferReply('Amazon'), /ficha de Amazon/);
  assert.match(processingOfferReply('Tienda'), /ficha de la tienda/);
});

test('does not publish a forwarded image link that is not a supported shop product', () => {
  const result = offerFromProductMetadata({
    url: 'https://s.chollo.to/imagen-de-otro-canal.png',
    metadata: { title: 'Ahorra un 34%', imageUrl: 'telegram-photo-id', price: 79 },
  });
  assert.equal(result.status, 'needs_store');
  assert.match(result.message, /ficha directa/i);
});

test('keeps the official AliExpress catalogue facts ahead of forwarded wording', () => {
  const metadata = mergeProductMetadata({
    title: 'Xiaomi Smart Band 9 Active, pantalla AMOLED',
    description: 'Pulsera inteligente Xiaomi con pantalla AMOLED.',
    imageUrl: 'https://images.example/xiaomi-band.jpg',
    price: 19.99,
    previousPrice: 29.99,
  }, {
    title: '🔥 OFERTÓN pulsera barata',
    description: 'Texto del canal original',
    imageUrl: 'telegram-forwarded-photo',
    price: 12.99,
  });
  assert.equal(metadata.title, 'Xiaomi Smart Band 9 Active, pantalla AMOLED');
  assert.equal(metadata.description, 'Pulsera inteligente Xiaomi con pantalla AMOLED.');
  assert.equal(metadata.price, 19.99);
  assert.equal(metadata.imageUrl, 'https://images.example/xiaomi-band.jpg');
});

test('does not use an URL or a generic storefront as a product title', () => {
  assert.equal(isReliableProductTitle('https://s.click.aliexpress.com/e/example'), false);
  assert.equal(isReliableProductTitle('AHORRA UN 34% #Perfumes #Amazon'), false);
  assert.equal(isReliableProductTitle('AliExpress España'), false);
  assert.equal(isReliableProductTitle('Xiaomi Smart Band 9 Active'), true);
  assert.equal(forwardedOfferMetadata('https://s.click.aliexpress.com/e/example').title, '');
});

test('builds Amazon’s official product image URL from a direct product link', () => {
  assert.equal(
    amazonProductImageFromUrl('https://www.amazon.es/dp/B0FC2HFCTN?tag=another-tag-21'),
    'https://m.media-amazon.com/images/P/B0FC2HFCTN.01._SCLZZZZZZZ_.jpg',
  );
  assert.equal(amazonProductImageFromUrl('https://example.com/dp/B0FC2HFCTN'), '');
});

test('reads an Amazon link hidden behind a forwarded Telegram card and uses its facts', () => {
  const text = [
    '🔥 Lenor Perlas de Perfume para la Ropa | #Amazon #OfertaFlash',
    '📉 DESCUENTO: 28%',
    '🔥 Precio: 12,34€',
    '❌ El precio más bajo de los últimos 30 días: 17,08€',
    '👉 Ver aquí en Amazon',
  ].join('\n');
  const url = urlFromTelegramMessage({
    entities: [{ type: 'text_link', offset: 166, length: 20, url: 'https://www.amazon.es/dp/B0ABCDE123' }],
  }, text);
  const metadata = forwardedOfferMetadata(text, 'telegram-forwarded-photo');
  assert.equal(url, 'https://www.amazon.es/dp/B0ABCDE123');
  assert.equal(metadata.title, 'Lenor Perlas de Perfume para la Ropa');
  assert.equal(metadata.price, 12.34);
  assert.equal(metadata.previousPrice, 17.08);
  assert.equal(metadata.imageUrl, 'telegram-forwarded-photo');
  assert.doesNotMatch(metadata.description, /oferta reenviada/i);
});

test('formats a forwarded fan offer without exposing its forwarded origin', () => {
  const card = formatTelegramDealCard({
    title: 'SPARK- VENTILADOR DE 10\". POTENCIA 40W. 3 VELOCIDADES. 3 ASPAS DE ALUMINIO. OPERACIÃ“N SILENCIOSA.',
    store: 'AliExpress',
    price: '17,78 €',
    description: 'Oferta reenviada: SPARK- VENTILADOR DE 10\". POTENCIA 40W.',
  });
  assert.match(card, /Ventilador SPARK de sobremesa · 10\" · 40 W/);
  assert.match(card, /3 velocidades, aspas de aluminio y funcionamiento silencioso/);
  assert.doesNotMatch(card, /oferta reenviada/i);
});

test('formats a V16 safety light without catalogue separators', () => {
  const card = formatTelegramDealCard({
    title: 'Baliza V16 Homologada DGT con GeolocalizaciÃ³n | Luz de Emergencia Coche LED 360Â° 1km | Conectada Plataforma DGT 3.0',
    store: 'AliExpress',
    price: '13,23 €',
  });
  assert.match(card, /Baliza V16 DGT con geolocalizaciÃ³n para coche/);
  assert.match(card, /visibilidad 360Â°, conexiÃ³n DGT 3.0 y base imantada/);
  assert.doesNotMatch(card, /\|/);
});

test('does not invent a URL when a forwarded card has no link entity', () => {
  const text = 'Producto con foto y precio, pero sin URL visible';
  assert.equal(urlFromTelegramMessage({ caption_entities: [] }, text), '');
});

test('keeps title and price facts from a forwarded card when the store cannot be read', () => {
  const metadata = forwardedOfferMetadata([
    '🔥 Producto de prueba | #Miravia',
    '💶 Precio: 19,99 €',
    '🏷 Antes: 39,99 €',
  ].join('\n'), 'telegram-forwarded-photo');
  assert.equal(metadata.title, 'Producto de prueba');
  assert.equal(metadata.price, 19.99);
  assert.equal(metadata.previousPrice, 39.99);
  assert.equal(metadata.photoFileId, 'telegram-forwarded-photo');
});

test('keeps a photo attached directly by the owner as a safe metadata fallback', () => {
  const attached = forwardedOfferMetadata('Producto de prueba\nPrecio: 19,99 €', 'owner-attached-photo');
  const metadata = mergeProductMetadata({ title: 'Producto de prueba', price: 19.99 }, attached);
  assert.equal(metadata.imageUrl, 'owner-attached-photo');
});

test('keeps a forwarded card photo as a fallback when the official shop image is unavailable', () => {
  const card = forwardedOfferMetadata('Ventilador SPARK 10 pulgadas\nPrecio: 17,78 €', 'forwarded-card-photo');
  const metadata = mergeProductMetadata({ title: 'Ventilador SPARK 10 pulgadas', price: 17.78 }, card);
  assert.equal(metadata.imageUrl, 'forwarded-card-photo');
});

test('reads price labels from a forwarded offer even when the label has no colon', () => {
  const metadata = forwardedOfferMetadata([
    'Pack 8 Sanytol Desinfectante Limpiahogar Eucaliptus 1.2 L #Amazon',
    '📛 PVP 22.32 €',
    '💶 PRECIO OFERTA 16.7 €💥',
    '🔻 Añadir 2 uds y tramitar',
  ].join('\n'), 'telegram-forwarded-photo');
  assert.equal(metadata.title, 'Pack 8 Sanytol Desinfectante Limpiahogar Eucaliptus 1.2 L #Amazon');
  assert.equal(metadata.price, 16.7);
  assert.equal(metadata.previousPrice, 22.32);
});

test('uses a recurring-price line sent in a forwarded card', () => {
  const metadata = forwardedOfferMetadata([
    'Producto de ejemplo #Amazon',
    '🟢 Compra recurrente 12,34 €, puedes cancelar cuando quieras',
    '🔴 Compra única 12,99 €',
  ].join('\n'), 'telegram-forwarded-photo');
  assert.equal(metadata.price, 12.34);
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
