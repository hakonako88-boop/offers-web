import { gunzipSync } from 'node:zlib';

const USER_AGENT = 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)';
const MAX_SIGNAL_AGE_MS = 48 * 60 * 60 * 1000;
const MICHOLLO_REFRESH_MS = 6 * 60 * 60 * 1000;

export const COMMUNITY_SOURCES = [
  { id: 'chollometro', kind: 'rss', url: 'https://www.chollometro.com/rss', weight: 14 },
  { id: 'nolodejesescapar', kind: 'rss', url: 'https://nolodejesescapar.com/feed/', weight: 12 },
  { id: 'michollo', kind: 'sitemap', url: 'https://michollo.com/assets/sitemap-chollos-0.xml.gz', weight: 8 },
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
  return 'Otra';
}

export function searchTermsForSignal(title) {
  const withoutPrice = cleanText(title)
    .replace(/(?:por|desde|a)\s*\d+(?:[.,]\d+)?\s*€/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*€/gi, ' ');
  const words = normalise(withoutPrice).match(/[a-z0-9]{3,}/g) || [];
  return [...new Set(words.filter((word) => !STOP_WORDS.has(word)))].slice(0, 7);
}

function makeSignal(source, link, title, publishedAt) {
  const terms = searchTermsForSignal(title);
  return {
    id: `${source.id}:${link}`,
    source: source.id,
    sourceUrl: link,
    title: cleanText(title).slice(0, 220),
    publishedAt: publishedAt || new Date().toISOString(),
    sourceStore: sourceStore(title),
    category: categoryFor(title),
    terms,
    searchQuery: cleanText(title)
      .replace(/(?:por|desde|a)\s*\d+(?:[.,]\d+)?\s*€/gi, '')
      .replace(/\b\d+(?:[.,]\d+)?\s*€/gi, '')
      .slice(0, 115),
    sourceWeight: source.weight,
  };
}

export function parseRssSignals(source, xml, limit = 10) {
  return [...String(xml).matchAll(/<item\b[\s\S]*?<\/item>/gi)]
    .slice(0, limit)
    .map((match) => {
      const item = match[0];
      return makeSignal(source, xmlField(item, 'link'), xmlField(item, 'title'), xmlField(item, 'pubDate'));
    })
    .filter((signal) => signal.sourceUrl && signal.title && signal.terms.length >= 2);
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
