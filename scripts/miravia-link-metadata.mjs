import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { highResolutionMiraviaImage, miraviaFeedEntries, parseFeedList } from './miravia-offers.mjs';

function key(value = '') {
  return String(value)
    .replace(/^\uFEFF/u, '')
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/gu, '_')
    .replace(/^_+|_+$/gu, '');
}

function value(record, names) {
  for (const name of names) {
    const found = record[name];
    if (found !== undefined && found !== null && String(found).trim()) return String(found).trim();
  }
  return '';
}

function amount(input = '') {
  const clean = String(input).replace(/\u00a0/gu, '').replace(/\s/gu, '').replace(/[^0-9,.-]/gu, '');
  if (!clean) return 0;
  const comma = clean.lastIndexOf(',');
  const dot = clean.lastIndexOf('.');
  const normalized = comma >= 0 && dot >= 0
    ? (comma > dot ? clean.replaceAll('.', '').replace(',', '.') : clean.replaceAll(',', ''))
    : clean.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function miraviaUrl(valueToCheck = '') {
  try {
    const parsed = new URL(valueToCheck);
    const host = parsed.hostname.toLowerCase();
    return host === 'miravia.es' || host.endsWith('.miravia.es') ? parsed.toString() : '';
  } catch {
    return '';
  }
}

export function miraviaMetadataFromFeedRecord(record = {}) {
  const productId = value(record, ['aw_product_id', 'product_id', 'merchant_product_id', 'pid']);
  const title = value(record, ['product_name', 'name', 'title']);
  const imageUrl = highResolutionMiraviaImage(value(record, [
    'aw_image_url', 'large_image', 'merchant_image_url', 'image_url', 'merchant_thumb_url',
  ]));
  const price = amount(value(record, ['search_price', 'store_price', 'sale_price', 'price']));
  const oldPrice = amount(value(record, ['product_price_old', 'rrp_price', 'base_price', 'old_price']));
  const finalUrl = miraviaUrl(value(record, ['merchant_deep_link', 'aw_deep_link', 'basket_link', 'product_url', 'url']));
  return {
    ...(productId ? { productId } : {}),
    title,
    description: title,
    imageUrl,
    price,
    previousPrice: oldPrice > price ? oldPrice : 0,
    finalUrl,
  };
}

function identitiesFromUrl(url = '') {
  try {
    const parsed = new URL(url);
    return new Set([
      parsed.searchParams.get('p'),
      ...[...parsed.pathname.matchAll(/(?:^|[-_/])([is]\d{8,})(?=[-_.?/]|$)/giu)].map((match) => match[1].slice(1)),
    ].filter(Boolean));
  } catch {
    return new Set();
  }
}

function rowMatches(record, identities) {
  const productId = value(record, ['aw_product_id', 'product_id', 'merchant_product_id', 'pid']);
  if (productId && identities.has(productId)) return true;
  const urls = ['merchant_deep_link', 'aw_deep_link', 'basket_link', 'product_url', 'url']
    .map((name) => String(record[name] || ''))
    .join(' ');
  return [...identities].some((identity) => new RegExp(`(?:^|\\D)${identity}(?:\\D|$)`, 'u').test(urls));
}

class CsvReader {
  constructor(onRow) {
    this.onRow = onRow;
    this.field = '';
    this.row = [];
    this.quoted = false;
    this.stopped = false;
  }

  push(chunk) {
    for (let index = 0; index < chunk.length && !this.stopped; index += 1) {
      const char = chunk[index];
      if (this.quoted) {
        if (char === '"' && chunk[index + 1] === '"') {
          this.field += '"';
          index += 1;
        } else if (char === '"') {
          this.quoted = false;
        } else {
          this.field += char;
        }
      } else if (char === '"' && this.field === '') {
        this.quoted = true;
      } else if (char === ',') {
        this.row.push(this.field);
        this.field = '';
      } else if (char === '\n') {
        this.row.push(this.field.replace(/\r$/u, ''));
        this.field = '';
        this.stopped = this.onRow(this.row) === false;
        this.row = [];
      } else {
        this.field += char;
      }
    }
  }

  finish() {
    if (this.stopped || (!this.field && !this.row.length)) return;
    this.row.push(this.field.replace(/\r$/u, ''));
    this.stopped = this.onRow(this.row) === false;
    this.field = '';
    this.row = [];
  }
}

async function scanFeed(feed, identities, fetchImpl, signal) {
  const response = await fetchImpl(feed.url, {
    signal,
    headers: { 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' },
  });
  if (!response.ok || !response.body) return null;
  let headers = null;
  let found = null;
  const reader = new CsvReader((columns) => {
    if (!headers) {
      headers = columns.map(key);
      return true;
    }
    const record = Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? '']));
    if (!rowMatches(record, identities)) return true;
    found = miraviaMetadataFromFeedRecord(record);
    return false;
  });
  const decoder = new TextDecoder('utf-8');
  const raw = Readable.fromWeb(response.body);
  const stream = /gzip/iu.test(`${feed.url} ${response.headers.get('content-encoding') || ''}`)
    ? raw.pipe(createGunzip())
    : raw;
  try {
    for await (const chunk of stream) {
      reader.push(decoder.decode(chunk, { stream: true }));
      if (reader.stopped) break;
    }
    reader.push(decoder.decode());
    reader.finish();
  } finally {
    stream.destroy();
  }
  return found;
}

/** Looks up an Awin/Miravia product in the account's official feeds. This is
 * the reliable fallback when Miravia serves GitHub an empty application shell
 * instead of Open Graph metadata. Feeds are streamed in parallel and stopped
 * as soon as the exact product is found. */
export async function resolveMiraviaFeedMetadata(url, feedListUrl, { fetchImpl = fetch } = {}) {
  const identities = identitiesFromUrl(url);
  if (!identities.size || !feedListUrl) return {};
  const listResponse = await fetchImpl(feedListUrl, {
    headers: { 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' },
  });
  if (!listResponse.ok) throw new Error(`Awin feed list responded ${listResponse.status}.`);
  const feeds = miraviaFeedEntries(parseFeedList(await listResponse.text()))
    .sort((left, right) => {
      const leftPriority = /premium/iu.test(left.feed_name || '') ? 0 : 1;
      const rightPriority = /premium/iu.test(right.feed_name || '') ? 0 : 1;
      return leftPriority - rightPriority;
    })
    .slice(0, 12);
  if (!feeds.length) return {};

  const controller = new AbortController();
  return new Promise((resolve) => {
    let nextFeed = 0;
    let settled = false;
    const timeout = setTimeout(() => finish({}), 25_000);
    const finish = (metadata = {}) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      controller.abort();
      resolve(metadata);
    };
    const worker = async () => {
      while (!settled && nextFeed < feeds.length) {
        const feed = feeds[nextFeed];
        nextFeed += 1;
        try {
          const metadata = await scanFeed(feed, identities, fetchImpl, controller.signal);
          if (metadata?.productId) {
            finish(metadata);
            return;
          }
        } catch (error) {
          if (error?.name !== 'AbortError') console.warn(`Could not scan Miravia feed ${feed.feed_id}: ${error.message}`);
        }
      }
    };
    Promise.all(Array.from({ length: Math.min(3, feeds.length) }, () => worker()))
      .then(() => finish({}))
      .catch(() => finish({}));
  });
}
