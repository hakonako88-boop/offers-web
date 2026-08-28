import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activateChatFromMessage,
  aliExpressPublicationUrl,
  amazonProductImageFromUrl,
  campaignFromTelegramMessage,
  editorialPostFromMessage,
  forwardedOfferMetadata,
  formatManualTelegramCaption,
  formatManualWebsiteText,
  isReliableProductTitle,
  metadataMatchesOfficialProduct,
  mergeOwnerSuppliedMetadata,
  manualOfferFromMessage,
  metadataForIncomingProductLink,
  mergeProductMetadata,
  offerFromProductMetadata,
  processingOfferReply,
  urlFromTelegramMessage,
} from '../scripts/telegram-inbox-commands.mjs';
import { formatTelegramDealCard, improveOfferTitle, offerReplyMarkup, publicOfferUrl, trackedPublicOfferUrl } from '../scripts/offer-presentation.mjs';

const controlCode = 'test-private-code';

test('keeps the affiliate purchase button and adds the exact public offer page', () => {
  const offer = { id: 'aliexpress-ES/ventilador 10', store: 'AliExpress', url: 'https://s.click.aliexpress.com/e/example' };
  assert.equal(publicOfferUrl(offer.id), 'https://chollosaldia.com/oferta/aliexpress-ES-ventilador-10/');
  assert.deepEqual(offerReplyMarkup(offer), {
    inline_keyboard: [[
      { text: '🛒 COMPRAR', url: offer.url },
      { text: '📋 DETALLES', url: trackedPublicOfferUrl(offer) },
    ]],
  });
  assert.equal(
    trackedPublicOfferUrl(offer),
    'https://chollosaldia.com/oferta/aliexpress-ES-ventilador-10/?utm_source=telegram&utm_medium=social&utm_campaign=ofertas_aliexpress&utm_content=oferta',
  );
});

test('turns a noisy repeated promotion into one concise factual headline', () => {
  assert.equal(
    improveOfferTitle('🔥 OFERTÓN: SPARK- VENTILADOR DE 10". POTENCIA 40W. 3 VELOCIDADES #Publicidad'),
    'Ventilador SPARK de sobremesa · 10" · 40 W',
  );
});

