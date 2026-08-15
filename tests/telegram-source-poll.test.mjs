import assert from 'node:assert/strict';
import test from 'node:test';

import {
  channelUsername,
  compareCheckpoint,
  latestPublicMessageId,
} from '../scripts/check-telegram-source-changes.mjs';

test('normalizes public Telegram channel URLs', () => {
  assert.equal(channelUsername('https://t.me/Ofertos'), 'Ofertos');
  assert.equal(channelUsername('https://t.me/s/una_ganga'), 'una_ganga');
  assert.equal(channelUsername('https://example.com/no'), null);
});

test('finds the newest visible message and ignores older or pinned posts', () => {
  const html = `
    <div data-post="Ofertos/91"></div>
    <div data-post='Ofertos/105'></div>
    <div data-post="Ofertos/99"></div>
    <div data-post="another/999"></div>`;
  assert.equal(latestPublicMessageId(html, 'Ofertos'), 105);
});

test('initializes a channel without publishing its existing backlog', () => {
  assert.deepEqual(compareCheckpoint(undefined, 105), { changed: false, nextId: 105 });
  assert.deepEqual(compareCheckpoint(105, 106), { changed: true, nextId: 106 });
  assert.deepEqual(compareCheckpoint(106, 105), { changed: false, nextId: 106 });
});
