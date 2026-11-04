import { selectFeaturedOffers } from '../../scripts/editorial-selection.mjs';
import { publishedDeals, dealHref, type PublishedDeal } from '../lib/deals';
import { offerDisplayTitle } from '../lib/display-title';
import StoreLogo from './StoreLogo';
import CouponCopy from './CouponCopy';
import { couponOptions } from '../../scripts/coupon-options.mjs';

export default function FeaturedSelection() {
  const deals = selectFeaturedOffers(publishedDeals);
  if (!deals.length) return null;
  const money = new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'});
  return <section className="featuredSelection" aria-labelledby="featured-selection-title">
    <div className="featuredSelectionHeading"><div><span>DESTACADOS · ÚLTIMAS 48 HORAS</span><h2 id="featured-selection-title">La selección de hoy</h2></div><p>Ofertas recientes con un motivo para destacar. El ahorro se compara con el precio anterior publicado.</p></div>
    <div className="featuredSelectionGrid">{deals.map((deal: PublishedDeal & {editorialReason:string}, index:number) => <article key={deal.id}>
      <a className="featuredSelectionImage" href={dealHref(deal.id)}><span>0{index+1}</span><img src={deal.imageUrl} alt={deal.title} width={420} height={320} loading={index === 0 ? 'eager' : 'lazy'} /></a>
      <div className="featuredSelectionBody"><StoreLogo store={deal.store}/><h3><a href={dealHref(deal.id)}>{offerDisplayTitle(deal.title)}</a></h3>
      <div className="featuredSelectionPrice"><strong>{money.format(deal.price)}</strong>{deal.oldPrice>deal.price && <s>{money.format(deal.oldPrice)}</s>}</div>
      <p><b>Por qué entra</b>{deal.editorialReason}</p>{couponOptions(deal.coupon).codes.length > 0 && <CouponCopy code={couponOptions(deal.coupon).codes[0]} compact/>}<a className="featuredSelectionLink" href={dealHref(deal.id)}>Ver producto y condiciones <span aria-hidden="true">↗</span></a></div>
    </article>)}</div>
    <a className="featuredSelectionAll" href="#ofertas">Prefiero ver todas las ofertas ↓</a>
  </section>;
}
