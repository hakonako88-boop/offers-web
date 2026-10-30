"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StoreLogo from "../components/StoreLogo";
import { dealHref, type PublishedDeal } from "../lib/deals";
import { campaignStage, selectCampaignDeals } from "../../scripts/black-friday-selection.mjs";

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const stageCopy = {
  preparation: { eyebrow: "EL RADAR SE ESTÁ PREPARANDO", title: "Black Friday, sin ruido.", accent: "Con criterio.", label: "Antes del evento", description: "Comparamos ofertas recientes mientras llega la campaña. Ningún producto de esta selección se presenta como promoción confirmada del Black Friday." },
  "black-friday": { eyebrow: "27–29 NOVIEMBRE · SELECCIÓN DEL DÍA", title: "Black Friday.", accent: "Lo que merece la pena.", label: "Campaña en marcha", description: "El radar prioriza ofertas publicadas recientemente con precio, ahorro y producto identificable. Comprueba siempre las condiciones finales en la tienda." },
  "cyber-monday": { eyebrow: "30 NOVIEMBRE · ÚLTIMO DÍA", title: "Cyber Monday.", accent: "Últimas oportunidades.", label: "Campaña en marcha", description: "Una selección renovada de ofertas recientes para el lunes. Los precios pueden cambiar y los cupones agotarse sin aviso." },
  finished: { eyebrow: "EDICIÓN 2026 FINALIZADA", title: "La campaña terminó.", accent: "El radar sigue.", label: "Campaña finalizada", description: "Black Friday y Cyber Monday ya han pasado. Puedes seguir consultando ofertas recientes, sin confundirlas con promociones de la campaña." },
} as const;

export default function CampaignExperience({ initialDeals }: { initialDeals: PublishedDeal[] }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const stage = campaignStage(now) as keyof typeof stageCopy;
  const copy = stageCopy[stage];
  const offers = useMemo(() => selectCampaignDeals(initialDeals, now), [initialDeals, now]);
  const featured = offers[0];

  return <main className="campaign26">
    <div className="campaign26Top"><div className="shell"><Link href="/">← Chollos al Día</Link><span>EL RADAR DE OFERTAS · EDICIÓN 2026</span><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Alertas en Telegram ↗</a></div></div>
    <div className="shell campaign26Content">
      <nav className="campaign26Crumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>/</span><b>Black Friday y Cyber Monday 2026</b></nav>
      <header className="campaign26Hero">
        <div className="campaign26HeroCopy"><span className="campaign26Kicker"><i aria-hidden="true" />{copy.eyebrow}</span><h1>{copy.title}<br /><em>{copy.accent}</em></h1><p>{copy.description}</p><div className="campaign26HeroActions"><a href="#seleccion">Explorar selección <span aria-hidden="true">↓</span></a><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Recibir avisos ↗</a></div></div>
        <div className="campaign26Board" aria-label="Calendario de la campaña"><span className="campaign26BoardLabel">AGENDA DE OFERTAS</span><div><small>VIERNES 27 NOV</small><b>BLACK<br />FRIDAY</b><span>01 / 02</span></div><div><small>LUNES 30 NOV</small><b>CYBER<br />MONDAY</b><span>02 / 02</span></div><p><span className="campaign26Pulse" />{copy.label} · hora peninsular</p></div>
      </header>
      <div className="campaign26Caveat"><b>Cómo leemos los precios</b><p>El descuento se calcula con el precio anterior publicado, no con un histórico independiente. No afirmamos que sea un mínimo histórico ni que cada oferta pertenezca a la campaña oficial de una tienda.</p></div>
      <section id="seleccion" className="campaign26Selection" aria-labelledby="campaign-title">
        <div className="campaign26SectionHead"><div><span>SELECCIÓN AUTOMÁTICA · ACTUALIZADA CON LAS OFERTAS PUBLICADAS</span><h2 id="campaign-title">{stage === "preparation" ? "Ofertas recientes para comparar" : stage === "finished" ? "Ofertas recientes después de la campaña" : "Lo mejor que detecta el radar"}</h2></div><p>Priorizamos ahorro visible, descuento, actualidad y variedad de tiendas. Cada ficha conserva el enlace y la imagen del producto.</p></div>
        {featured ? <>
          <article className="campaign26Feature"><Link href={dealHref(featured.deal.id)} className="campaign26FeatureImage"><img src={featured.deal.imageUrl} alt={featured.deal.title} width={760} height={600} /></Link><div className="campaign26FeatureBody"><span>01 / DESTACADA EN EL RADAR</span><StoreLogo store={featured.deal.store} /><h3><Link href={dealHref(featured.deal.id)}>{featured.deal.title}</Link></h3><div className="campaign26FeaturePrice"><strong>{money.format(featured.deal.price)}</strong><del>{money.format(featured.deal.oldPrice)}</del></div><p>Ahorras {money.format(featured.saving)} según el precio anterior publicado · −{featured.discount} %</p>{featured.deal.coupon && <p className="campaign26Code">Cupón: <b>{featured.deal.coupon}</b></p>}<Link className="campaign26ProductLink" href={dealHref(featured.deal.id)}>Ver producto y condiciones ↗</Link></div></article>
          <div className="campaign26Grid">{offers.slice(1).map(({ deal, discount, saving }) => <article key={deal.id} className="campaign26Card"><Link href={dealHref(deal.id)} className="campaign26CardImage"><img src={deal.imageUrl} alt={deal.title} width={480} height={360} loading="lazy" /></Link><div className="campaign26CardBody"><div className="campaign26CardMeta"><StoreLogo store={deal.store} /><span>−{discount} %</span></div><h3><Link href={dealHref(deal.id)}>{deal.title}</Link></h3><div className="campaign26CardPrice"><strong>{money.format(deal.price)}</strong><del>{money.format(deal.oldPrice)}</del></div><p>Ahorras {money.format(saving)}{deal.coupon ? ` · cupón ${deal.coupon}` : ""}</p><Link href={dealHref(deal.id)}>Ver ficha <span aria-hidden="true">↗</span></Link></div></article>)}</div>
        </> : <div className="campaign26Empty"><b>El radar está comprobando productos.</b><p>Aún no hay suficientes ofertas recientes con ahorro, foto y enlace verificables para esta selección.</p><Link href="/">Ver todas las ofertas →</Link></div>}
      </section>
      <section className="campaign26Method" aria-labelledby="campaign-method"><div><span>MENOS RUIDO, MEJORES DECISIONES</span><h2 id="campaign-method">Un descuento grande no siempre es un buen chollo.</h2></div><ol><li><b>Producto exacto</b><span>Modelo, variante y tienda identificables.</span></li><li><b>Ahorro visible</b><span>Precio actual, anterior y cupón cuando existe.</span></li><li><b>Variedad</b><span>Evitamos que una sola tienda ocupe toda la portada.</span></li></ol></section>
    </div>
  </main>;
}
