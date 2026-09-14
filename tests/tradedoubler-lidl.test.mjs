import assert from 'node:assert/strict';
import test from 'node:test';
import { LIDL_PROGRAM_ID, spanishLidlFeeds } from '../scripts/discover-tradedoubler-lidl.mjs';

test('selects only active Spanish Lidl feeds without exposing credentials', () => {
  const feeds = spanishLidlFeeds({ feeds: [
    { feedId: 10, active: true, visible: true, languageISOCode: 'es', currencyISOCode: 'EUR', numberOfProducts: 200, programs: [{ programId: Number(LIDL_PROGRAM_ID), name: 'Lidl AFF ES' }] },
    { feedId: 11, active: true, visible: true, languageISOCode: 'de', programs: [{ programId: Number(LIDL_PROGRAM_ID) }] },
    { feedId: 12, active: false, visible: true, languageISOCode: 'es', programs: [{ programId: Number(LIDL_PROGRAM_ID) }] },
    { feedId: 13, active: true, visible: true, languageISOCode: 'es', programs: [{ programId: 123 }] },
  ] });
  assert.deepEqual(feeds.map((feed) => feed.feedId), ['10']);
  assert.equal(JSON.stringify(feeds).includes('token'), false);
});
