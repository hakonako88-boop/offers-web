const TIME_ZONE = 'Europe/Madrid';

export const STORE_DAILY_LIMITS = Object.freeze({
  Amazon: 6,
  AliExpress: 4,
  Miravia: 2,
  MediaMarkt: 2,
  PcComponentes: 2,
  'El Corte Inglés': 2,
  Xiaomi: 1,
});

function madridParts(now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).reduce((all, part) => ({ ...all, [part.type]: part.value }), {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
    minuteOfDay: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function cumulativeLimit(minuteOfDay, weekend) {
  const slots = weekend
    ? [[600, 2], [780, 4], [1080, 6], [1230, 9], [1350, 11]]
    : [[480, 2], [630, 4], [810, 6], [990, 7], [1110, 10], [1230, 14], [1350, 16]];
  let limit = 0;
  for (const [start, maximum] of slots) if (minuteOfDay >= start) limit = maximum;
  return minuteOfDay >= 1380 ? 0 : limit;
}

function normalizedStore(value = '') {
  const store = String(value).trim().toLowerCase();
  if (store.includes('amazon')) return 'Amazon';
  if (store.includes('aliexpress')) return 'AliExpress';
  if (store.includes('miravia')) return 'Miravia';
  if (store.includes('media') && store.includes('markt')) return 'MediaMarkt';
  if (store.includes('pccomponentes')) return 'PcComponentes';
  if (store.includes('corte ingl')) return 'El Corte Inglés';
  if (store.includes('xiaomi')) return 'Xiaomi';
  return String(value).trim() || 'Otra';
}

export function publicationAllowance({ store, offers = [], now = new Date(), bypass = false }) {
  if (bypass) return { allowed: true, remaining: 3, reason: 'manual-bypass' };
  const local = madridParts(now);
  const weekend = ['Sat', 'Sun', 'sáb', 'dom'].includes(local.weekday);
  const globalLimit = cumulativeLimit(local.minuteOfDay, weekend);
  if (!globalLimit) return { allowed: false, remaining: 0, reason: 'quiet-hours', local };

  const today = offers.filter((offer) => {
    const stamp = Number(offer.date) > 10_000_000_000 ? Number(offer.date) : Number(offer.date) * 1000;
    return Number.isFinite(stamp) && madridParts(new Date(stamp)).date === local.date;
  });
  const storeName = normalizedStore(store);
  const storeCount = today.filter((offer) => normalizedStore(offer.store) === storeName).length;
  const storeLimit = STORE_DAILY_LIMITS[storeName] || 1;
  const remaining = Math.max(0, Math.min(globalLimit - today.length, storeLimit - storeCount));
  return {
    allowed: remaining > 0,
    remaining,
    reason: remaining > 0 ? 'slot-available' : (storeCount >= storeLimit ? 'store-daily-limit' : 'time-slot-full'),
    local,
    globalLimit,
    publishedToday: today.length,
    storeCount,
    storeLimit,
  };
}

export function scheduleBypassEnabled() {
  return String(process.env.BYPASS_PUBLICATION_SCHEDULE || '').toLowerCase() === 'true';
}
