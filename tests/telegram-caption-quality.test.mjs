import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTelegramDealCard, telegramOfferOpening } from '../scripts/offer-presentation.mjs';

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
test('long escaped content never cuts an HTML tag or exceeds the photo caption budget',()=>{
 const caption=formatTelegramDealCard({title:'A & <modelo> '.repeat(100),store:'Amazon',price:'19,99 €',description:'Descripción & <real> '.repeat(150),coupon:['UNO','DOS','TRES'].join(' / '),highlight:'Detalle '.repeat(100)});
 assert.ok(caption.length<=1024);
 for(const tag of ['b','code','s']) assert.equal((caption.match(new RegExp(`<${tag}>`,'g'))||[]).length,(caption.match(new RegExp(`</${tag}>`,'g'))||[]).length);
 assert.ok(caption.endsWith('#Publi'));
});
