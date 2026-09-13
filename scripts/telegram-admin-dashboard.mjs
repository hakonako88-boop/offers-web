import fs from 'node:fs';
import path from 'node:path';
import { isRecentSourceItem, isSourceItemReady } from './source-retry-policy.mjs';

const STORES = ['Amazon', 'AliExpress', 'Miravia', 'PcComponentes', 'MediaMarkt', 'El Corte Inglés'];

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function madridDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function offerDate(offer) {
  const seconds = Number(offer?.date);
  if (Number.isFinite(seconds) && seconds > 0) return new Date(seconds * 1000);
  return new Date(offer?.publishedAt || offer?.createdAt || '');
}

export function dashboardSnapshot({ offers = [], queue = { items: [] }, report = {}, states = {}, now = new Date() } = {}) {
  const items = Array.isArray(queue?.items) ? queue.items : [];
  const today = madridDay(now);
  const publishedToday = offers.filter((offer) => madridDay(offerDate(offer)) === today);
  const byStore = Object.fromEntries(STORES.map((store) => [store,
    publishedToday.filter((offer) => String(offer.store || '') === store).length]));
  const pending = items.filter((item) => item.status === 'pending');
  const ready = pending.filter((item) => isSourceItemReady(item, now));
  const waiting = pending.filter((item) => !isSourceItemReady(item, now));
  const recentCutoff = now.getTime() - 24 * 60 * 60 * 1000;
  const recentItems = items.filter((item) => {
    const updated = Date.parse(item.updatedAt || item.createdAt || item.publishedAt || '');
    return Number.isFinite(updated) && updated >= recentCutoff;
  });
  const rejectedToday = recentItems.filter((item) => item.status === 'rejected').length;
  const duplicateToday = recentItems.filter((item) => item.status === 'duplicate').length;
  const lastCheckedAt = report.updatedAt || states.lastCheckedAt || '';
  return {
    generatedAt: now.toISOString(), lastCheckedAt,
    publishedToday: publishedToday.length, byStore,
    ready: ready.length, waiting: waiting.length, pending: pending.length,
    rejectedToday, duplicateToday,
    recentErrors: recentItems.filter((item) => item.status === 'rejected').slice(-5).reverse(),
    storeHealth: {
      Amazon: /eligibility requirements/iu.test(String(states.amazon?.lastError || '')) ? 'pendiente de aprobación API' : 'operativa',
      AliExpress: states.aliexpress?.healthy === true ? 'operativa' : 'con incidencias',
      Miravia: states.miravia ? 'operativa' : 'sin datos',
      PcComponentes: states.awin ? 'operativa' : 'sin datos',
      MediaMarkt: states.mediamarkt ? 'operativa' : 'sin datos',
      'El Corte Inglés': states.awin ? 'operativa' : 'sin datos',
    },
  };
}

export function loadDashboardSnapshot(root = process.cwd(), now = new Date()) {
  const data = (name, fallback) => readJson(path.join(root, 'data', name), fallback);
  return dashboardSnapshot({
    offers: data('offers.json', []),
    queue: data('telegram-source-queue.json', { items: [] }),
    report: data('telegram-source-queue-report.json', {}),
    states: {
      lastCheckedAt: data('telegram-channel-checkpoints.json', {}).updatedAt,
      amazon: data('amazon-discovery-state.json', {}),
      aliexpress: data('aliexpress-api-health.json', {}),
      miravia: data('miravia-discovery-state.json', null),
      awin: data('awin-retailers-discovery-state.json', null),
      mediamarkt: data('tradedoubler-mediamarkt-discovery-state.json', null),
    },
    now,
  });
}

function relativeCheck(value, now = new Date()) {
  const timestamp = Date.parse(value || '');
  if (!Number.isFinite(timestamp)) return 'sin información';
  const minutes = Math.max(0, Math.round((now.getTime() - timestamp) / 60_000));
  return minutes < 1 ? 'ahora mismo' : minutes === 1 ? 'hace 1 minuto' : `hace ${minutes} minutos`;
}