test('creates an editorial web and Telegram post from a photo and text', () => {
  const result = editorialPostFromMessage({
    photoFileId: 'telegram-post-photo',
    text: [
      '/post',
      'Nuevos cupones de la semana',
      'Ya están disponibles los códigos para ahorrar durante esta campaña.',
      'https://chollosaldia.com/',
    ].join('\n'),
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.offer.kind, 'post');
  assert.equal(result.offer.title, 'Nuevos cupones de la semana');
  assert.match(result.offer.postBody, /códigos para ahorrar/);
  assert.equal(result.offer.url, 'https://chollosaldia.com/');
  assert.match(formatManualTelegramCaption(result.offer), /Nuevos cupones de la semana/);
  assert.match(formatManualTelegramCaption(result.offer), /Pulsa el botón/);
});

test('allows an editorial post without an external link or supplied photo', () => {
  const ready = editorialPostFromMessage({ photoFileId: 'photo', text: '/post\nAviso importante\nTexto del aviso para la comunidad.' });
  assert.equal(ready.status, 'ready');
  assert.equal(ready.offer.url, '');
  assert.doesNotMatch(formatManualTelegramCaption(ready.offer), /Pulsa el botón/);
  const fallback = editorialPostFromMessage({ text: '/post\nAviso importante\nTexto del aviso sin fotografía propia.' });
  assert.equal(fallback.status, 'ready');
  assert.equal(fallback.offer.imageUrl, 'https://chollosaldia.com/og.png');
});

test('recognizes a substantial owner-written external promotion as an implicit post', () => {
  const result = editorialPostFromMessage({
    allowImplicit: true,
    text: [
      'GRATIS: 1 Año de Google Gemini AI Plus para estudiantes',
      'La promoción está disponible para universitarios mayores de 18 años que cumplan los requisitos.',
      'https://gemini.google/students',
    ].join('\n'),
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.offer.kind, 'post');
  assert.equal(result.offer.url, 'https://gemini.google/students');
  assert.match(result.offer.imageUrl, /chollosaldia\.com\/og\.png/);
});

test('recognizes a forwarded external promotion when its shop is unsupported', () => {
  const result = editorialPostFromMessage({
    allowImplicit: true,
    text: 'Curso gratuito para estudiantes\nAcceso durante doce meses para personas que cumplan los requisitos de la promoción.\nhttps://example.org/estudiantes',
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.offer.title, 'Curso gratuito para estudiantes');
});

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
  assert.match(formatManualTelegramCaption(result.offer), /Sigue @aldiachollos/);
  assert.doesNotMatch(formatManualTelegramCaption(result.offer), /Categoría/);
});

test('keeps a manually supplied coupon in Telegram and in the website record', () => {
  const result = manualOfferFromMessage({
    controlCode,
    photoFileId: 'telegram-photo-id',
    text: [
      '/publicar test-private-code',
      'https://www.amazon.es/dp/B0ABCDE123?tag=example-21',
      'Título: Cafetera automática de prueba',
      'Precio: 49,99 €',
      'Cupón: AHORRA10',
    ].join('\n'),
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.offer.coupon, 'AHORRA10');
  assert.match(formatManualTelegramCaption(result.offer), /AHORRA10/);
  assert.match(formatManualWebsiteText(result.offer), /Cupón: AHORRA10/);
});

test('keeps an explicitly labelled coupon from a forwarded offer without inventing one', () => {
  const withCoupon = forwardedOfferMetadata('Auriculares Bluetooth\nPrecio: 19,99 €\nCupón: SONIDO8');
  assert.equal(withCoupon.coupon, 'SONIDO8');
  assert.equal(forwardedOfferMetadata('Auriculares con cupón disponible\nPrecio: 19,99 €').coupon, '');
  assert.equal(mergeProductMetadata({ title: 'Auriculares Bluetooth' }, withCoupon).coupon, 'SONIDO8');
});

test('accepts /oferta without a secret in an already authorized chat', () => {
  const result = manualOfferFromMessage({
    authorized: true,
    photoFileId: 'telegram-photo-id',
    text: [
      '/oferta',
      'Título: Ventilador silencioso de sobremesa',
      'Precio: 17,78 €',
      'Antes: 29,99 €',
      'Cupón: VERANO5',
      'Descripción: Tres velocidades y cabezal ajustable.',
      'https://s.click.aliexpress.com/e/_example',
    ].join('\n'),
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.offer.price, 17.78);
  assert.equal(result.offer.coupon, 'VERANO5');
  assert.equal(result.offer.store, 'AliExpress');
});

test('reads an owner supplied /oferta without requiring an attached Telegram photo', () => {
  const metadata = forwardedOfferMetadata([
    '/oferta',
    'Título: Perfume unisex de 100 ml',
    'Precio: 17,78 €',
    'Antes: 29,99 €',
    'Cupón: PERFUME5',
    'Descripción: Fragancia duradera para uso diario.',
    'https://s.click.aliexpress.com/e/_example',
  ].join('\n'));

  assert.equal(metadata.ownerSupplied, true);
  assert.equal(metadata.title, 'Perfume unisex de 100 ml');
  assert.equal(metadata.price, 17.78);
  assert.equal(metadata.previousPrice, 29.99);
  assert.equal(metadata.coupon, 'PERFUME5');
  assert.equal(metadata.imageUrl, '');
});

test('keeps owner prices and wording but always uses the official product photo', () => {
  const result = mergeOwnerSuppliedMetadata({
    title: 'Título largo de la tienda',
    price: 21.99,
    previousPrice: 0,
    coupon: '',
    imageUrl: 'https://cdn.aliexpress.com/foto-oficial.jpg',
    productId: '1005000000000000',
  }, {
    ownerSupplied: true,
    title: 'Mi título claro para la oferta',
    price: 17.78,
    previousPrice: 29.99,
    coupon: 'AHORRA5',
    imageUrl: 'telegram-photo-copied',
  });

  assert.equal(result.title, 'Mi título claro para la oferta');
  assert.equal(result.price, 17.78);
  assert.equal(result.previousPrice, 29.99);
  assert.equal(result.coupon, 'AHORRA5');
  assert.equal(result.imageUrl, 'https://cdn.aliexpress.com/foto-oficial.jpg');
  assert.equal(result.productId, '1005000000000000');
});

test('rejects /oferta when the private chat has not been authorized', () => {
  const result = manualOfferFromMessage({
    authorized: false,
    photoFileId: 'telegram-photo-id',
    text: '/oferta\nTítulo: Producto de prueba\nPrecio: 10 €\nhttps://s.click.aliexpress.com/e/_example',
  });

  assert.equal(result.status, 'unauthorized');
});

test('does not let an incorrect control code publish an offer', () => {
  const result = manualOfferFromMessage({
    controlCode,
    photoFileId: 'telegram-photo-id',
    text: '/publicar wrong-code\nhttps://www.amazon.es/dp/B0ABCDE123?tag=example-21\nTítulo: Producto\nPrecio: 19,99 €',
  });
  assert.equal(result.status, 'unauthorized');
});

test('publishes an AliExpress coupon campaign with the supplied text, photo and link', () => {
  const result = campaignFromTelegramMessage({
    photoFileId: 'telegram-campaign-photo',
    url: 'https://s.click.aliexpress.com/e/_campaign',
    text: [
      'Fase de Calentamiento desde el Viernes 14 de Agosto hasta el Domingo 16 de Agosto',
      'Comienza la promoción desde el Lunes 17 hasta el Miércoles 26 de Agosto',
      'Se pueden combinar con los cupones',
      'ESNS03 DSES03 3€ descuento para compra superior a 15€',
      'https://s.click.aliexpress.com/e/_campaign',
    ].join('\n'),
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.offer.kind, 'campaign');
  assert.equal(result.offer.photoFileId, 'telegram-campaign-photo');
  assert.equal(result.offer.url, 'https://s.click.aliexpress.com/e/_campaign');
  assert.match(formatManualTelegramCaption(result.offer), /CAMPAÑA DE CUPONES ALIEXPRESS/);
  assert.match(formatManualTelegramCaption(result.offer), /ESNS03 DSES03/);
  assert.doesNotMatch(formatManualTelegramCaption(result.offer), /PRECIO OFERTA/);
});

test('does not accept a campaign without the supplied photo', () => {
  const result = campaignFromTelegramMessage({
    url: 'https://s.click.aliexpress.com/e/_campaign',
    text: 'Fase de Calentamiento\nComienza la promoción\nCupones para compra superior a 15€',
  });
  assert.equal(result.status, 'invalid');
  assert.match(result.message, /foto/i);
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

test('does not publish an unresolved Amazon short link because its tag cannot be verified', () => {
  const result = offerFromProductMetadata({
    url: 'https://amzn.to/example',
    partnerTag: 'example-21',
    metadata: {
      title: 'Auriculares inalÃ¡mbricos SoundPEATS',
      imageUrl: 'https://images.example/product.jpg',
      price: 19.99,
    },
  });
  assert.equal(result.status, 'needs_affiliate');
  assert.match(result.message, /enlace directo/i);
});

test('removes another AliExpress publisher tracking when its own link cannot be generated', () => {
  const safeUrl = aliExpressPublicationUrl({
    generatedUrl: '',
    productId: '1005012721085216',
    fallbackUrl: 'https://www.aliexpress.com/item/1005012721085216.html?aff_fsk=_foreign&aff_trace_key=foreign',
  });

  assert.equal(safeUrl, 'https://es.aliexpress.com/item/1005012721085216.html');
  const result = offerFromProductMetadata({
    url: safeUrl,
    metadata: {
      title: 'Maison Alhambra Jean Lowe Fantasme Eau de Parfum 100 ml',
      imageUrl: 'https://ae-pic-a1.aliexpress-media.com/kf/perfume.jpeg',
      price: 19.99,
      productId: '1005012721085216',
    },
  });
  assert.equal(result.status, 'needs_affiliate');
  assert.match(result.message, /No he publicado el enlace original/i);
});

test('uses only the AliExpress affiliate URL generated for this account', () => {
  assert.equal(aliExpressPublicationUrl({
    generatedUrl: 'https://s.click.aliexpress.com/e/_propio',
    productId: '1005012721085216',
    fallbackUrl: 'https://a.aliexpress.com/_ajeno',
  }), 'https://s.click.aliexpress.com/e/_propio');
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

test('keeps recovered product facts when a pending Telegram draft is empty', () => {
  const recovered = {
    title: 'Maison Alhambra Jean Lowe Fantasme Eau de Parfum 100 ml',
    description: 'Perfume unisex con notas de té negro y cítricos.',
    imageUrl: 'https://ae-pic-a1.aliexpress-media.com/kf/perfume.jpeg',
    price: 0,
  };
  const emptyDraft = { title: '', description: '', imageUrl: '', price: 0 };
  const storedMetadata = mergeProductMetadata(recovered, emptyDraft);
  const refreshedMetadata = mergeProductMetadata({ finalUrl: 'https://es.aliexpress.com/item/1005012721085216.html' }, storedMetadata);

  assert.equal(refreshedMetadata.title, recovered.title);
  assert.equal(refreshedMetadata.description, recovered.description);
  assert.equal(refreshedMetadata.imageUrl, recovered.imageUrl);
});

test('keeps the current pending product ahead of an obsolete earlier draft', () => {
  const current = {
    title: 'Japan Genuine NH35 Automatic Mechanical Movement',
    imageUrl: 'https://images.example/nh35.png',
  };
  const obsoleteDraft = {
    title: 'Maison Alhambra Jean Lowe Fantasme Eau de Parfum',
    imageUrl: 'https://images.example/perfume.jpg',
  };
  const storedMetadata = mergeProductMetadata(current, obsoleteDraft);
  assert.equal(storedMetadata.title, current.title);
  assert.equal(storedMetadata.imageUrl, current.imageUrl);
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

test('uses an available inline button URL from Telegram before falling back to card text', () => {
  const url = urlFromTelegramMessage({
    reply_markup: {
      inline_keyboard: [[{ text: 'VER OFERTA', url: 'https://www.amazon.es/dp/B0ABCDE123' }]],
    },
  }, 'Ventilador de prueba\nPrecio: 17,78 â‚¬');
  assert.equal(url, 'https://www.amazon.es/dp/B0ABCDE123');
});

test('uses a visible direct shop URL before a stale hidden Telegram preview URL', () => {
  const url = urlFromTelegramMessage({
    entities: [{ type: 'text_link', offset: 0, length: 8, url: 'https://s.click.aliexpress.com/e/_old-product' }],
  }, 'Perfume Maison Alhambra\nhttps://a.aliexpress.com/_new-product');
  assert.equal(url, 'https://a.aliexpress.com/_new-product');
});

test('formats a forwarded fan offer without exposing its forwarded origin', () => {
  const card = formatTelegramDealCard({
    title: 'SPARK- VENTILADOR DE 10". POTENCIA 40W. 3 VELOCIDADES. 3 ASPAS DE ALUMINIO. OPERACIÓN SILENCIOSA.',
    store: 'AliExpress',
    price: '17,78 €',
    description: 'Oferta reenviada: SPARK- VENTILADOR DE 10". POTENCIA 40W.',
  });
  assert.match(card, /Ventilador SPARK de sobremesa · 10" · 40 W/);
  assert.match(card, /3 velocidades, aspas de aluminio y funcionamiento silencioso/);
  assert.doesNotMatch(card, /oferta reenviada/i);
});

test('formats a V16 safety light without catalogue separators', () => {
  const card = formatTelegramDealCard({
    title: 'Baliza V16 Homologada DGT con Geolocalización | Luz de Emergencia Coche LED 360° 1km | Conectada Plataforma DGT 3.0',
    store: 'AliExpress',
    price: '13,23 €',
  });
  assert.match(card, /Baliza V16 DGT con geolocalización para coche/);
  assert.match(card, /visibilidad 360°, conexión DGT 3.0 y base imantada/);
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

test('does not combine a pending forwarded card with a different verified AliExpress product', () => {
  assert.equal(metadataMatchesOfficialProduct(
    'Handmade Coconut Oil Cheese Moldable Squishy Blind Box Stress Relief Toy',
    'Móvil Xiaomi Redmi Note 15 4G 8GB 256GB AMOLED NFC',
  ), false);
  assert.equal(metadataMatchesOfficialProduct(
    'Ventilador de techo WOOX Super Big 54 pulgadas con luz',
    'Ventilador WOOX de techo con luz y mando a distancia',
  ), true);
});

test('does not mix a new product URL with the previous pending product draft', () => {
  const metadata = metadataForIncomingProductLink({
    pending: {
      url: 'https://a.aliexpress.com/_old-product',
      draft: { title: 'Perfume anterior', imageUrl: 'old-photo' },
    },
    text: 'https://s.click.aliexpress.com/e/_new-product',
  });
  assert.equal(metadata.title, '');
  assert.equal(metadata.imageUrl, '');
});

test('reuses a forwarded card only while it is waiting for its first product URL', () => {
  const draft = { title: 'Oferta reenviada', imageUrl: 'forwarded-photo', price: 17.78 };
  assert.deepEqual(metadataForIncomingProductLink({
    pending: { draft },
    text: 'https://a.aliexpress.com/_product',
  }), draft);
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
