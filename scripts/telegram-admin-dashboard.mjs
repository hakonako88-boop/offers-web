import fs from 'node:fs';
import path from 'node:path';
import { isRecentSourceItem, isSourceItemReady } from './source-retry-policy.mjs';
import { offerQuality } from './offer-quality-score.mjs';
import { publicationAllowance, publicationReasonLabel } from './publication-policy.mjs';

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

export function queueIssueLabel(item={}) {
  const reason=String(item.reason || '');
  if(item.status==='duplicate') return 'Producto ya publicado';
  if(/producto exacto/iu.test(reason) && /precio/iu.test(reason) && /imagen/iu.test(reason)) return 'Verificación incompleta de producto, precio, foto o afiliación';
  if(/afiliad|affiliate|tracking/iu.test(reason)) return 'Enlace de afiliación no verificado';
  if(/asin|producto exacto|product.id/iu.test(reason)) return 'Producto exacto pendiente de verificar';
  if(/precio|price/iu.test(reason)) return 'Precio pendiente de verificar';
  if(/foto|imagen|image/iu.test(reason)) return 'Foto pendiente de verificar';
  if(/ahorro|editorial|selecci[oó]n/iu.test(reason)) return 'Filtro de calidad o ahorro';
  if(/reintento|intentos|verificar/iu.test(reason)) return 'Verificación fallida o en reintento';
  return 'Necesita revisión de datos';
}

function retailerHealth(state,now) {
  if(!state) return 'sin datos';
  if(state.lastError || state.healthy===false) return 'con incidencias';
  const checked=Date.parse(state.checkedAt || state.lastRunAt || state.updatedAt || '');
  if(Number.isFinite(checked) && now.getTime()-checked>2*60*60*1000) return 'sin comprobación reciente';
  return Number.isFinite(checked) || state.healthy===true ? 'operativa' : 'sin datos';
}

