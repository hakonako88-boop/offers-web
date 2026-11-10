import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTelegramDealCard, telegramOfferOpening, improveOfferTitle } from '../scripts/offer-presentation.mjs';

test('varied emoji labels only claim a price drop when both prices support it', () => {
 const inputs=Array.from({length:60},(_,i)=>({title:`Producto útil modelo ${i}`,store:'Amazon'}));
 const ordinary=inputs.map(input=>telegramOfferOpening({...input,price:'19,99 €',discount:50}));
 for(const text of ordinary) assert.doesNotMatch(text,/Bajada de precio|Ahora por menos|Ofertón/);
 const drops=inputs.map(input=>telegramOfferOpening({...input,price:'19,99 €',previousPrice:'39,99 €',discount:50}));
 assert.ok(drops.some(text=>text.includes('Bajada de precio')));
 assert.ok(drops.some(text=>text.includes('Chollo')));
 assert.ok(drops.some(text=>text.includes('Oferta')));
 assert.ok(drops.some(text=>text.includes('Ofertón')));
 for(const input of inputs) assert.doesNotMatch(telegramOfferOpening({...input,price:40,previousPrice:20}),/Bajada de precio|Ahora por menos/);
});

test('caption has a single price and a distinct copyable coupon block',()=>{
 const caption=formatTelegramDealCard({title:'Robot aspirador de prueba',store:'AliExpress',price:'199,99 €',previousPrice:'299,99 €',savings:'100,00 €',coupon:'AHORRA20',discount:33});
 assert.equal(caption.split('199,99 €').length-1,1);
 assert.equal(caption.split('100,00 €').length-1,1);
 assert.match(caption,/\n\n🎟️ Cupón: <code>AHORRA20<\/code>/);
 assert.match(caption,/#Publi/);
 assert.doesNotMatch(caption,/OFERTA SELECCIONADA|OFERTA CON CUPÓN/);
 assert.match(caption,/💰 <b>Te ahorras/);
 assert.match(caption,/Cópialo y aplícalo al pagar/);
});

test('openings vary by product, remain stable on retries and do not invent urgency',()=>{
 const titles=['Auriculares Bose QuietComfort SC','Freidora Cosori 6 litros','Cafetera Delonghi','Móvil POCO X8 Pro','Samsung Galaxy A56','Jamón ibérico','Coca-Cola pack 24','Aspirador Dreame L40','Ventilador Xiaomi','Auriculares Sony WH1000','Cámara Canon R50','Monitor LG 27 pulgadas'];
 const openings=titles.map(title=>telegramOfferOpening({title,store:'AliExpress'}));
 assert.ok(new Set(openings).size>=6);
 assert.equal(telegramOfferOpening({title:titles[0],store:'AliExpress'}),openings[0]);
 for(const text of openings){assert.doesNotMatch(text,/seleccionad|agot|últim|minimo|mínimo|cup[oó]n|c[oó]digo|chollo a la vista/i);}
});

test('impact comes from the actual product and only unambiguous source specifications',()=>{
 assert.match(telegramOfferOpening({title:'Móvil POCO 8 GB 256 GB'}),/256 GB/);
 assert.doesNotMatch(telegramOfferOpening({title:'Móvil POCO 256 GB 512 GB'}),/256|512/);
 assert.match(telegramOfferOpening({title:'Coca-Cola pack de 24 latas'}),/24/);
 assert.doesNotMatch(telegramOfferOpening({title:'Auriculares Bluetooth'}),/Menos ruido|ruido de fondo/);
 assert.match(telegramOfferOpening({title:'Auriculares con cancelación de ruido'}),/música|ruido/);
 assert.doesNotMatch(telegramOfferOpening({title:'Móvil de prueba'}),/\d+ GB|\d+ mAh/);
});

test('live channel regressions: packs are identified and marketing words never become brands',()=>{
 const beer='Estrella Galicia - Especial, Cerveza Lager, 24 Botellas x 25 cl | Maltas Pilsen y Tostada';
 assert.equal(improveOfferTitle(beer),'Estrella Galicia Especial · 24 botellas de 25 cl');
 assert.match(telegramOfferOpening({title:improveOfferTitle(beer)}),/24/);
 assert.equal(improveOfferTitle('Auriculares inalámbricos Últimos'),'Auriculares inalámbricos');
 assert.match(improveOfferTitle('Últimos Auriculares Bluetooth Lenovo LP75'),/Lenovo LP75/);
 assert.doesNotMatch(improveOfferTitle('Últimos Auriculares Bluetooth Lenovo LP75'),/Últimos/);
});
test('long escaped content never cuts an HTML tag or exceeds the photo caption budget',()=>{
 const caption=formatTelegramDealCard({title:'A & <modelo> '.repeat(100),store:'Amazon',price:'19,99 €',description:'Descripción & <real> '.repeat(150),coupon:['UNO','DOS','TRES'].join(' / '),highlight:'Detalle '.repeat(100)});
 assert.ok(caption.length<=1024);
 for(const tag of ['b','code','s']) assert.equal((caption.match(new RegExp(`<${tag}>`,'g'))||[]).length,(caption.match(new RegExp(`</${tag}>`,'g'))||[]).length);
 assert.ok(caption.endsWith('#Publi'));
});
