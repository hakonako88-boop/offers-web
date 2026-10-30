const DAY_MS = 24 * 60 * 60 * 1000;

export function campaignStage(now = new Date()) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  if (date < '2026-11-27') return 'preparation';
  if (date < '2026-11-30') return 'black-friday';
  if (date === '2026-11-30') return 'cyber-monday';
  return 'finished';
}

/** Rank only already-published, identifiable products; never infer campaign participation. */
export function selectCampaignDeals(deals, now = new Date(), limit = 12) {
  const stage = campaignStage(now);
  const live = stage === 'black-friday' || stage === 'cyber-monday';
  const cutoffDays = live ? 5 : 14;
  const candidateCutoff = now.getTime() - cutoffDays * DAY_MS;
  const scored = deals.flatMap((deal) => {
    const verifiedAt = Date.parse(deal.verifiedDate || '');
    const saving = Math.max(0, Number(deal.oldPrice) - Number(deal.price));
    const discount = Number(deal.oldPrice) > Number(deal.price)
      ? Math.round(100 * saving / Number(deal.oldPrice)) : 0;
    if (!deal.active || !Number.isFinite(verifiedAt) || verifiedAt < candidateCutoff
      || verifiedAt > now.getTime() + DAY_MS || !Number.isFinite(Number(deal.price))
      || Number(deal.price) <= 0 || !deal.imageUrl || !deal.affiliateUrl
      || !deal.title || deal.title.length < 9 || /^(?:otros(?:\s*\/\s*sin clasificar)?|sin clasificar)$/iu.test(deal.category || '')) return [];
    if (discount < 12 && !(deal.coupon && saving >= 3)) return [];
    if (saving < 5 && !deal.coupon) return [];
    const ageDays = Math.max(0, (now.getTime() - verifiedAt) / DAY_MS);
    const score = Math.min(36, discount * .65)
      + Math.min(30, saving * .45)
      + (deal.coupon ? 9 : 0)
      + Math.max(0, 25 - ageDays * 5)
      + Math.min(8, Number(deal.categoryConfidence || 0) * 8);
    return [{ deal, score, verifiedAt, discount, saving }];
  }).sort((a, b) => b.score - a.score || b.verifiedAt - a.verifiedAt);

  const storeCounts = new Map();
  const categoryCounts = new Map();
  const selected = [];
  for (const item of scored) {
    const store = item.deal.store;
    const category = item.deal.category;
    if ((storeCounts.get(store) || 0) >= 4 || (categoryCounts.get(category) || 0) >= 4) continue;
    selected.push(item);
    storeCounts.set(store, (storeCounts.get(store) || 0) + 1);
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    if (selected.length >= limit) break;
  }
  return selected;
}
