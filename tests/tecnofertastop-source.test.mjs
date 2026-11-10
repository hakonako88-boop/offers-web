import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sourceMessagesToQueue } from '../scripts/check-telegram-source-changes.mjs';
test('new approved source imports only a bounded recent preview, other sources keep safe initialization',()=>{
 const now=new Date('2026-11-11T00:00:00Z');
 const messages=[{messageId:1,publishedAt:'2026-11-09T23:00:00Z'},{messageId:2,publishedAt:'2026-11-10T23:00:00Z'},{messageId:3,publishedAt:'2026-11-12T00:00:00Z'}];
 assert.deepEqual(sourceMessagesToQueue({},messages,NaN,now),[]);
 assert.deepEqual(sourceMessagesToQueue({initialLookbackHours:24},messages,NaN,now).map(m=>m.messageId),[2]);
 assert.deepEqual(sourceMessagesToQueue({},messages,2,now).map(m=>m.messageId),[3]);
});
test('TecnOfertasTop is permanently watched but the overnight batch is date-bound and capped',()=>{
 const config=JSON.parse(fs.readFileSync('data/telegram-source-channels.json'));
 assert.ok(config.channels.some(c=>c.id==='telegram-tecnofertastop'&&c.singleProductOnly&&c.initialLookbackHours===24));
 const code=fs.readFileSync('scripts/publish-11-11-exception.mjs','utf8');
 assert.match(code,/day !== '2026-11-11'/); assert.match(code,/slice\(0,3\)/);
 assert.match(code,/REQUESTED_SOURCE_ITEM_ID:item.id/);
});
