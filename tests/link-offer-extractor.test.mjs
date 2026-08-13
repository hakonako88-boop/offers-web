import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeStorefrontMarkup, extractProductMetadata, merchantLinkFromHtml, outboundOfferLinkFromHtml, productMetadataFromHtml } from '../scripts/link-offer-extractor.mjs';

test('extracts title, image and prices from public product metadata', () => {
  const result = productMetadataFromHtml(`
    <meta property="og:title" content="Auriculares inalámbricos">
    <meta property="og:image" content="/producto.jpg">
    <script type="application/ld+json">{"@type":"Product","name":"Auriculares inalámbricos","description":"Con cancelación de ruido","image":"/producto.jpg","offers":{"price":"19,99","highPrice":"39,99"}}</script>
  `, 'https://tienda.example/producto');
  assert.equal(result.title, 'Auriculares inalámbricos');
  assert.equal(result.imageUrl, 'https://tienda.example/producto.jpg');
  assert.equal(result.price, 19.99);
  assert.equal(result.previousPrice, 39.99);
});

test('decodes AliExpress escaped Open Graph title and product photo', () => {
  const escaped = String.raw`\u003cmeta property=\"og:title\" content=\"Maison Alhambra Jean Lowe Fantasme - AliExpress 66\" /\u003e \u003cmeta property=\"og:image\" content=\"https://ae01.alicdn.com/kf/perfume.jpg\" /\u003e`;
  assert.match(decodeStorefrontMarkup(escaped), /<meta property="og:title"/u);
  const result = productMetadataFromHtml(escaped, 'https://es.aliexpress.com/item/1005012721085216.html');
  assert.equal(result.title, 'Maison Alhambra Jean Lowe Fantasme');
  assert.equal(result.imageUrl, 'https://ae01.alicdn.com/kf/perfume.jpg');
});

test('follows a merchant button from a forwarded deals page to the product page', async () => {
  const sourceUrl = 'https://nolodejesescapar.example/oferta/auriculares';
  const amazonUrl = 'https://www.amazon.es/dp/B012345678';
  const pages = new Map([
    [sourceUrl, '<a class="buy" href="/ir/a-amazon">Ver oferta en Amazon</a>'],
    ['https://nolodejesescapar.example/ir/a-amazon', ''],
    [amazonUrl, '<meta property="og:title" content="Auriculares de prueba"><meta property="og:image" content="https://images.example/auriculares.jpg"><meta property="product:price:amount" content="29,99">'],
  ]);
  const fetchImpl = async (url) => {
    const finalUrl = url.endsWith('/ir/a-amazon') ? amazonUrl : url;
    return {
      ok: true,
      url: finalUrl,
      text: async () => pages.get(finalUrl),
    };
  };

  assert.equal(merchantLinkFromHtml(pages.get(sourceUrl), sourceUrl), '');
  assert.equal(outboundOfferLinkFromHtml(pages.get(sourceUrl), sourceUrl), 'https://nolodejesescapar.example/ir/a-amazon');
  const result = await extractProductMetadata(sourceUrl, { fetchImpl });
  assert.equal(result.finalUrl, amazonUrl);
  assert.equal(result.affiliateUrl, amazonUrl);
  assert.equal(result.title, 'Auriculares de prueba');
  assert.equal(result.price, 29.99);
});

test('uses MiChollo public API to resolve the real Miravia product', async () => {
  const sourceUrl = 'https://michollo.com/chollo-robot-aspirador-xiaomi-365999/';
  const shortUrl = 'https://a.michollo.to/test';
  const miraviaUrl = 'https://www.miravia.es/p/robot-xiaomi-i1234567890.html';
  const fetchImpl = async (url) => {
    if (String(url).includes('/api/deals/365999')) return {
      ok: true,
      json: async () => ({ deal: {
        name: 'Robot aspirador Xiaomi S20',
        description: '<p>Robot con navegación láser</p>',
        image_url: 'https://img.michollo.com/robot.webp',
        offer_url: shortUrl,
      } }),
    };
    if (url === shortUrl) return {
      ok: true,
      url: miraviaUrl,
      text: async () => '<meta property="og:title" content="Xiaomi Robot Vacuum S20"><meta property="og:image" content="https://img.miravia.es/s20.jpg"><meta property="product:price:amount" content="129,99">',
    };
    throw new Error(`unexpected URL ${url}`);
  };
  const result = await extractProductMetadata(sourceUrl, { fetchImpl });
  assert.equal(result.source, 'michollo');
  assert.equal(result.finalUrl, miraviaUrl);
  assert.equal(result.title, 'Xiaomi Robot Vacuum S20');
  assert.equal(result.price, 129.99);
});

