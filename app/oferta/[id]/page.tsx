import type { Metadata } from "next";
import Link from "next/link";
import {
  dealDescription,
  dealDiscount,
  dealHref,
  dealSavings,
  getDealById,
  publishedDeals,
} from "../../lib/deals";

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

type OfferPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return publishedDeals.map((deal) => ({ id: deal.id }));
}

export async function generateMetadata({ params }: OfferPageProps): Promise<Metadata> {
  const { id } = await params;
  const deal = getDealById(id);
  if (!deal) return { title: "Oferta no encontrada", robots: { index: false, follow: false } };

  const discount = dealDiscount(deal);
  const title = `${deal.title} por ${money.format(deal.price)}${discount ? ` (${discount}% dto.)` : ""}`.slice(0, 105);
  const description = dealDescription(deal);
  const path = dealHref(deal.id);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | Chollos al Día`,
      description,
      url: path,
      images: [{ url: deal.imageUrl, alt: deal.title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [deal.imageUrl] },
  };
}

function schemaFor(deal: NonNullable<ReturnType<typeof getDealById>>) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: deal.title,
    image: [`https://chollosaldia.com${deal.imageUrl}`],
    description: dealDescription(deal),
    category: deal.category,
    offers: {
      "@type": "Offer",
      url: deal.affiliateUrl,
      priceCurrency: "EUR",
      price: deal.price.toFixed(2),
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: deal.store },
    },
  };
}

export default async function OfferPage({ params }: OfferPageProps) {
  const { id } = await params;
  const deal = getDealById(id);
  if (!deal) {
    return <main className="offerNotFound shell"><Link href="/">← Volver a las ofertas</Link><h1>Esta oferta ya no está disponible</h1><p>Puede haber caducado o haberse retirado de la selección.</p></main>;
  }

  const discount = dealDiscount(deal);
  const savings = dealSavings(deal);
  const description = dealDescription(deal);
  const pros = [
    discount > 0 ? `Descuento visible del ${discount}% frente al precio anterior.` : "Precio localizado y enlazado directamente a la tienda.",
    savings > 0 ? `Ahorro estimado de ${money.format(savings)}.` : "Compra directa sin pasos intermedios.",
    deal.coupon ? `Incluye el cupón ${deal.coupon} indicado en la publicación.` : `Enlace directo y atribuido a ${deal.store}.`,
  ];
  const cons = [
    "El precio, el stock y las condiciones de envío pueden cambiar.",
    "Comprueba las características exactas y la variante elegida antes de pagar.",
    "La valoración se basa en el precio publicado; no sustituye la ficha del vendedor.",
  ];
  const productSchema = JSON.stringify(schemaFor(deal)).replace(/</g, "\\u003c");

  return (
    <main className="offerPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productSchema }} />
      <div className="announcement">
        <div className="shell announcementInner"><span><b>Oferta analizada</b> · precio y enlace revisados al publicarla</span><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Alertas en Telegram ↗</a></div>
      </div>
      <header className="siteHeader">
        <div className="shell headerInner">
          <Link className="brand" href="/" aria-label="Chollos al Día, inicio"><span className="brandMark" aria-hidden="true">€</span><span>Chollos <span>al</span>Día</span></Link>
          <nav aria-label="Navegación principal"><Link href="/">Ofertas de hoy</Link><a className="telegramLink" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Telegram ↗</a></nav>
        </div>
      </header>

      <article className="offerArticle shell">
        <nav className="offerBreadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>/</span><Link href={`/?categoria=${encodeURIComponent(deal.category)}`}>{deal.category}</Link><span>/</span><b>Oferta</b></nav>
        <div className="offerHero">
          <div className="offerGallery"><div className="offerImageWrap"><img src={deal.imageUrl} alt={deal.title} width={960} height={760} /><span className="storeBadge">{deal.store}</span>{discount > 0 && <span className="offerDiscount">−{discount}%</span>}</div><p>Imagen facilitada por la tienda. La variante puede cambiar.</p></div>
          <div className="offerSummary">
            <p className="offerKicker">{deal.category} · Oferta activa</p>
            <h1>{deal.title}</h1>
            <p className="offerLead">{description}</p>
            <div className="offerPriceBox">
              <span>PRECIO DE OFERTA</span>
              <strong>{money.format(deal.price)}</strong>
              {deal.oldPrice > deal.price && <p>Antes <s>{money.format(deal.oldPrice)}</s> <b>−{discount}%</b></p>}
              {savings > 0 && <em>Ahorras {money.format(savings)}</em>}
            </div>
            {deal.coupon && <div className="offerCoupon"><span>CUPÓN</span><b>{deal.coupon}</b><p>Aplica el código en la tienda si sigue disponible.</p></div>}
            <a className="offerCta" href={deal.affiliateUrl} target="_blank" rel="nofollow sponsored noreferrer">Ir a la oferta en {deal.store} <span aria-hidden="true">→</span></a>
            <p className="offerMeta"><span aria-hidden="true" />{deal.verifiedDate ? <time dateTime={deal.verifiedDate}>{deal.verifiedAt}</time> : deal.verifiedAt} · Precio sujeto a cambios.</p>
          </div>
        </div>

        <section className="offerContent" aria-labelledby="analysis-title">
          <div className="offerIntro"><p className="eyebrow"><span aria-hidden="true" />ANÁLISIS RÁPIDO</p><h2 id="analysis-title">Lo importante de esta oferta</h2><p>{description} Te mostramos los datos que ayudan a decidir rápido, sin añadir características que la tienda no haya confirmado.</p></div>
          <div className="prosCons">
            <section className="pros"><h3><span aria-hidden="true">✓</span> Puntos a favor</h3><ul>{pros.map((item) => <li key={item}>{item}</li>)}</ul></section>
            <section className="cons"><h3><span aria-hidden="true">!</span> A tener en cuenta</h3><ul>{cons.map((item) => <li key={item}>{item}</li>)}</ul></section>
          </div>
        </section>

        <section className="offerPurchase" aria-labelledby="purchase-title"><div><p className="eyebrow"><span aria-hidden="true" />¿TE ENCAJA?</p><h2 id="purchase-title">Comprueba el precio final antes de pagar.</h2><p>El enlace te lleva a la tienda. Allí podrás revisar disponibilidad, gastos de envío, variantes y condiciones de compra.</p></div><a className="primaryButton" href={deal.affiliateUrl} target="_blank" rel="nofollow sponsored noreferrer">Ver oferta en {deal.store} <span aria-hidden="true">→</span></a></section>
      </article>
      <footer><div className="shell footnote"><span>© {new Date().getFullYear()} Chollos al Día</span><p>Algunos enlaces son de afiliación y pueden generar una comisión sin cambiar el precio para ti.</p></div></footer>
    </main>
  );
}
