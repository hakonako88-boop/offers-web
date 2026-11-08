export function periodTopOffers(deals, days, now = Date.now(), limit = 3) {
  const seen = new Set();
  return deals.filter(deal => {
    const date = Date.parse(deal.verifiedDate || '');
    return deal.active && deal.price > 0 && deal.imageUrl && Number.isFinite(date) && date <= now && now-date <= days*86400000;
  }).map(deal => {
    const reduction = deal.oldPrice > deal.price ? Math.min(60,100*(deal.oldPrice-deal.price)/deal.oldPrice) : 0;
    return { ...deal, topScore: reduction + (deal.coupon ? 5 : 0) };
  }).sort((a,b) => b.topScore-a.topScore || Date.parse(b.verifiedDate)-Date.parse(a.verifiedDate)).filter(deal => {
    const key=deal.sourceProductId || deal.id;
    if(seen.has(key)) return false; seen.add(key); return true;
  }).slice(0,limit);
}