export function dashboardSnapshot({ offers = [], queue = { items: [] }, report = {}, states = {}, now = new Date() } = {}) {
  const items = Array.isArray(queue?.items) ? queue.items : [];
  const today = madridDay(now);
  const publishedToday = offers.filter((offer) => madridDay(offerDate(offer)) === today);
  const quality = publishedToday.map((offer) => offerQuality(offer));
  const byStore = Object.fromEntries(STORES.map((store) => [store,
    publishedToday.filter((offer) => String(offer.store || '') === store).length]));
  const pending = items.filter((item) => item.status === 'pending');
  const currentPending=pending.filter(item=>isRecentSourceItem(item,now));
  const stalePending=pending.length-currentPending.length;
  const policyCache=new Map();
  const policyFor=(store,source='')=>{
    const key=`${store}|${source==='nolodejesescapar'?'nolo':'ordinary'}`;
    if(!policyCache.has(key)) policyCache.set(key,publicationAllowance({store,source,offers,now}));
    return policyCache.get(key);
  };
  const due = currentPending.filter(item=>isSourceItemReady(item,now));
  const ready = due.filter(item=>policyFor(item.store,item.source).allowed);
  const blocked = due.filter(item=>!policyFor(item.store,item.source).allowed);
  const waiting = currentPending.filter((item) => !isSourceItemReady(item, now));
  const blockedCounts=new Map();
  for(const item of blocked){const reason=publicationReasonLabel(policyFor(item.store,item.source));blockedCounts.set(reason,(blockedCounts.get(reason)||0)+1);}
  const reviewItems=items.filter(item=>item.status==='needs_review');
  const reviewCounts=new Map();
  for(const item of reviewItems){const reason=queueIssueLabel(item);reviewCounts.set(reason,(reviewCounts.get(reason)||0)+1);}
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
    blocked:blocked.length,stalePending,needsReview:reviewItems.length,
    blockedReasons:[...blockedCounts].map(([reason,count])=>({reason,count})),
    reviewReasons:[...reviewCounts].sort((a,b)=>b[1]-a[1]).map(([reason,count])=>({reason,count})),
    publicationByStore:Object.fromEntries(STORES.map(store=>{
      const policy=policyFor(store);
      return [store,{...policy,label:publicationReasonLabel(policy)}];
    })),
    rejectedToday, duplicateToday,
    recentErrors: recentItems.filter((item) => item.status === 'rejected').slice(-5).reverse(),
    quality: {
      excellent: quality.filter((item) => item.score >= 75).length,
      good: quality.filter((item) => item.score >= 60 && item.score < 75).length,
      review: quality.filter((item) => item.score >= 45 && item.score < 60).length,
      weak: quality.filter((item) => item.score < 45).length,
      average: quality.length ? Math.round(quality.reduce((total, item) => total + item.score, 0) / quality.length) : 0,
    },
    analytics: {
      connected: Boolean(states.analytics?.connected || states.analytics?.updatedAt),
      activeUsers: Number(states.analytics?.activeUsers) || 0,
      users7d: Number(states.analytics?.users7d) || 0,
      sessions7d: Number(states.analytics?.sessions7d) || 0,
      pageViews7d: Number(states.analytics?.pageViews7d) || 0,
      updatedAt: String(states.analytics?.updatedAt || ''),
      topPages: Array.isArray(states.analytics?.topPages) ? states.analytics.topPages.slice(0, 3) : [],
      trafficSources: Array.isArray(states.analytics?.trafficSources) ? states.analytics.trafficSources.slice(0, 3) : [],
    },
    storeHealth: {
      Amazon: /eligibility requirements/iu.test(String(states.amazon?.lastError || '')) ? 'pendiente de aprobación API' : retailerHealth(states.amazon,now),
      AliExpress: retailerHealth(states.aliexpress,now),
      Miravia: retailerHealth(states.miravia,now),
      PcComponentes: retailerHealth(states.awin,now),
      MediaMarkt: retailerHealth(states.mediamarkt,now),
      'El Corte Inglés': retailerHealth(states.awin,now),
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
      analytics: data('web-analytics.json', null),
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
    [{ text: '⭐ CALIDAD', callback_data: 'dashboard:quality' }, { text: '🌐 USUARIOS WEB', callback_data: 'dashboard:web' }],
    [{ text: '🔄 ACTUALIZAR PANEL', callback_data: 'dashboard:refresh' }],
    ...(Number(snapshot.pending || 0) > 0
      ? [[{ text: '⚡ REVISAR PENDIENTES', callback_data: 'dashboard:retry' }]]
      : []),
    [{text:'🔗 TELEGRAM ↔ WEB',callback_data:'dashboard:sync'}],
  ] };
}

