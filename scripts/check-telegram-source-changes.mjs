import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES_PATH = path.join(ROOT, 'data', 'telegram-source-channels.json');
const STATE_PATH = path.join(ROOT, 'data', 'telegram-channel-checkpoints.json');

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
  const nextChannels = { ...(oldState.channels || {}) };
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
      const response = await fetchImpl(`https://t.me/s/${username}`, {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; ChollosAlDiaSourceMonitor/1.0; +https://chollosaldia.com)',
          'accept-language': 'es-ES,es;q=0.9',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const currentId = latestPublicMessageId(await response.text(), username);
      if (!Number.isSafeInteger(currentId)) throw new Error('no se encontró ningún mensaje público');

      const previousId = Number(nextChannels[source.id]?.lastPostId);
      const comparison = compareCheckpoint(previousId, currentId);
      if (comparison.changed) changedChannels.push(source.id);
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
  if (stateChanged) {
    await fs.writeFile(STATE_PATH, `${JSON.stringify(persistedState, null, 2)}\n`, 'utf8');
  }
  await writeOutput('changed', changedChannels.length ? 'true' : 'false');
  await writeOutput('channels', changedChannels.join(','));
  await writeOutput('errors', String(errors.length));
  return { ...persistedState, changedChannels, errors, stateChanged };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkTelegramSources();
  console.log(result.changedChannels.length
    ? `Novedades: ${result.changedChannels.join(', ')}`
    : 'Sin publicaciones nuevas en los canales vigilados.');
  if (result.errors.length) console.warn(`Avisos: ${result.errors.join(' | ')}`);
}
