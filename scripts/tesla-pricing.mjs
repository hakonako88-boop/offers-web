export const TESLA_PRICE_MAX_AGE = 24 * 60 * 60 * 1000;
export function freshTeslaPrice(observation, now = Date.now()) {
  const checked = Date.parse(observation?.checkedAt || '');
  return Boolean(observation && Number.isFinite(observation.listedPrice) && observation.listedPrice > 0
    && observation.currency === 'EUR' && Number.isFinite(checked) && checked <= now && now - checked <= TESLA_PRICE_MAX_AGE);
}
export function teslaCoupon(observation, now = Date.now()) {
  if (!freshTeslaPrice(observation, now)) return null;
  const raw = observation.coupon;
  if (!raw || typeof raw !== 'object' || !/^[A-Z0-9_-]{3,40}$/i.test(raw.promo_code || '')) return null;
  // The affiliate API omits the timezone. Keep a conservative 14h boundary
  // rather than asserting availability around the start/end of a promotion.
  const start = Date.parse(String(raw.code_availabletime_start || '').replace(' ', 'T') + 'Z');
  const end = Date.parse(String(raw.code_availabletime_end || '').replace(' ', 'T') + 'Z');
  if (!Number.isFinite(start) || !Number.isFinite(end) || now < start + 14 * 3600000 || now > end - 14 * 3600000) return null;
  const amount = Number(String(raw.code_value || '').match(/get EUR\s*([\d.]+)\s*off/i)?.[1]);
  const minimum = Number(raw.code_mini_spend);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(minimum) || minimum < 0) return null;
  return { code: raw.promo_code, amount, minimum, end: raw.code_availabletime_end, requiresCheckout: true };
}
