import assert from 'node:assert/strict';
import test from 'node:test';
import { miraviaMetadataFromFeedRecord, resolveMiraviaFeedMetadata } from '../scripts/miravia-link-metadata.mjs';

test('normalizes factual Miravia metadata from an Awin feed record', () => {
  const metadata = miraviaMetadataFromFeedRecord({
    aw_product_id: '45156226011',
    product_name: 'Vehículo convertible PJ Masks de Hasbro',
    aw_image_url: 'https://www.miravia.es/image/product_200x200q70.jpg',
    search_price: '20.00',
    product_price_old: '36.95',
    merchant_deep_link: 'https://www.miravia.es/p/producto-i1356167851274367-s2069215325270143.html',
  });
  assert.equal(metadata.productId, '45156226011');
  assert.equal(metadata.price, 20);
  assert.equal(metadata.previousPrice, 36.95);
  assert.match(metadata.imageUrl, /_720x720q85\.jpg$/u);
  assert.match(metadata.finalUrl, /^https:\/\/www\.miravia\.es\/p\//u);
});

test('finds an exact Awin product when Miravia returns an empty page shell', async () => {
  const listUrl = 'https://productdata.awin.test/feed-list.csv';
  const feedUrl = 'https://productdata.awin.test/miravia.csv';
  const feedList = [
    'advertiser_id,language,url,feed_id,feed_name',
    `37168,Spanish,${feedUrl},99604,Miravia ES local`,
  ].join('\n');
  const feed = [
    'aw_product_id,product_name,aw_image_url,search_price,product_price_old,merchant_deep_link',
    '99999999999,Producto distinto,https://www.miravia.es/image/other_200x200q70.jpg,10.00,20.00,https://www.miravia.es/p/otro-i1111111111-s2222222222.html',
    '45156226011,Vehículo convertible PJ Masks de Hasbro,https://www.miravia.es/image/pj_200x200q70.jpg,20.00,36.95,https://www.miravia.es/p/pj-masks-i1356167851274367-s2069215325270143.html',
  ].join('\n');
  const fetchImpl = async (url) => {
    if (url === listUrl) return new Response(feedList, { status: 200 });
    if (url === feedUrl) return new Response(feed, { status: 200 });
    throw new Error(`Unexpected URL: ${url}`);
  };
  const metadata = await resolveMiraviaFeedMetadata(
    'https://www.awin1.com/pclick.php?p=45156226011&a=someone-else&m=37168',
    listUrl,
    { fetchImpl },
  );
  assert.equal(metadata.productId, '45156226011');
  assert.equal(metadata.title, 'Vehículo convertible PJ Masks de Hasbro');
  assert.equal(metadata.price, 20);
  assert.match(metadata.imageUrl, /_720x720q85\.jpg$/u);
});
