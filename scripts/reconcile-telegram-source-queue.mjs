import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const QUEUE_FILE = path.join(ROOT, 'data', 'telegram-source-queue.json');
const REPORT_FILE = path.join(ROOT, 'data', 'telegram-source-queue-report.json');
const AMAZON_STATE_FILE = path.join(ROOT, 'data', 'amazon-discovery-state.json');
const ALIEXPRESS_COMMUNITY_STATE_FILE = path.join(ROOT, 'data', 'community-signal-state.json');
const PUBLICATION_FILES = [
  path.join(ROOT, 'data', 'aliexpress-publications.json'),
  path.join(ROOT, 'data', 'miravia-publications.json'),
  path.join(ROOT, 'data', 'amazon-publications.json'),
];
const MAX_ATTEMPTS = 3;
const MIRAVIA_RETRY_POLICY = 'exact-official-page-v1';
const ALIEXPRESS_RETRY_POLICY = 'attempted-item-accounting-v5';

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const queue = readJson(QUEUE_FILE, { version: 1, items: [] });
const publications = PUBLICATION_FILES.flatMap((file) => readJson(file, { published: [] }).published || []);
const publicationBySignal = new Map(publications
  .filter((entry) => entry.communitySignalId)
  .map((entry) => [entry.communitySignalId, entry]));
const amazonError = String(readJson(AMAZON_STATE_FILE, {}).lastError || '');
const aliExpressCommunityState = readJson(ALIEXPRESS_COMMUNITY_STATE_FILE, { seen: [] });
const latestAliExpressCheck = String(aliExpressCommunityState.lastCheckedAt || '');
const attemptedAliExpressIds = new Set((aliExpressCommunityState.seen || [])
  .filter((entry) => latestAliExpressCheck && entry.seenAt === latestAliExpressCheck)
  .map((entry) => entry.id));
const now = new Date().toISOString();

// The former Miravia reader could not expand tidd.ly and rejected otherwise
// valid posts. Reopen recent affected items exactly once after installing the
// official-page resolver; every offer still has to pass the normal validation.
const retryCutoff = Date.now() - 48 * 60 * 60 * 1000;
const reopenedIds = new Set();
for (const item of queue.items || []) {
  const publishedAt = Date.parse(item.publishedAt || '');
  if (item.store === 'Miravia'
    && item.status === 'rejected'
    && item.retryPolicyVersion !== MIRAVIA_RETRY_POLICY
    && (!Number.isFinite(publishedAt) || publishedAt >= retryCutoff)) {
    item.status = 'pending';
    item.attempts = 0;
    item.reason = 'Reabierta para verificar la ficha oficial de Miravia y generar el enlace Awin propio';
    item.retryPolicyVersion = MIRAVIA_RETRY_POLICY;
    item.updatedAt = now;
    reopenedIds.add(item.id);
  }
  if (item.store === 'AliExpress'
    && item.status === 'rejected'
    && item.retryPolicyVersion !== ALIEXPRESS_RETRY_POLICY
    && (!Number.isFinite(publishedAt) || publishedAt >= retryCutoff)) {
    item.status = 'pending';
    item.attempts = 0;
    item.reason = 'Reabierta para verificar el producto oficial y generar el enlace propio de AliExpress';
    item.retryPolicyVersion = ALIEXPRESS_RETRY_POLICY;
    item.updatedAt = now;
    reopenedIds.add(item.id);
  }
}

for (const item of queue.items || []) {
  if (item.status !== 'pending') continue;
  if (reopenedIds.has(item.id)) continue;
  const publication = publicationBySignal.get(item.id);
  if (publication) {
    item.status = 'published';
    item.reason = 'Oferta verificada y publicada con la afiliación de ChollosAlDía';
    item.telegramMessageId = publication.telegramMessageId || publication.message_id || null;
    item.resultUrl = publication.url || '';
    item.updatedAt = now;
    continue;
  }

  if (item.store === 'Amazon' && /eligibility requirements/iu.test(amazonError)) {
    // The catalogue API may still be unavailable, but public source messages
    // with an ASIN, a factual price and a product title can be prepared as a
    // private review draft. The owner confirms it before any publication.
    item.reason = 'Pendiente de vista previa automática con ASIN, imagen oficial y tag propio';
    item.updatedAt = now;
    continue;
  }

  if (item.store === 'AliExpress' && !attemptedAliExpressIds.has(item.id)) {
    // A source run deliberately verifies only a bounded batch. Do not consume
    // a retry for queued items that were merely waiting behind that batch.
    item.reason = 'Pendiente de turno para verificar el producto exacto en AliExpress';
    item.updatedAt = now;
    continue;
  }

  item.attempts = Number(item.attempts || 0) + 1;
  item.updatedAt = now;
  if (item.attempts >= MAX_ATTEMPTS) {
    item.status = 'rejected';
    item.reason = `No se pudo verificar el producto exacto, el precio, la imagen y el enlace afiliado después de ${MAX_ATTEMPTS} intentos`;
  } else {
    item.reason = `Pendiente de reintento (${item.attempts}/${MAX_ATTEMPTS})`;
  }
}

const summary = (queue.items || []).reduce((counts, item) => {
  counts[item.status] = (counts[item.status] || 0) + 1;
  return counts;
}, {});
const report = {
  updatedAt: now,
  summary,
  recent: [...(queue.items || [])].reverse().slice(0, 100).map((item) => ({
    id: item.id,
    source: item.source,
    messageId: item.messageId,
    store: item.store,
    status: item.status,
    attempts: item.attempts,
    reason: item.reason,
    sourceUrl: item.sourceUrl,
    resultUrl: item.resultUrl || '',
  })),
};

writeJson(QUEUE_FILE, queue);
writeJson(REPORT_FILE, report);
console.log(`Telegram source queue: ${JSON.stringify(summary)}.`);