export function dashboardKeyboard(snapshot = {}, section = 'home') {
  if (section !== 'home') return { inline_keyboard: [
    [
      { text: '↩️ INICIO', callback_data: 'dashboard:home' },
      { text: '🔄 ACTUALIZAR', callback_data: `dashboard:${section}` },
    ],
    ...(section === 'queue' && Number(snapshot.pending || 0) > 0
      ? [[{ text: '⚡ REVISAR PENDIENTES', callback_data: 'dashboard:retry' }]]
      : []),
  ] };
  return { inline_keyboard: [
    [
      { text: `📥 COLA · ${Number(snapshot.pending || 0)}`, callback_data: 'dashboard:queue' },
      { text: `📊 HOY · ${Number(snapshot.publishedToday || 0)}`, callback_data: 'dashboard:today' },
    ],
    [
      { text: '🏪 TIENDAS', callback_data: 'dashboard:stores' },
      { text: `⚠️ INCIDENCIAS · ${Number(snapshot.rejectedToday || 0)}`, callback_data: 'dashboard:errors' },
    ],
    [{ text: '🔄 ACTUALIZAR PANEL', callback_data: 'dashboard:refresh' }],
    ...(Number(snapshot.pending || 0) > 0
      ? [[{ text: '⚡ REVISAR PENDIENTES', callback_data: 'dashboard:retry' }]]
      : []),
  ] };
}

export function formatDashboard(snapshot, section = 'home', now = new Date()) {
  if (section === 'queue') return [
    '⏳ COLA DE OFERTAS', '',
    `🟢 Preparadas ahora: ${snapshot.ready}`,
    `🕒 Esperando reintento: ${snapshot.waiting}`,
    `📥 Total pendiente: ${snapshot.pending}`,
    `🚫 Rechazadas en 24 h: ${snapshot.rejectedToday}`,
    `♻️ Duplicadas en 24 h: ${snapshot.duplicateToday}`,
  ].join('\n');
  if (section === 'stores') return [
    '🏪 ESTADO DE TIENDAS', '',
    ...STORES.map((store) => `${snapshot.storeHealth[store] === 'operativa' ? '🟢' : snapshot.storeHealth[store].startsWith('pendiente') ? '🟡' : '🟠'} ${store}: ${snapshot.storeHealth[store]}`),
  ].join('\n');
  if (section === 'today') return [
    '📢 PUBLICADAS HOY', '',
    `Total: ${snapshot.publishedToday}`,
    ...STORES.map((store) => `• ${store}: ${snapshot.byStore[store] || 0}`),
  ].join('\n');
  if (section === 'errors') return [
    '⚠️ ÚLTIMOS ERRORES DE FUENTES', '',
    ...(snapshot.recentErrors.length ? snapshot.recentErrors.map((item) =>
      `• ${item.store || 'Tienda'}: ${String(item.reason || 'No se pudo verificar').slice(0, 125)}`) : ['✅ No hay rechazos nuevos en las últimas 24 horas.']),
  ].join('\n');
  return [
    '📊 PANEL DE CHOLLOSALDÍA', '',
    '🟢 Rocky está activo',
    `🕒 Última revisión: ${relativeCheck(snapshot.lastCheckedAt, now)}`,
    `📢 Publicadas hoy: ${snapshot.publishedToday}`,
    `📥 Preparadas ahora: ${snapshot.ready}`,
    `⏳ Esperando reintento: ${snapshot.waiting}`,
    `⚠️ Rechazadas en 24 h: ${snapshot.rejectedToday}`,
    `♻️ Duplicadas en 24 h: ${snapshot.duplicateToday}`,
    '', 'Usa los botones para ver el detalle.',
  ].join('\n');
}

export function releaseRecentPendingOffers(queue, now = new Date(), limit = 20) {
  const candidates = (queue?.items || [])
    .filter((item) => item.status === 'pending' && isRecentSourceItem(item, now))
    .sort((a, b) => Date.parse(b.publishedAt || b.createdAt || '') - Date.parse(a.publishedAt || a.createdAt || ''))
    .slice(0, limit);
  for (const item of candidates) {
    delete item.nextAttemptAt;
    item.reason = 'Reintento solicitado desde el panel privado';
    item.updatedAt = now.toISOString();
  }
  return candidates.length;
}
