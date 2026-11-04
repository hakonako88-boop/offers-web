import { offerQuality } from './offer-quality-score.mjs';
import { couponOptions } from './coupon-options.mjs';

const euro = new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR' });
export function editorialReason(offer) {
  const quality = offerQuality(offer);
  if (quality.saving >= .5) return `Ahorras ${euro.format(quality.saving)} frente al precio anterior publicado.`;
  if (couponOptions(offer.coupon).codes.length) return 'Incluye un código de descuento: confirma su aplicación en la cesta.';
  return 'Precio publicado para comparar; todavía no hay ahorro comprobable.';
}

/** Uses published inventory only. No invented reference prices or historic lows. */
export function selectFeaturedOffers(deals, now = new Date(), maximum = 4) {
  const ranked = deals.filter(d => d.active && Date.parse(d.verifiedDate || '') <= now.getTime()
    && Date.parse(d.verifiedDate || '') >= now.getTime() - 48 * 3600000)
    .map(deal => ({deal, quality:offerQuality({...deal, image:deal.imageUrl, url:deal.affiliateUrl, date:Date.parse(deal.verifiedDate)/1000})}))
    .filter(item => item.quality.publishable)
    .sort((a,b) => b.quality.score-a.quality.score || Date.parse(b.deal.verifiedDate)-Date.parse(a.deal.verifiedDate));
  const selected = [], identities = new Set(), stores = new Map(), categories = new Map();
  for (const {deal} of ranked) {
    const identity = deal.sourceProductId || deal.id;
    if (identities.has(identity) || (stores.get(deal.store)||0)>=2 || (categories.get(deal.category)||0)>=2) continue;
    selected.push({...deal, editorialReason:editorialReason(deal)});
    identities.add(identity); stores.set(deal.store,(stores.get(deal.store)||0)+1); categories.set(deal.category,(categories.get(deal.category)||0)+1);
    if (selected.length >= Math.min(5,Math.max(1,maximum))) break;
  }
  return selected;
}
