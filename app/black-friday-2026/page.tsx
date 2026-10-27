import type { Metadata } from "next";
import Link from "next/link";
import { dealDiscount, dealHref, publishedDeals } from "../lib/deals";

const title = "Black Friday 2026: ofertas verificadas y cupones";
const description = "Black Friday 2026 en España: viernes 27 de noviembre. Consulta ofertas recientes por tienda, cupones comprobados y consejos para comparar el precio final. Cyber Monday: 30 de noviembre.";
const url = "https://chollosaldia.com/black-friday-2026/";
const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/black-friday-2026/" },
  openGraph: { title: `${title} | Chollos al Día`, description, url, images: ["/og-chollosaldia-v3.png"] },
};

const offers = publishedDeals
  .filter((deal) => deal.price > 0 && (deal.oldPrice > deal.price || deal.coupon))
  .sort((a, b) => Date.parse(b.verifiedDate || "") - Date.parse(a.verifiedDate || ""))
  .slice(0, 12);

const schema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": url,
  name: title,
  description,
  inLanguage: "es-ES",
  isPartOf: { "@id": "https://chollosaldia.com/#website" },
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: offers.length,
    itemListElement: offers.map((deal, index) => ({ "@type": "ListItem", position: index + 1, name: deal.title, url: `https://chollosaldia.com${dealHref(deal.id)}` })),
  },
};

export default function BlackFriday2026() {
  return <main className="blackFridayPage">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <div className="announcement"><div className="shell announcementInner"><Link href="/">← Chollos al Día</Link><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Alertas en Telegram ↗</a></div></div>
    <div className="shell blackFridayContent">
      <nav className="blackFridayBreadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>/</span><b>Black Friday 2026</b></nav>
      <header className="blackFridayHero">
        <p>GUÍA DE COMPRA · NOVIEMBRE 2026</p>
        <h1>Black Friday <em>2026</em></h1>
        <span>Viernes 27 de noviembre · Cyber Monday, lunes 30</span>
        <p>Preparamos una selección de ofertas reales de Amazon, AliExpress, MediaMarkt, PcComponentes y otras tiendas. No llamamos «chollo» a un porcentaje sin comprobar el producto y el precio final.</p>
        <div><a href="#ofertas">Explorar ofertas recientes ↓</a><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Recibir alertas ↗</a></div>
      </header>
      <section className="blackFridayNote"><b>Importante</b><p>Las ofertas mostradas antes del 27 de noviembre son ofertas recientes, no promociones confirmadas del Black Friday. Cada tienda puede comenzar o terminar su campaña en otra fecha. Comprueba precio, cupón, vendedor y stock antes de comprar.</p></section>
      <section id="ofertas" className="blackFridayOffers">
        <div className="blackFridaySectionTitle"><div><p>SELECCIÓN CON PRECIO VISIBLE</p><h2>Ofertas recientes para comparar</h2></div><Link href="/">Ver todas las ofertas →</Link></div>
        {offers.length ? <div className="blackFridayGrid">{offers.map((deal) => <article key={deal.id}>
          <Link href={dealHref(deal.id)} className="blackFridayImage"><img src={deal.imageUrl} alt={deal.title} width={520} height={390} loading="lazy" /></Link>
          <div className="blackFridayCardBody"><small>{deal.store} · {deal.category}</small><h3><Link href={dealHref(deal.id)}>{deal.title}</Link></h3><p><strong>{money.format(deal.price)}</strong>{deal.oldPrice > deal.price && <del>{money.format(deal.oldPrice)}</del>}{dealDiscount(deal) > 0 && <span>−{dealDiscount(deal)} %</span>}</p>{deal.coupon && <b className="blackFridayCoupon">Cupón: {deal.coupon}</b>}<Link className="blackFridayCardLink" href={dealHref(deal.id)}>Ver precio y condiciones ↗</Link></div>
        </article>)}</div> : <p>No hay ofertas completas para mostrar ahora. Vuelve más tarde.</p>}
      </section>
      <section className="blackFridayAdvice"><h2>Cómo distinguir un descuento real</h2><ol><li><b>Comprueba el modelo exacto:</b> capacidad, tamaño, versión y vendedor.</li><li><b>Revisa el precio final:</b> algunos cupones solo se aplican en el carrito o tienen compra mínima.</li><li><b>No confundas precio tachado con mínimo histórico:</b> un precio anterior indicado por la tienda no demuestra por sí solo que sea la mejor rebaja.</li><li><b>Actúa con calma:</b> si faltan datos fiables, espera a que se puedan verificar.</li></ol></section>
    </div>
  </main>;
}
