import observations from '../../data/tesla-price-observations.json';
export const TESLA_SEO_UPDATED = '2026-11-06T00:00:00Z';
export function teslaLastModified() {
  const now = Date.now();
  const checked = [...observations.items, ...observations.discoveries].map(row => Date.parse(row.checkedAt)).filter(date => Number.isFinite(date) && date <= now);
  return new Date(Math.max(Date.parse(TESLA_SEO_UPDATED), ...checked));
}
