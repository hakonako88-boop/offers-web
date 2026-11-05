import { couponOptions, isCollectableCoupon } from './coupon-options.mjs';

/** Product-scoped published coupons, not a claim of checkout availability.
 * Unknown validity is explicit. Never infer a discount from digits in a code. */
export function selectFeaturedCoupons(deals, now = Date.now(), maximum = 4) {
  const selected = [], seen = new Set(), stores = new Map();
  for (const deal of [...deals].sort((a,b) => Date.parse(b.verifiedDate || '') - Date.parse(a.verifiedDate || ''))) {
    const date = Date.parse(deal.verifiedDate || '');
    if (!Number.isFinite(date) || date > now || date < now - 72 * 3600000 || !deal.coupon) continue;
    const collectable = isCollectableCoupon(deal.coupon);
    const codes = couponOptions(deal.coupon).codes.filter(code => /^[A-Z0-9_-]{4,30}$/iu.test(code));
    if (!collectable && !codes.length) continue;
    const identity = `${deal.store}:${collectable ? deal.id : codes[0]}`;
    if (seen.has(identity) || (stores.get(deal.store) || 0) >= 2) continue;
    selected.push({ ...deal, displayCoupon: collectable ? deal.coupon : codes[0], collectable });
    seen.add(identity); stores.set(deal.store, (stores.get(deal.store) || 0) + 1);
    if (selected.length >= maximum) break;
  }
  return selected;
}
