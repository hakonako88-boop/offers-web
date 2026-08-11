import fs from 'node:fs';
import path from 'node:path';
import {
  controlHelp,
  formatManualTelegramCaption,
  formatManualWebsiteText,
  manualOfferFromMessage,
} from './telegram-inbox-commands.mjs';

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, 'data', 'telegram-inbox-state.json');
const OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const IMAGES_DIR = path.join(ROOT, 'public', 'tg');
const MAX_PROCESSED_UPDATES = 400;

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function config() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN,
    channelId: process.env.TELEGRAM_CHANNEL_ID,
    controlCode: process.env.TELEGRAM_CONTROL_CODE,
  };
}

function safeError(error, token) {
  return String(error?.message || error || 'Unknown error').replaceAll(token || '', '[redacted]');
}

async function telegram(token, method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`Telegram ${method} failed: ${data.description || response.status}`);
  return data.result;
}

async function mirrorTelegramPhoto(token, fileId, reference) {
  const file = await telegram(token, 'getFile', { file_id: fileId });
  if (!file?.file_path) throw new Error('Telegram did not return the uploaded photo.');
  const extension = path.extname(file.file_path) || '.jpg';
  const filename = `manual-${reference}${extension}`;
  const localPath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(localPath)) {
    const imageResponse = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
    if (!imageResponse.ok) throw new Error(`Could not download Telegram image: ${imageResponse.status}`);
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    fs.writeFileSync(localPath, Buffer.from(await imageResponse.arrayBuffer()));
  }
  return `/tg/${filename}`;
}

async function reply(token, chatId, text) {
  return telegram(token, 'sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

async function publishManualOffer(settings, offer, inputMessage) {
  const channelMessage = await telegram(settings.token, 'sendPhoto', {
    chat_id: settings.channelId,
    photo: offer.photoFileId,
    caption: formatManualTelegramCaption(offer),
    parse_mode: 'HTML',
  });

  const image = await mirrorTelegramPhoto(settings.token, offer.photoFileId, channelMessage.message_id);
  const existingOffers = readJson(OFFERS_FILE, []);
  const record = {
    message_id: channelMessage.message_id,
    source_product_id: `manual-${inputMessage.message_id}`,
    date: Math.floor(Date.now() / 1000),
    title: offer.title,
    text: formatManualWebsiteText(offer),
    image,
    url: offer.url,
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    store: offer.store,
    category: offer.category,
    description: offer.description,
  };
  const withoutPriorVersion = existingOffers.filter((entry) => entry.source_product_id !== record.source_product_id);
  writeJson(OFFERS_FILE, [record, ...withoutPriorVersion]);
  return channelMessage;
}

const settings = config();
if (!settings.token || !settings.channelId) {
  console.log('Telegram inbox skipped: missing Telegram configuration.');
  process.exit(0);
}
if (!settings.controlCode) {
  console.log('Telegram inbox skipped: add the TELEGRAM_CONTROL_CODE secret to enable private commands.');
  process.exit(0);
}

const state = readJson(STATE_FILE, { processedUpdateIds: [] });
const processed = new Set((state.processedUpdateIds || []).map(Number));
const updates = await telegram(settings.token, 'getUpdates', {
  limit: 100,
});

let published = 0;
let handled = 0;
for (const update of updates || []) {
  const updateId = Number(update.update_id);
  if (!Number.isFinite(updateId) || processed.has(updateId)) continue;
  const message = update.message;
  if (!message || message.chat?.type !== 'private') {
    processed.add(updateId);
    continue;
  }

  try {
    const text = message.caption || message.text || '';
    if (/^\/(?:start|ayuda)(?:@\w+)?\b/i.test(String(text).trim())) {
      await reply(settings.token, message.chat.id, controlHelp());
      handled += 1;
    } else if (message.voice) {
      await reply(settings.token, message.chat.id, '🎙️ Esta versión gratuita no transcribe audios. Pega el enlace y los datos con la foto en un solo mensaje.\n\n' + controlHelp());
      handled += 1;
    } else {
      const largestPhoto = Array.isArray(message.photo) ? message.photo.at(-1)?.file_id : '';
      const result = manualOfferFromMessage({
        text,
        photoFileId: largestPhoto,
        controlCode: settings.controlCode,
      });

      if (result.status === 'invalid') {
        await reply(settings.token, message.chat.id, `⚠️ ${result.message}`);
        handled += 1;
      } else if (result.status === 'ready') {
        const channelMessage = await publishManualOffer(settings, result.offer, message);
        await reply(settings.token, message.chat.id, `✅ Publicada en el canal y en Chollos al Día.\nMensaje del canal: ${channelMessage.message_id}`);
        published += 1;
        handled += 1;
      }
    }
  } catch (error) {
    console.warn(`Telegram private message ${message.message_id} could not be processed: ${safeError(error, settings.token)}`);
    try {
      await reply(settings.token, message.chat.id, '⚠️ No se pudo publicar la oferta. Revisa que el enlace, la foto y los precios estén completos e inténtalo de nuevo.');
    } catch {
      // Avoid failing the complete scheduled publication when Telegram cannot send a response.
    }
  }
  processed.add(updateId);
}

writeJson(STATE_FILE, {
  processedUpdateIds: Array.from(processed).sort((left, right) => left - right).slice(-MAX_PROCESSED_UPDATES),
  lastCheckedAt: new Date().toISOString(),
});
console.log(`Telegram private inbox handled ${handled} message(s) and published ${published} offer(s).`);
