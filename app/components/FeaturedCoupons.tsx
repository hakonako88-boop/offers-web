"use client";
import { useEffect, useState } from 'react';
import type { Deal } from './DealExplorer';
import CouponCopy from './CouponCopy';
import StoreLogo from './StoreLogo';
import { offerDisplayTitle } from '../lib/display-title';
import { selectFeaturedCoupons } from '../../scripts/featured-coupons.mjs';

export default function FeaturedCoupons({ deals }: { deals: Deal[] }) {
  const [now, setNow] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    setNow(Date.now());
    const media = window.matchMedia('(min-width: 801px)');
    const updateLayout = () => setExpanded(media.matches);
    updateLayout();
    media.addEventListener('change', updateLayout);
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => { window.clearInterval(timer); media.removeEventListener('change', updateLayout); };
  }, []);
  const coupons = now === null ? [] : selectFeaturedCoupons(deals, now, 4);
  return <section className="homeCoupons shell" id="cupones-destacados" aria-labelledby="featured-coupons-title">
    <details open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}><summary><h2 id="featured-coupons-title">🎟 Cupones en ofertas recientes</h2><span>{expanded ? 'Ocultar cupones −' : 'Ver cupones y condiciones +'}</span></summary>
      <p className="homeCouponsNotice">Códigos publicados para productos concretos. No garantizamos disponibilidad: confirma mínimo, elegibilidad y descuento en la cesta.</p>
      <div className="homeCouponGrid">{coupons.map(deal => <article key={deal.id}>
        <StoreLogo store={deal.store}/><h3><a href={`/oferta/${encodeURIComponent(deal.id)}/`}>{offerDisplayTitle(deal.title)}</a></h3>
        <CouponCopy code={deal.displayCoupon} compact />
        <a className="couponConditionsLink" href={`/oferta/${encodeURIComponent(deal.id)}/`}>Ver producto y condiciones →</a>
      </article>)}</div>
      {now !== null && coupons.length === 0 && <p>No hay cupones suficientemente recientes para destacar. Consulta las condiciones de cada oferta.</p>}
      {now === null && <p>Comprobando las fechas de los cupones publicados…</p>}
    </details>
  </section>;
}
