import test from 'node:test';import assert from 'node:assert/strict';import {periodTopOffers} from '../scripts/period-top-offers.mjs';
const now=Date.parse('2026-11-08T12:00:00Z');const row={id:'a',active:true,price:10,oldPrice:20,imageUrl:'/a.jpg',verifiedDate:'2026-11-08T11:00:00Z'};
test('day week month respect publication age and exclude inactive future invalid or duplicated records',()=>{
const data=[row,row,{...row,id:'week',verifiedDate:'2026-11-03'},{...row,id:'month',verifiedDate:'2026-10-20'},{...row,id:'inactive',active:false},{...row,id:'future',verifiedDate:'2027-01-01'},{...row,id:'invalid',price:0}];
assert.deepEqual(periodTopOffers(data,1,now).map(r=>r.id),['a']);assert.equal(periodTopOffers(data,7,now).length,2);assert.equal(periodTopOffers(data,30,now).length,3);
});
