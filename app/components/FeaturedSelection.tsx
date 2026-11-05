import { selectFeaturedOffers } from '../../scripts/editorial-selection.mjs';
import { publishedDeals, dealHref, type PublishedDeal } from '../lib/deals';
import { offerDisplayTitle } from '../lib/display-title';
import StoreLogo from './StoreLogo';
import { couponOptions, isCollectableCoupon } from '../../scripts/coupon-options.mjs';
import ResponsiveHighlights from './ResponsiveHighlights';
import OfferFreshness from './OfferFreshness';

export default function FeaturedSelection() {
  const deals = selectFeaturedOffers(publishedDeals);
  if (!deals.length) return null;
  const money = new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'});
  return <section className="featuredSelection" aria-labelledby="featured-selection-title">
    <div className="featuredSelectionHeading"><div><span>SELECCIÓN EDITORIAL · OFERTAS RECIENTES</span><h2 id="featured-selection-title">Chollos destacados</h2><p>Una selección breve entre las ofertas recientes. Elige un producto para ver sus condiciones.</p></div><a className="featuredSelectionAll" href="#ofertas">Ver todas las ofertas <span aria-hidden="true">↓</span></a></div>
    <ResponsiveHighlights total={deals.length}>{deals.map((deal: PublishedDeal & {editorialReason:string}, index:number) => <article key={deal.id}>
      <a className="featuredSelectionImage" href={dealHref(deal.id)} tabIndex={-1} aria-hidden="true"><img src={deal.imageUrl} alt="" width={420} height={320} loading={index === 0 ? 'eager' : 'lazy'} /></a>
      <div className="featuredSelectionBody"><StoreLogo store={deal.store}/><h3><a href={dealHref(deal.id)}>{offerDisplayTitle(deal.title)}</a></h3>
      <div className="featuredSelectionPrice"><strong>{money.format(deal.price)}</strong>{deal.oldPrice>deal.price && <s aria-label={`Precio anterior publicado: ${money.format(deal.oldPrice)}`}>{money.format(deal.oldPrice)}</s>}</div>
      <span className="featuredSelectionCondition" data-conditional={Boolean(deal.coupon || deal.priceCondition)}>{deal.priceCondition ? 'Precio condicionado · consulta la ficha' : isCollectableCoupon(deal.coupon) ? 'Recoge el cupón en la ficha' : couponOptions(deal.coupon).codes.length > 0 ? 'Con cupón · consulta condiciones' : 'Sin código de cupón registrado'}</span>
      <p className="featuredPublished"><OfferFreshness date={deal.verifiedDate} fallback={deal.verifiedAt} /></p>
      <p>{deal.editorialReason}</p><a className="featuredSelectionLink" href={dealHref(deal.id)} aria-label={`Ver oferta: ${offerDisplayTitle(deal.title)}`}>Ver oferta <span aria-hidden="true">→</span></a></div>
    </article>)}</ResponsiveHighlights>
    <p className="featuredSelectionNote">Precios publicados en las últimas 48 horas. Confirma variante, cupón y total en la tienda.</p>
  </section>;
}
