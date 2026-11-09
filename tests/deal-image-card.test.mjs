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
    coupon: 'ESFS02',
  });
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 1200);
  assert.ok(result.length > 20_000);
  const {data}=await sharp(result).extract({left:10,top:10,width:1,height:1}).raw().toBuffer({resolveWithObject:true});
  assert.ok(data[1]>data[0] && data[1]>data[2], 'header retains the forest-green brand colour');
  const lower=await sharp(result).extract({left:10,top:950,width:1,height:1}).raw().toBuffer();
  assert.ok(lower[0]>240 && lower[1]>240 && lower[2]>230,'price panel is light, not a large green block');
});

test('long coupon alternatives and special characters produce a valid image without cutting XML',async()=>{
 const photo=await sharp({create:{width:100,height:100,channels:3,background:'#fff'}}).png().toBuffer();
 const result=await createDealImageCard({imageBytes:photo,store:'AliExpress',price:'19,99 €',coupon:'UNO / DOS / CASHBACK',discount:140});
 assert.equal((await sharp(result).metadata()).width,1200);
});

test('creates safe and recognisable Telegram filenames', () => {
  assert.equal(dealImageCardFilename('AliExpress', '123/ABC'), 'aliexpress-123-ABC-telegram.jpg');
});