test('uses NoLoDejesEscapar public REST data but ignores an unrelated Awin affiliate', async () => {
  const sourceUrl = 'https://nolodejesescapar.com/cargador-gan-65w/';
  const aliExpressUrl = 'https://www.aliexpress.com/item/1005001234567890.html';
  const fetchImpl = async (url) => {
    if (String(url).includes('/wp-json/wp/v2/posts')) return {
      ok: true,
      json: async () => [{
        title: { rendered: 'Chollo! Cargador GaN 65W' },
        content: { rendered: `<a href="https://www.awin1.com/cread.php?awinmid=20982&awinaffid=540793">PcComponentes</a><a href="${aliExpressUrl}">Ver oferta en AliExpress</a>` },
        yoast_head_json: { og_image: [{ url: 'https://nolodejesescapar.com/cargador.jpg' }] },
      }],
    };
    if (url === aliExpressUrl) return {
      ok: true,
      url: aliExpressUrl,
      text: async () => '<meta property="og:title" content="Cargador GaN USB-C 65W"><meta property="og:image" content="https://ae01.alicdn.com/cargador.jpg"><meta property="product:price:amount" content="18,49">',
    };
    throw new Error(`unexpected URL ${url}`);
  };
  assert.equal(merchantLinkFromHtml('<a href="https://www.awin1.com/cread.php?awinmid=20982&awinaffid=540793">Comprar</a>'), '');
  const result = await extractProductMetadata(sourceUrl, { fetchImpl });
  assert.equal(result.source, 'nolodejesescapar');
  assert.equal(result.finalUrl, aliExpressUrl);
  assert.equal(result.title, 'Cargador GaN USB-C 65W');
  assert.equal(result.price, 18.49);
});

test('decodes named HTML entities in Amazon product metadata', () => {
  const result = productMetadataFromHtml(
    '<meta property="og:title" content="C&aacute;mara WiFi con visi&oacute;n nocturna &amp; detecci&oacute;n AI : Amazon.es: Electr&oacute;nica">',
    'https://www.amazon.es/dp/B0G2XCZCC4',
  );
  assert.equal(result.title, 'Cámara WiFi con visión nocturna & detección AI');
});

test('reads a NoLoDejesEscapar numeric post URL through its public API', async () => {
  const sourceUrl = 'https://nolodejesescapar.com/?p=188821';
  const amazonUrl = 'https://www.amazon.es/dp/B0G2XCZCC4?tag=otro-21';
  const fetchImpl = async (url) => {
    if (url === 'https://nolodejesescapar.com/wp-json/wp/v2/posts/188821?_embed=1') {
      return new Response(JSON.stringify({
        title: { rendered: 'Pack de 2 cámaras Imou Ranger 2C Pro' },
        excerpt: { rendered: 'Cámaras WiFi interiores 2K.' },
        content: { rendered: `<a href="${amazonUrl}">Ver oferta en Amazon</a>` },
        yoast_head_json: { og_image: [{ url: 'https://images.example/imou.jpg' }] },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url === amazonUrl) {
      return new Response('<meta property="og:title" content="Pack de 2 cámaras Imou Ranger 2C Pro"><meta property="og:image" content="https://images.example/imou.jpg"><meta property="product:price:amount" content="45.90">', { status: 200 });
    }
    throw new Error(`unexpected URL ${url}`);
  };
  const result = await extractProductMetadata(sourceUrl, { fetchImpl });
  assert.equal(result.finalUrl, amazonUrl);
  assert.equal(result.title, 'Pack de 2 cámaras Imou Ranger 2C Pro');
  assert.equal(result.price, 45.9);
});

test('keeps the direct Amazon URL when the product page blocks an amzn.to reader', async () => {
  const shortUrl = 'https://amzn.to/3SszZh4';
  const directUrl = 'https://www.amazon.es/dp/B0G2XCZCC4?tag=chollos00a-21';
  const fetchImpl = async (url, options = {}) => {
    if (url === shortUrl && options.redirect === 'manual') {
      return new Response('', { status: 301, headers: { location: directUrl } });
    }
    if (url === directUrl) return new Response('', { status: 404 });
    throw new Error(`unexpected URL ${url}`);
  };
  const result = await extractProductMetadata(shortUrl, { fetchImpl });
  assert.equal(result.finalUrl, directUrl);
  assert.equal(result.sourceUrl, shortUrl);
});

test('never replaces a resolved Amazon product with a JavaScript placeholder link', async () => {
  const shortUrl = 'https://amzn.to/3SszZh4';
  const redirectUrl = 'https://www.amazon.es/dp/B0G2XCZCC4?tag=chollos00a-21';
  const html = [
    '<meta property="og:title" content="Cámara Imou Ranger 2C Pro">',
    '<meta property="og:image" content="https://images.example/imou.jpg">',
    '<meta property="product:price:amount" content="45.99">',
    '<a href="/dp/&quot;+t.href+&quot;">script placeholder</a>',
  ].join('');
  const fetchImpl = async (url, options = {}) => {
    if (url === shortUrl && options.redirect === 'manual') {
      return new Response('', { status: 301, headers: { location: redirectUrl } });
    }
    if (url === redirectUrl) {
      return new Response(html, { status: 200 });
    }
    throw new Error(`unexpected URL ${url}`);
  };
  const result = await extractProductMetadata(shortUrl, { fetchImpl });
  assert.equal(result.finalUrl, redirectUrl);
  assert.equal(result.affiliateUrl, redirectUrl);
});
