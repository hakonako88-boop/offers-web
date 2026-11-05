import { freshTeslaPrice, teslaCoupon } from './tesla-pricing.mjs';
import { lowRiskTeslaAccessory, teslaEditorialCategory } from './tesla-discovery.mjs';

// Product-level observations are not a SKU/checkout history. Never turn them
// into a claimed saving or a cheapest-on-the-market assertion.
export function appendTeslaHistory(previous = {}, rows = []) {
  const history = structuredClone(previous);
  for (const row of rows) {
    if (row.store !== 'AliExpress' || !freshTeslaPrice(row, Date.parse(row.checkedAt))) continue;
    const points = history[row.productId] || [];
    if (!points.some(point => point.checkedAt === row.checkedAt)) points.push({ checkedAt: row.checkedAt, price: row.listedPrice, currency: 'EUR', basis: row.priceBasis });
    history[row.productId] = points.sort((a,b) => Date.parse(a.checkedAt) - Date.parse(b.checkedAt)).slice(-120);
  }
  return history;
}
export function observedTeslaTrend(row, history = {}, now = Date.now()) {
  if (!freshTeslaPrice(row, now)) return null;
  const previous = (history[row.productId] || []).filter(point => point.currency === 'EUR' && point.basis === row.priceBasis && point.price > 0 && Date.parse(point.checkedAt) < Date.parse(row.checkedAt) && Date.parse(point.checkedAt) >= now - 30 * 86400000);
  if (!previous.length) return null;
  const last = previous.at(-1);
  return { lowerAdvertisedPrice: row.listedPrice < last.price, minimumObserved: Math.min(row.listedPrice, ...previous.map(point => point.price)), observations: previous.length + 1 };
}
export function selectTeslaDaily(rows, history = {}, now = Date.now(), limit = 4) {
  const unique = new Map();
  for (const row of rows) {
    if (row.store !== 'AliExpress' || !freshTeslaPrice(row, now) || !lowRiskTeslaAccessory(row.name)) continue;
    try { const url = new URL(row.originalUrl || row.generatedAffiliateUrl); if (url.protocol !== 'https:' || !/(^|\.)aliexpress\.com$/i.test(url.hostname) || !/^https:\/\//i.test(row.imageUrl)) continue; } catch { continue; }
    const old = unique.get(row.productId);
    if (!old || Date.parse(row.checkedAt) > Date.parse(old.checkedAt)) unique.set(row.productId, row);
  }
  const ranked = [...unique.values()].map(row => ({ ...row, category: teslaEditorialCategory(row.name), trend: observedTeslaTrend(row, history, now), activeCoupon: teslaCoupon(row, now) })).sort((a,b) => Number(Boolean(b.trend?.lowerAdvertisedPrice)) - Number(Boolean(a.trend?.lowerAdvertisedPrice)) || Number(Boolean(b.activeCoupon)) - Number(Boolean(a.activeCoupon)) || Date.parse(b.checkedAt) - Date.parse(a.checkedAt) || a.productId.localeCompare(b.productId));
  const selected = []; const categories = new Set();
  for (const row of ranked) if (!categories.has(row.category) && selected.length < limit) { selected.push(row); categories.add(row.category); }
  for (const row of ranked) if (selected.length < limit && !selected.some(item => item.productId === row.productId)) selected.push(row);
  return selected;
}
