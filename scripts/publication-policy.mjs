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

function firstPublicationMinute(weekend) {
  return weekend ? 600 : 480;
}

export function publicationWindow({ now = new Date() } = {}) {
  const local = madridParts(now);
  const weekend = ['Sat', 'Sun', 'sáb', 'dom'].includes(local.weekday);
  const globalLimit = cumulativeLimit(local.minuteOfDay, weekend);
  return {
    allowed: globalLimit > 0,
    reason: globalLimit > 0 ? 'publication-window-open' : 'quiet-hours',
    local,
    globalLimit,
  };
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
  const { local, globalLimit } = publicationWindow({ now });
  if (!globalLimit) return { allowed: false, remaining: 0, reason: 'quiet-hours', local };
  const weekend = ['Sat', 'Sun', 'sáb', 'dom'].includes(local.weekday);

  const today = offers.filter((offer) => {
    const stamp = Number(offer.date) > 10_000_000_000 ? Number(offer.date) : Number(offer.date) * 1000;
    return Number.isFinite(stamp) && madridParts(new Date(stamp)).date === local.date;
  });
  // Manual verification runs may be explicitly published overnight. They are
  // real posts and still count towards the retailer's daily cap, but they must
  // not consume the first daytime marketing slot. Otherwise a midnight test
  // can silently block the 08:00/10:00 automatic publication window.
  const scheduledToday = today.filter((offer) => {
    const stamp = Number(offer.date) > 10_000_000_000 ? Number(offer.date) : Number(offer.date) * 1000;
    const offerLocal = madridParts(new Date(stamp));
    return offerLocal.minuteOfDay >= firstPublicationMinute(weekend) && offerLocal.minuteOfDay < 1380;
  });
  const storeName = normalizedStore(store);
  const storeCount = today.filter((offer) => normalizedStore(offer.store) === storeName).length;
  const storeLimit = STORE_DAILY_LIMITS[storeName] || 1;
  // A direct/manual ingestion path can occasionally add many posts from one
  // retailer before the scheduled discovery jobs run. Count at most each
  // retailer's editorial quota towards the shared slot. This keeps a burst of
  // Amazon inbox messages from starving MediaMarkt, AliExpress or Miravia for
  // the rest of the day, while the retailer-specific cap below still prevents
  // an automatic source from flooding the channel.
  const scheduledByStore = new Map();
  for (const offer of scheduledToday) {
    const scheduledStore = normalizedStore(offer.store);
    scheduledByStore.set(scheduledStore, (scheduledByStore.get(scheduledStore) || 0) + 1);
  }
  const editorialPublishedToday = [...scheduledByStore.entries()].reduce((total, [scheduledStore, count]) => {
    const editorialCap = STORE_DAILY_LIMITS[scheduledStore] || 1;
    return total + Math.min(count, editorialCap);
  }, 0);
  const remaining = Math.max(0, Math.min(globalLimit - editorialPublishedToday, storeLimit - storeCount));
  return {
    allowed: remaining > 0,
    remaining,
    reason: remaining > 0 ? 'slot-available' : (storeCount >= storeLimit ? 'store-daily-limit' : 'time-slot-full'),
    local,
    globalLimit,
    publishedToday: editorialPublishedToday,
    rawPublishedToday: scheduledToday.length,
    storeCount,
    storeLimit,
  };
}

export function scheduleBypassEnabled() {
  return String(process.env.BYPASS_PUBLICATION_SCHEDULE || '').toLowerCase() === 'true';
}
