import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES_PATH = path.join(ROOT, 'data', 'telegram-source-channels.json');
const STATE_PATH = path.join(ROOT, 'data', 'telegram-channel-checkpoints.json');
const QUEUE_PATH = path.join(ROOT, 'data', 'telegram-source-queue.json');
const MAX_HISTORY_PAGES = 8;
const MAX_QUEUE_ITEMS = 1_000;

export function channelUsername(url) {
  const match = String(url || '').match(/^https?:\/\/(?:www\.)?t\.me\/(?:s\/)?([A-Za-z0-9_]+)/iu);
  return match?.[1] || null;
}

export function latestPublicMessageId(html, username) {
  const escaped = String(username).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const matches = [...String(html).matchAll(new RegExp(`data-post=["']${escaped}\\/(\\d+)["']`, 'giu'))];
  const ids = matches.map((match) => Number(match[1])).filter(Number.isSafeInteger);
  return ids.length ? Math.max(...ids) : null;
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/<br\s*\/?>/giu, '\n')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/&quot;/giu, '"')
    .replace(/&#0*39;|&apos;/giu, "'")
    .replace(/&#x2F;/giu, '/')
    .replace(/&#x3A;/giu, ':')
    .replace(/&nbsp;/giu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function storeForUrl(value = '', context = '', configuredStore = '') {
  try {
    const url = new URL(decodeHtml(value));
    const host = url.hostname.toLowerCase();
    if (host === 'amazon.es' || host.endsWith('.amazon.es') || host === 'amzn.to' || host === 'link.amazon') return 'Amazon';
    if (host === 'aliexpress.com' || host.endsWith('.aliexpress.com')) return 'AliExpress';
    if (host === 'miravia.es' || host.endsWith('.miravia.es') || host === 'awin1.com' || host.endsWith('.awin1.com')) return 'Miravia';
    if ((host === 'chz.to' || host === 'cholloschina.com' || host.endsWith('.cholloschina.com'))
      && String(configuredStore).toLowerCase() === 'aliexpress') return 'AliExpress';
    if ((host === 'tidd.ly' || host.endsWith('.tidd.ly')) && /miravia/iu.test(context)) return 'Miravia';
    if (host === 'ift.tt') {
      if (/amazon/iu.test(context)) return 'Amazon';
      if (/aliexpress/iu.test(context)) return 'AliExpress';
      if (/miravia/iu.test(context)) return 'Miravia';
    }
  } catch {
    return '';
  }
  return '';
}

export function parseTelegramPublicMessages(source, html) {
  const page = String(html || '');
  const starts = [...page.matchAll(/<div[^>]+class=["'][^"']*tgme_widget_message_wrap/giu)]
    .map((match) => match.index)
    .filter(Number.isInteger);
  const messages = [];
  for (let index = 0; index < starts.length; index += 1) {
    const block = page.slice(starts[index], starts[index + 1] ?? page.length);
    const post = decodeHtml(block.match(/\bdata-post=["']([^"']+)["']/iu)?.[1] || '');
    const messageId = Number(post.split('/').at(-1));
    if (!Number.isSafeInteger(messageId)) continue;
    const textHtml = block.match(/<div[^>]+class=["'][^"']*tgme_widget_message_text[^"']*["'][^>]*>([\s\S]*?)<\/div>/iu)?.[1] || '';
    const text = decodeHtml(textHtml);
    const publishedAt = decodeHtml(block.match(/<time[^>]+datetime=["']([^"']+)["']/iu)?.[1] || '');
    const links = [...block.matchAll(/\bhref=["']([^"']+)["']/giu)]
      .map((match) => decodeHtml(match[1]))
      .map((url) => ({ url, store: storeForUrl(url, text, source.store) }))
      .filter((entry) => entry.store);
    messages.push({ messageId, text, publishedAt, links: [...new Map(links.map((entry) => [entry.url, entry])).values()] });
  }
  return messages.sort((left, right) => left.messageId - right.messageId);
}

export function compareCheckpoint(previousId, currentId) {
  if (!Number.isSafeInteger(currentId)) return { changed: false, nextId: previousId ?? null };
  if (!Number.isSafeInteger(previousId)) return { changed: false, nextId: currentId };
  return { changed: currentId > previousId, nextId: Math.max(previousId, currentId) };
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  await fs.appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, 'utf8');
}

export async function checkTelegramSources({ fetchImpl = fetch } = {}) {
  const sourceConfig = await readJson(SOURCES_PATH, { channels: [] });
  const oldState = await readJson(STATE_PATH, { version: 1, channels: {} });
  const oldQueue = await readJson(QUEUE_PATH, { version: 1, items: [] });
  const nextChannels = { ...(oldState.channels || {}) };
  const queueItems = new Map((oldQueue.items || []).map((item) => [item.id, item]));
  const changedChannels = [];
  const errors = [];
  let stateChanged = false;

  for (const source of sourceConfig.channels || []) {
    const username = channelUsername(source.url);
    if (!username) {
      errors.push(`${source.id}: URL no válida`);
      continue;
    }

    try {
      const previousId = Number(nextChannels[source.id]?.lastPostId);
      const fetchedMessages = new Map();
      let before = null;
      let currentId = null;
      for (let pageNumber = 0; pageNumber < MAX_HISTORY_PAGES; pageNumber += 1) {
        const pageUrl = `https://t.me/s/${username}${before ? `?before=${before}` : ''}`;
        const response = await fetchImpl(pageUrl, {
          headers: {
            'user-agent': 'Mozilla/5.0 (compatible; ChollosAlDiaSourceMonitor/2.0; +https://chollosaldia.com)',
            'accept-language': 'es-ES,es;q=0.9',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const messages = parseTelegramPublicMessages(source, html);
        if (!messages.length) throw new Error('no se encontró ningún mensaje público');
        for (const message of messages) fetchedMessages.set(message.messageId, message);
        const pageMax = Math.max(...messages.map((message) => message.messageId));
        const pageMin = Math.min(...messages.map((message) => message.messageId));
        if (!Number.isSafeInteger(currentId)) currentId = pageMax;
        if (!Number.isSafeInteger(previousId) || pageMin <= previousId + 1) break;
        before = pageMin;
      }
      if (!Number.isSafeInteger(currentId)) throw new Error('no se encontró ningún mensaje público');
      const comparison = compareCheckpoint(previousId, currentId);
      if (comparison.changed) changedChannels.push(source.id);
      if (Number.isSafeInteger(previousId)) {
        for (const message of [...fetchedMessages.values()].filter((entry) => entry.messageId > previousId)) {
          const sourceUrl = `https://t.me/${username}/${message.messageId}`;
          if (!message.links.length) {
            const id = `${source.id}:${message.messageId}:ignored`;
            if (!queueItems.has(id)) queueItems.set(id, {
              id, source: source.id, username, messageId: message.messageId, sourceUrl,
              publishedAt: message.publishedAt || new Date().toISOString(), text: message.text,
              store: 'Otra', merchantUrl: '', status: 'ignored', reason: 'Sin enlace compatible de Amazon, AliExpress o Miravia',
              attempts: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            });
          }
          message.links.forEach((link, linkIndex) => {
            const id = `${source.id}:${message.messageId}:${link.store.toLowerCase()}:${linkIndex}`;
            if (!queueItems.has(id)) queueItems.set(id, {
              id, source: source.id, username, messageId: message.messageId, sourceUrl,
              publishedAt: message.publishedAt || new Date().toISOString(), text: message.text,
              store: link.store, merchantUrl: link.url, status: 'pending', reason: '',
              attempts: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            });
          });
        }
      }
      if (!nextChannels[source.id] || comparison.nextId !== previousId) {
        nextChannels[source.id] = {
          username,
          lastPostId: comparison.nextId,
          advancedAt: new Date().toISOString(),
        };
        stateChanged = true;
      }
    } catch (error) {
      errors.push(`${source.id}: ${error.message}`);
    }
  }

  const persistedState = {
    version: 1,
    channels: nextChannels,
  };
  const persistedQueue = {
    version: 1,
    items: [...queueItems.values()]
      .sort((left, right) => Date.parse(left.createdAt || '') - Date.parse(right.createdAt || ''))
      .slice(-MAX_QUEUE_ITEMS),
  };
  const queueChanged = JSON.stringify(persistedQueue) !== JSON.stringify(oldQueue);
  if (stateChanged) {
    await fs.writeFile(STATE_PATH, `${JSON.stringify(persistedState, null, 2)}\n`, 'utf8');
  }
  if (queueChanged) await fs.writeFile(QUEUE_PATH, `${JSON.stringify(persistedQueue, null, 2)}\n`, 'utf8');
  const pendingCount = persistedQueue.items.filter((item) => item.status === 'pending').length;
  await writeOutput('changed', changedChannels.length || pendingCount ? 'true' : 'false');
  await writeOutput('channels', changedChannels.join(','));
  await writeOutput('errors', String(errors.length));
  await writeOutput('pending', String(pendingCount));
  return { ...persistedState, queue: persistedQueue, changedChannels, errors, stateChanged: stateChanged || queueChanged, pendingCount };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkTelegramSources();
  console.log(result.changedChannels.length
    ? `Novedades: ${result.changedChannels.join(', ')}`
    : 'Sin publicaciones nuevas en los canales vigilados.');
  console.log(`Cola pendiente: ${result.pendingCount}.`);
  if (result.errors.length) console.warn(`Avisos: ${result.errors.join(' | ')}`);
}
