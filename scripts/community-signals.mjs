import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const USER_AGENT = 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)';
const MAX_SIGNAL_AGE_MS = 48 * 60 * 60 * 1000;
const MICHOLLO_REFRESH_MS = 6 * 60 * 60 * 1000;

function telegramChannelSources() {
  try {
    const file = new URL('../data/telegram-source-channels.json', import.meta.url);
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return (parsed.channels || []).map((entry, index) => {
      const username = String(entry.username || entry.url || '')
        .replace(/^https?:\/\/(?:www\.)?t\.me\/(?:s\/)?/iu, '')
        .replace(/^@/u, '')
        .split(/[/?#]/u)[0]
        .trim();
      return {
        id: String(entry.id || `telegram-${username || index + 1}`),
        kind: 'telegram-public',
        username,
        url: username ? `https://t.me/s/${username}` : '',
        merchant: String(entry.store || ''),
        weight: Math.max(1, Math.min(40, Number(entry.weight) || 20)),
      };
    }).filter((source) => /^[a-z0-9_]{5,}$/iu.test(source.username));
  } catch {
    return [];
  }
}

export const COMMUNITY_SOURCES = [
  { id: 'michollo', kind: 'sitemap', url: 'https://michollo.com/assets/sitemap-chollos-0.xml.gz', weight: 30 },
  { id: 'nolodejesescapar', kind: 'rss', url: 'https://nolodejesescapar.com/feed/', weight: 25 },
  {
    id: 'chollometro-aliexpress',
    kind: 'rss',
    url: 'https://www.chollometro.com/rss/nuevos',
    merchant: 'AliExpress',
    weight: 8,
  },
  ...telegramChannelSources(),
];

const STOP_WORDS = new Set([
  'amazon', 'aliexpress', 'chollo', 'chollazo', 'oferta', 'oferton', 'rebaja', 'descuento', 'precio', 'preciazo', 'gratis',
  'para', 'con', 'por', 'desde', 'solo', 'esta', 'este', 'del', 'las', 'los', 'una', 'unos', 'pack', 'nuevo', 'nueva',
  'juego', 'producto', 'mejor', 'mejores', 'envio', 'oficial', 'calidad', 'edition', 'version', 'modelo', 'color',
]);

function cleanText(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalise(value = '') {
  return cleanText(value)
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function xmlField(xml, name) {
  return cleanText(xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] || '');
}

function categoryFor(value = '') {
  const text = normalise(value);
  if (/gaming|videojuego|consola|raton|teclado/.test(text)) return 'Videojuegos';
  if (/juguete|lego|muneco|nino|infantil/.test(text)) return 'Juguetes';
  if (/herramienta|bricolaje|taladro|destornillador|sierra/.test(text)) return 'Bricolaje';
  if (/cafetera|freidora|cocina|aspirador|limpieza|hogar/.test(text)) return 'Hogar';
  if (/reloj|zapatilla|ropa|mochila|bolso/.test(text)) return 'Moda';
  return 'Tecnología';
}

function sourceStore(value = '') {
  const text = normalise(value);
  if (/amazon/.test(text)) return 'Amazon';
  if (/aliexpress/.test(text)) return 'AliExpress';
  if (/miravia/.test(text)) return 'Miravia';
  return 'Otra';
}

/** Returns the strongest recent community signal that describes the same
 * product. Two concrete terms are required, so generic words cannot make an
 * unrelated catalogue item look community-validated. */
export function communityMatchForTitle(title = '', signals = []) {
  const haystack = normalise(title);
  let best = null;
  for (const signal of signals) {
    const terms = [...new Set((signal.terms || []).map(normalise).filter((term) => term.length >= 3))];
    const matchedTerms = terms.filter((term) => haystack.includes(term));
    const required = Math.min(3, Math.max(2, Math.ceil(terms.length * 0.4)));
    if (matchedTerms.length < required) continue;
    const score = Number(signal.sourceWeight || 0) + matchedTerms.length * 8;
    if (!best || score > best.score) best = {
      id: signal.id,
      source: signal.source,
      sourceUrl: signal.sourceUrl,
      score,
      matchedTerms,
    };
  }
  return best;
}

export function searchTermsForSignal(title) {
  const withoutPrice = cleanText(title)
    .replace(/(?:por|desde|a)\s*\d+(?:[.,]\d+)?\s*€/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*€/gi, ' ');
  const words = normalise(withoutPrice).match(/[a-z0-9]{3,}/g) || [];
  return [...new Set(words.filter((word) => !STOP_WORDS.has(word)))].slice(0, 7);
}

function makeSignal(source, link, title, publishedAt, merchant = '') {
  const terms = searchTermsForSignal(title);
  return {
    id: `${source.id}:${link}`,
    source: source.id,
    sourceUrl: link,
    title: cleanText(title).slice(0, 220),
    publishedAt: publishedAt || new Date().toISOString(),
    merchant: cleanText(merchant),
    sourceStore: sourceStore(merchant || title),
    category: categoryFor(title),
    terms,
    searchQuery: cleanText(title)
      .replace(/(?:por|desde|a)\s*\d+(?:[.,]\d+)?\s*€/gi, '')
      .replace(/\b\d+(?:[.,]\d+)?\s*€/gi, '')
      .slice(0, 115),
    sourceWeight: source.weight,
  };
}

function decodedAttribute(value = '') {
  return cleanText(value)
    .replace(/&amp;/gi, '&')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#x3A;/gi, ':');
}

function productStoreFromUrl(value = '') {
  try {
    const host = new URL(decodedAttribute(value)).hostname.toLowerCase();
    if (host === 'aliexpress.com' || host.endsWith('.aliexpress.com')) return 'AliExpress';
    if (host === 'miravia.es' || host.endsWith('.miravia.es') || host === 'awin1.com' || host.endsWith('.awin1.com')) return 'Miravia';
  } catch {
    return '';
  }
  return '';
}

/** Reads Telegram's public channel preview without using a personal account.
 * It extracts product links and factual discovery terms only; photographs and
 * promotional copy from the source channel never become publication assets. */
export function parseTelegramPublicSignals(source, html, limit = 12) {
  const page = String(html);
  const starts = [...page.matchAll(/<div[^>]+class=["'][^"']*tgme_widget_message_wrap/giu)]
    .map((match) => match.index)
    .filter(Number.isInteger);
  const blocks = starts.map((start, index) => page.slice(start, starts[index + 1] ?? page.length));
  const signals = [];
  for (const block of blocks) {
    const post = decodedAttribute(block.match(/\bdata-post=["']([^"']+)["']/iu)?.[1] || '');
    const messageId = post.split('/').at(-1) || '';
    const textHtml = block.match(/<div[^>]+class=["'][^"']*tgme_widget_message_text[^"']*["'][^>]*>([\s\S]*?)<\/div>/iu)?.[1] || '';
    const title = cleanText(textHtml);
    const publishedAt = decodedAttribute(block.match(/<time[^>]+datetime=["']([^"']+)["']/iu)?.[1] || '');
    const links = [...block.matchAll(/\bhref=["']([^"']+)["']/giu)]
      .map((match) => decodedAttribute(match[1]))
      .filter((link) => productStoreFromUrl(link));
    for (const merchantUrl of [...new Set(links)]) {
      const merchant = productStoreFromUrl(merchantUrl);
      if (source.merchant && normalise(source.merchant) !== normalise(merchant)) continue;
      const sourceUrl = messageId ? `https://t.me/${source.username}/${messageId}` : source.url;
      const signal = makeSignal(source, sourceUrl, title, publishedAt, merchant);
      signal.id = `${source.id}:${post || messageId}:${merchantUrl}`;
      signal.merchantUrl = merchantUrl;
      if (signal.title && signal.terms.length >= 2) signals.push(signal);
      if (signals.length >= limit) return signals;
    }
  }
  return signals;
}

export function parseRssSignals(source, xml, limit = 10) {
  return [...String(xml).matchAll(/<item\b[\s\S]*?<\/item>/gi)]
    .map((match) => {
      const item = match[0];
      const merchant = cleanText(item.match(/<pepper:merchant\b[^>]*\bname=["']([^"']+)["']/i)?.[1] || '');
      if (source.merchant && normalise(merchant) !== normalise(source.merchant)) return null;
      return makeSignal(source, xmlField(item, 'link'), xmlField(item, 'title'), xmlField(item, 'pubDate'), merchant);
    })
    .filter((signal) => signal?.sourceUrl && signal.title && signal.terms.length >= 2)
    .slice(0, limit);
}

export function parseMicholloSitemap(source, compressedXml, limit = 10) {
  const xml = gunzipSync(Buffer.from(compressedXml)).toString('utf8');
  const signals = [];
  const matcher = /<url>\s*<loc>(.*?)<\/loc>\s*(?:<lastmod>(.*?)<\/lastmod>)?[\s\S]*?<\/url>/g;
  let match;
  while (signals.length < limit && (match = matcher.exec(xml))) {
    const link = cleanText(match[1]);
    const slug = new URL(link).pathname
      .replace(/^\//, '')
      .replace(/^chollo-/, '')
      .replace(/-\d+\/?$/, '')
      .replace(/-/g, ' ');
    if (slug) signals.push(makeSignal(source, link, slug, cleanText(match[2])));
  }
  return signals;
}

function isFresh(signal, now) {
  const publishedAt = Date.parse(signal.publishedAt || '');
  return !Number.isFinite(publishedAt) || now - publishedAt <= MAX_SIGNAL_AGE_MS;
}

function shouldRefreshMichollo(state, now) {
  const previous = Date.parse(state?.micholloLastCheckedAt || '');
  return !Number.isFinite(previous) || now - previous >= MICHOLLO_REFRESH_MS;
}

async function fetchSource(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.1',
      'user-agent': USER_AGENT,
    },
  });
  if (!response.ok) throw new Error(`source returned ${response.status}`);
  return response;
}

export async function discoverCommunitySignals({ state = {}, fetchImpl = fetch, now = Date.now() } = {}) {
  const known = new Set((state.seen || []).map((entry) => entry.id));
  const sourceHealth = [];
  const signals = [];

  for (const source of COMMUNITY_SOURCES) {
    if (source.id === 'michollo' && !shouldRefreshMichollo(state, now)) {
      sourceHealth.push({ source: source.id, status: 'deferred' });
      continue;
    }
    try {
      const response = await fetchSource(source.url, fetchImpl);
      const parsed = source.kind === 'rss'
        ? parseRssSignals(source, await response.text())
        : source.kind === 'telegram-public'
          ? parseTelegramPublicSignals(source, await response.text())
          : parseMicholloSitemap(source, await response.arrayBuffer());
      signals.push(...parsed.filter((signal) => isFresh(signal, now) && !known.has(signal.id)));
      sourceHealth.push({ source: source.id, status: 'ok', found: parsed.length });
    } catch (error) {
      sourceHealth.push({ source: source.id, status: 'unavailable', detail: error instanceof Error ? error.message : 'unknown error' });
    }
  }

  return {
    signals: signals
      .filter((signal) => signal.sourceStore !== 'Amazon')
      .sort((left, right) => right.sourceWeight - left.sourceWeight || Date.parse(right.publishedAt) - Date.parse(left.publishedAt)),
    sourceHealth,
    checkedAt: new Date(now).toISOString(),
  };
}

export function nextCommunitySignalState(previous = {}, discovery = {}) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const retained = (previous.seen || []).filter((entry) => Date.parse(entry.seenAt || '') > cutoff);
  const seen = new Map(retained.map((entry) => [entry.id, entry]));
  for (const signal of discovery.signals || []) seen.set(signal.id, { id: signal.id, seenAt: discovery.checkedAt || new Date().toISOString() });
  return {
    seen: [...seen.values()].slice(-250),
    lastCheckedAt: discovery.checkedAt || new Date().toISOString(),
    micholloLastCheckedAt: discovery.sourceHealth?.some((entry) => entry.source === 'michollo' && entry.status !== 'deferred')
      ? discovery.checkedAt || new Date().toISOString()
      : previous.micholloLastCheckedAt,
    sourceHealth: discovery.sourceHealth || [],
  };
}
