import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { mirrorTelegramMessage, telegramMirrorDestination } from '../scripts/telegram-mirror.mjs';

function stateFile(value) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chollos-telegram-mirror-'));
  const file = path.join(directory, 'state.json');
  fs.writeFileSync(file, JSON.stringify(value));
  return file;
}

test('reads the exact secondary group and topic learned by Rocky', () => {
  const file = stateFile({ mirrorDestination: { chatId: '-100123', topicId: 456, title: 'WuPlay · Ofertas' } });
  assert.deepEqual(telegramMirrorDestination({ env: {}, stateFile: file }), {
    chatId: '-100123',
    topicId: 456,
    title: 'WuPlay · Ofertas',
  });
});

test('copies the published offer with its buttons into the configured topic', async () => {
  const file = stateFile({ mirrorDestination: { chatId: '-100123', topicId: 456 } });
  let request;
  const result = await mirrorTelegramMessage({
    token: 'secret-token',
    sourceChatId: '-100999',
    message: { message_id: 77 },
    replyMarkup: { inline_keyboard: [[{ text: 'VER OFERTA', url: 'https://example.com' }]] },
    env: {},
    stateFile: file,
    fetchImpl: async (url, options) => {
      request = { url, payload: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ ok: true, result: { message_id: 88 } }) };
    },
  });

  assert.equal(result.message_id, 88);
  assert.match(request.url, /\/copyMessage$/u);
  assert.deepEqual(request.payload, {
    chat_id: '-100123',
    from_chat_id: '-100999',
    message_id: 77,
    disable_notification: true,
    message_thread_id: 456,
    reply_markup: { inline_keyboard: [[{ text: 'VER OFERTA', url: 'https://example.com' }]] },
  });
});

test('does not fail the main publication when the secondary group is unavailable', async () => {
  const file = stateFile({ mirrorDestination: { chatId: '-100123', topicId: 456 } });
  const result = await mirrorTelegramMessage({
    token: 'secret-token',
    sourceChatId: '-100999',
    message: 77,
    env: {},
    stateFile: file,
    fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ ok: false, description: 'forbidden' }) }),
  });
  assert.equal(result, null);
});
