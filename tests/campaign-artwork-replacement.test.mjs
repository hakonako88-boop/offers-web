import test from 'node:test';
import assert from 'node:assert/strict';
import { replacements, replacementPayload } from '../scripts/replace-campaign-artwork.mjs';
test('only edits the two authorized messages and retains converted links', () => {
  for (const item of replacements) {
    const links = Array.from({length:4},(_,i)=>({affiliate:`https://s.click.aliexpress.com/e/owner${i}`}));
    const payload = replacementPayload(item, {record:{id:item.id,message_id:item.messageId},links},'@aldiachollos');
    assert.equal(payload.message_id,item.messageId);
    assert.equal(payload.media.media,'attach://photo');
    assert.ok(payload.media.caption.length<=1024);
    assert.equal(payload.reply_markup.inline_keyboard.length,item.messageId===8071?1:4);
    assert.throws(()=>replacementPayload(item,{record:{id:item.id,message_id:1},links},'@aldiachollos'),/no coincide/);
  }
});
