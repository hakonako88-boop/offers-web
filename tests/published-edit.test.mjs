import test from 'node:test';
import assert from 'node:assert/strict';
import { correctedOffer, handlePublishedEdit } from '../scripts/published-edit.mjs';
test('coupon-only edit preserves price and affiliate link',()=>{
 const old={price:'19,99 €',url:'https://example.com/p',coupon:'OLD1',couponDiscount:4};
 const next=correctedOffer(old,'-','NEW1');
 assert.equal(next.price,old.price); assert.equal(next.url,old.url);
 assert.equal(next.coupon,'NEW1'); assert.equal(next.couponDiscount,undefined);
});
test('price requires a positive amount and drops stale claims',()=>{
 assert.throws(()=>correctedOffer({},'12abc','-'));
 assert.equal(correctedOffer({previousPrice:'15 €'},'20,50','-').previousPrice,'');
});
test('only the owner confirmation edits the same message and saves the same offer',async()=>{
 let rows=[{message_id:8110,source_product_id:'item-1',title:'Producto',price:'19,99 €',url:'https://example.com/p'}];
 const replies=[], calls=[];
 const args={message:{chat:{id:42,type:'private'}},settings:{allowedChatId:'42',channelId:'@aldiachollos'},state:{},
  load:()=>rows,save:v=>{rows=v},image:()=>Buffer.from('cover'),
  telegram:async()=>({id:-1001,username:'aldiachollos'}),reply:async(...v)=>replies.push(v[2]),
  telegramForm:async(_,method,form)=>calls.push([method,form.get('message_id'),JSON.parse(form.get('reply_markup'))])};
 await handlePublishedEdit({...args,isOwnerSender:false,text:'/editar 8110 17,99 NEW1'});
 assert.equal(args.state.publishedEdits,undefined);
 await handlePublishedEdit({...args,isOwnerSender:true,text:'/editar 8110 17,99 NEW1'});
 assert.equal(calls.length,0); assert.equal(rows[0].price,'19,99 €');
 await handlePublishedEdit({...args,isOwnerSender:true,text:replies.at(-1).split('\n').at(-1)});
 assert.equal(calls[0][0],'editMessageMedia'); assert.equal(calls[0][1],'8110');
 assert.equal(calls[0][2].inline_keyboard[0][0].url,'https://example.com/p');
 assert.equal(rows[0].source_product_id,'item-1'); assert.equal(rows[0].coupon,'NEW1');
 assert.match(rows[0].price,/17,99/);
});
