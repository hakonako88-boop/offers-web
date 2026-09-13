import { automaticInterest } from './editorial-interest.mjs';

function money(value = '') {
  const raw = String(value).replace(/\s|\u00a0/gu, '').replace(/[^0-9,.-]/gu, '');
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  return Number(comma > dot ? raw.replaceAll('.', '').replace(',', '.') : raw.replaceAll(',', '')) || 0;
}

export function offerQuality(offer = {}) {
  const price = money(offer.price ?? offer.priceLabel ?? offer.currentPrice);
  const previous = money(offer.previousPrice ?? offer.oldPrice ?? offer.previousPriceLabel);
  const saving = previous > price ? previous - price : 0;
  const discount = saving ? Math.round((saving / previous) * 100) : 0;
  const title = String(offer.title || '').trim();
  const image = String(offer.image || offer.imageUrl || '').trim();
  const url = String(offer.url || offer.affiliateUrl || '').trim();
  const coupon = String(offer.coupon || '').trim();
  const interest = automaticInterest({ ...offer, price, oldPrice: previous }, { requireDealEvidence: true });
  const breakdown = {
    saving: Math.min(25, Math.round(Math.min(saving, 100) / 4)),
    discount: Math.min(20, Math.round(Math.min(discount, 50) / 2.5)),
    interest: Math.max(0, Math.min(20, interest * 6)),
    completeness: (title.length >= 8 ? 5 : 0) + (image ? 5 : 0) + (/^https?:\/\//iu.test(url) ? 5 : 0),
    coupon: coupon ? 10 : 0,
    freshness: Number(offer.date) * 1000 >= Date.now() - 3 * 86400000 ? 10 : 4,
  };
  let score = Object.values(breakdown).reduce((total, value) => total + value, 0);
  const suspiciousReference = price >= 250 && previous > price * 2 && !coupon;
  if (interest < 0 || !price || !title || !image || !/^https?:\/\//iu.test(url)) score = Math.min(score, 39);
  if (suspiciousReference) score = Math.min(score, 49);
  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score, breakdown, discount, saving,
    level: score >= 75 ? 'excelente' : score >= 60 ? 'buena' : score >= 45 ? 'revisar' : 'descartar',
    publishable: score >= 60 && !suspiciousReference && interest >= 0,
  };
}
