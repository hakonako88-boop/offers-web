import test from 'node:test';
import assert from 'node:assert/strict';
import { appendTeslaHistory, observedTeslaTrend, selectTeslaDaily } from '../scripts/tesla-daily-selection.mjs';
const now = Date.parse('2026-11-05T18:00:00Z');
const row = { productId:'123', store:'AliExpress', name:'Tesla Model Y Juniper floor mats', listedPrice:25, currency:'EUR', checkedAt:'2026-11-05T17:00:00Z', priceBasis:'product_level_not_selected_sku', imageUrl:'https://example.com/mat.jpg', generatedAffiliateUrl:'https://s.click.aliexpress.com/e/test', coupon:null };
test('daily selection rejects stale prices, safety parts, wrong links and duplicates',()=>{
 const rows=[row,row,{...row,productId:'stale',checkedAt:'2026-11-01'}, {...row,productId:'charger',name:'Tesla Model Y charger floor mats'}, {...row,productId:'bad',generatedAffiliateUrl:'https://example.com'}];
 assert.deepEqual(selectTeslaDaily(rows,{},now).map(item=>item.productId),['123']);
});
test('history never imports Amazon content, fabricates older dates or repeats snapshots',()=>{
 const history=appendTeslaHistory({},[row,row,{...row,store:'Amazon',productId:'ASIN'}]);
 assert.equal(history['123'].length,1); assert.equal(history.ASIN,undefined);
 assert.equal(observedTeslaTrend(row,history,now),null);
});
test('lower advertised price compares only earlier observations with same basis',()=>{
 const old={...row,listedPrice:30,checkedAt:'2026-11-04T17:00:00Z'};
 const history=appendTeslaHistory({},[old,row]);
 assert.equal(observedTeslaTrend(row,history,now).lowerAdvertisedPrice,true);
 assert.equal(observedTeslaTrend({...row,priceBasis:'selected_sku'},history,now),null);
 assert.equal(observedTeslaTrend({...row,checkedAt:'2026-11-01'},history,now),null);
});
test('selection prefers an observed improvement and provides category diversity',()=>{
 const old={...row,listedPrice:30,checkedAt:'2026-11-04T17:00:00Z'};
 const other={...row,productId:'456',name:'Tesla Model 3 Highland console organizer'};
 const third={...row,productId:'789'};
 const result=selectTeslaDaily([other,third,row],appendTeslaHistory({},[old]),now,2);
 assert.deepEqual(result.map(item=>item.productId),['123','456']);
});
