import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import fs from 'node:fs';
import { createDealImageCard, dealImageCardFilename, dealImageTitleLines, cardOverlay } from '../scripts/deal-image-card.mjs';

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
    title: 'Auriculares Bose QuietComfort SC',
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

test('product name appears as readable text on at most two lines',()=>{
 assert.match(dealImageTitleLines('Bose QuietComfort SC Headphones Auriculares inalámbricos').join(' '),/Bose QuietComfort/);
 assert.ok(dealImageTitleLines('Auriculares de prueba con muchas características '.repeat(12)).length<=2);
 assert.ok(fs.existsSync('public/fonts/BarlowCondensed-ExtraBold.ttf'));
 assert.ok(fs.existsSync('public/fonts/BarlowCondensed-OFL.txt'));
 assert.match(fs.readFileSync('scripts/deal-image-card.mjs','utf8'),/fontfile:TITLE_FONT/);
 for(const file of ['sync-aliexpress-deals','sync-amazon-deals','sync-miravia-deals','sync-mediamarkt-deals','sync-awin-retailers','process-telegram-inbox']) assert.match(fs.readFileSync(`scripts/${file}.mjs`,'utf8'),/title: offer.title/);
});

test('marketing image keeps the name and price, leaving coupon and price comparisons to the caption',()=>{
 const svg=cardOverlay({title:'Auriculares Bose QuietComfort SC',store:'AliExpress',price:'107,90 €',previousPrice:'172,60 €',discount:37,coupon:'ESD1123'}).toString();
 assert.match(svg,/107,90/);
 assert.match(svg,/Bose QuietComfort/);
 assert.doesNotMatch(svg,/172,60|ESD1123|−37|CUPÓN|PRECIO DE LA PUBLICACIÓN/);
});

test('long coupon alternatives and special characters produce a valid image without cutting XML',async()=>{
 const photo=await sharp({create:{width:100,height:100,channels:3,background:'#fff'}}).png().toBuffer();
 const result=await createDealImageCard({imageBytes:photo,store:'AliExpress',price:'19,99 €',coupon:'UNO / DOS / CASHBACK',discount:140});
 assert.equal((await sharp(result).metadata()).width,1200);
});

test('creates safe and recognisable Telegram filenames', () => {
  assert.equal(dealImageCardFilename('AliExpress', '123/ABC'), 'aliexpress-123-ABC-telegram.jpg');
});

test('profile photo updates are restricted to the owners channel and use the vector brand',async()=>{
 const script=fs.readFileSync('scripts/optimize-telegram-channel.mjs','utf8');
 assert.match(script,/channel.username/);
 assert.match(script,/!== 'aldiachollos'/);
 assert.match(script,/channel.type !== 'channel'/);
 assert.match(script,/setChatPhoto/);
 const meta=await sharp('public/telegram-channel-avatar.svg').metadata();
 assert.equal(meta.width,1024);
});
