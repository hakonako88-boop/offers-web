import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_STATE_FILE = path.join(process.cwd(), 'data', 'telegram-inbox-state.json');

function readState(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

export function telegramMirrorDestination({ env = process.env, stateFile = DEFAULT_STATE_FILE } = {}) {
  const stored = readState(stateFile).mirrorDestination || {};
  const chatId = String(env.TELEGRAM_MIRROR_CHAT_ID || stored.chatId || '').trim();
  const topicId = Number(env.TELEGRAM_MIRROR_TOPIC_ID || stored.topicId || 0);
  if (!chatId) return null;
  return {
    chatId,
    topicId: Number.isSafeInteger(topicId) && topicId > 0 ? topicId : null,
    title: String(stored.title || '').trim(),
  };
}

/** Copies an offer already published in the main channel to a forum topic. */
export async function mirrorTelegramMessage({
  token,
  sourceChatId,
  message,
  replyMarkup,
  env = process.env,
  stateFile = DEFAULT_STATE_FILE,
  fetchImpl = fetch,
} = {}) {
  const destination = telegramMirrorDestination({ env, stateFile });
  const messageId = Number(message?.message_id || message);
  if (!token || !sourceChatId || !Number.isSafeInteger(messageId) || !destination) return null;
  if (String(sourceChatId) === destination.chatId) return null;

  const payload = {
    chat_id: destination.chatId,
    from_chat_id: sourceChatId,
    message_id: messageId,
    disable_notification: true,
    ...(destination.topicId ? { message_thread_id: destination.topicId } : {}),
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  };

  try {
    const response = await fetchImpl(`https://api.telegram.org/bot${token}/copyMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.description || `status ${response.status}`);
    console.log(`Telegram offer mirrored to ${destination.title || destination.chatId}${destination.topicId ? ` topic ${destination.topicId}` : ''}.`);
    return data.result;
  } catch (error) {
    const safeMessage = String(error?.message || error).replaceAll(String(token), '[redacted]');
    console.warn(`Secondary Telegram mirror skipped: ${safeMessage}`);
    return null;
  }
}