export function formatDashboard(snapshot, section = 'home', now = new Date()) {
  if(section==='sync') {
    const audit=snapshot.publicationAudit;
    if(!audit)return '🔗 TELEGRAM ↔ WEB\n\nComprobación todavía no realizada.';
    return ['🔗 TELEGRAM ↔ WEB','',
      `Comprobadas: ${audit.items.length} · Coinciden: ${audit.confirmed}`,
      `Revisión: ${relativeCheck(audit.checkedAt,now)}`,
      ...(audit.items.length?audit.items.flatMap(item=>['',`• ${String(item.title).slice(0,78)}`,`Telegram: ${item.telegram.label}`,`Web: ${item.web.label}`,item.url]):['No hay publicaciones con datos suficientes para comprobar.']),
      '', 'Compara lo publicado con el registro guardado, no con el precio actual de la tienda.',
      'Solo lectura: no reenvía ofertas ni modifica publicaciones.',
    ].join('\n');
  }
  if (section === 'queue') return [
    '⏳ COLA DE OFERTAS', '',
    `🔎 Con turno para verificar: ${snapshot.ready}`,
    `🕒 Esperando reintento: ${snapshot.waiting}`,
    `🚦 Frenadas por horario o cuota: ${snapshot.blocked || 0}`,
    `📅 Fuera del plazo de reintento: ${snapshot.stalePending || 0}`,
    `📥 Total pendiente: ${snapshot.pending}`,
    '', 'MOTIVOS DE ESPERA',
    ...(snapshot.blockedReasons?.length ? snapshot.blockedReasons.map(item=>`• ${item.reason}: ${item.count}`) : ['• Sin bloqueos de horario o cuota.']),
    '', `📝 Necesitan revisión: ${snapshot.needsReview || 0}`,
    ...(snapshot.reviewReasons || []).slice(0,5).map(item=>`• ${item.reason}: ${item.count}`),
    '', 'Tener turno no significa que el producto, precio o afiliación estén verificados.',
    `🚫 Rechazadas en 24 h: ${snapshot.rejectedToday}`,
    `♻️ Duplicadas en 24 h: ${snapshot.duplicateToday}`,
  ].join('\n');
  if (section === 'stores') return [
    '🏪 ESTADO DE TIENDAS', '',
    ...STORES.map((store) => {
      const policy=snapshot.publicationByStore?.[store];
      return `${snapshot.storeHealth[store] === 'operativa' ? '🟢' : snapshot.storeHealth[store].startsWith('pendiente') ? '🟡' : '🟠'} ${store}: ${snapshot.storeHealth[store]}${policy?`\n   ${policy.label}${Number.isFinite(policy.storeLimit)?` · ${policy.storeCount}/${policy.storeLimit}`:''}`:''}`;
    }),
    '', 'Cuotas ordinarias. NoLoDejesEscapar mantiene su política sin límite diario.',
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
  if (section === 'quality') return [
    '⭐ CALIDAD DE LAS OFERTAS DE HOY', '',
    `🏆 Excelentes (75–100): ${snapshot.quality.excellent}`,
    `✅ Buenas (60–74): ${snapshot.quality.good}`,
    `🟡 Para revisar (45–59): ${snapshot.quality.review}`,
    `🔴 Flojas (0–44): ${snapshot.quality.weak}`,
    '', `Puntuación media: ${snapshot.quality.average}/100`,
    'La puntuación valora ahorro, descuento, utilidad, cupón, datos completos y actualidad.',
  ].join('\n');
  if (section === 'web') return snapshot.analytics.connected ? [
    '🌐 AUDIENCIA DE LA WEB', '',
    `🟢 Usuarios activos ahora: ${snapshot.analytics.activeUsers}`,
    `👥 Usuarios últimos 7 días: ${snapshot.analytics.users7d}`,
    `🔁 Sesiones últimos 7 días: ${snapshot.analytics.sessions7d}`,
    `👁 Visitas a páginas últimos 7 días: ${snapshot.analytics.pageViews7d}`,
    ...(snapshot.analytics.topPages.length ? ['', '📈 Páginas más vistas:', ...snapshot.analytics.topPages.map((page) => `• ${String(page.title || page.path).slice(0, 55)}: ${Number(page.views) || 0}`)] : []),
    ...(snapshot.analytics.trafficSources.length ? ['', '🧭 Origen de las sesiones:', ...snapshot.analytics.trafficSources.map((source) => `• ${String(source.source).slice(0, 35)}: ${Number(source.sessions) || 0}`)] : []),
    '', `Actualizado: ${relativeCheck(snapshot.analytics.updatedAt, now)}`,
  ].join('\n') : [
    '🌐 AUDIENCIA DE LA WEB', '',
    '🟡 Google Analytics está instalado en la web, pero falta autorizar la lectura privada de sus informes.',
    'No mostraré cifras inventadas. Cuando se conecte GA4, aquí aparecerán usuarios activos, usuarios, sesiones y visitas.',
  ].join('\n');
  return [
    '📊 PANEL DE CHOLLOSALDÍA', '',
    '📊 PANEL PRIVADO DE ROCKY',
    `🕒 Última revisión: ${relativeCheck(snapshot.lastCheckedAt, now)}`,
    `📢 Publicadas hoy: ${snapshot.publishedToday}`,
    `🔎 Con turno para verificar: ${snapshot.ready}`,
    `⏳ Esperando reintento: ${snapshot.waiting}`,
    `🚦 Bloqueadas por horario o cuota: ${snapshot.blocked || 0}`,
    `📝 Necesitan revisión: ${snapshot.needsReview || 0}`,
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
