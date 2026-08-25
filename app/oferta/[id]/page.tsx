import type { Metadata } from "next";
import Link from "next/link";
import AdSlot from "../../components/AdSlot";
import { adsenseOfferSlot } from "../../lib/adsense";
import {
  dealDescription,
  dealDiscount,
  dealHref,
  dealSavings,
  dealSearchTitle,
  getDealById,
  publishedDeals,
} from "../../lib/deals";
import { categorySlugForName } from "../../lib/categories";

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const siteUrl = "https://chollosaldia.com";

function absoluteImageUrl(value: string) {
  try {
    return new URL(value, siteUrl).toString();
  } catch {
    return `${siteUrl}/og-chollosaldia-v2.png`;
  }
}

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
  const productTitle = dealSearchTitle(deal.title);
  const compactTitle = productTitle.length > 68 ? `${productTitle.slice(0, 68).replace(/\s+\S*$/u, "")}…` : productTitle;
  const title = `${compactTitle} en oferta por ${money.format(deal.price)}${discount ? ` · -${discount}%` : ""}`;
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
      images: [{ url: absoluteImageUrl(deal.imageUrl), alt: productTitle }],
    },
    twitter: { card: "summary_large_image", title, description, images: [absoluteImageUrl(deal.imageUrl)] },
  };
}

function schemaFor(deal: NonNullable<ReturnType<typeof getDealById>>) {
  const publicUrl = `${siteUrl}${dealHref(deal.id)}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${publicUrl}#product`,
    url: publicUrl,
    name: dealSearchTitle(deal.title),
    image: [absoluteImageUrl(deal.imageUrl)],
    description: dealDescription(deal),
    category: deal.category,
    offers: {
      "@type": "Offer",
      url: publicUrl,
      priceCurrency: "EUR",
      price: deal.price.toFixed(2),
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: deal.store },
    },
  };
}

function breadcrumbSchemaFor(deal: NonNullable<ReturnType<typeof getDealById>>) {
  const categorySlug = categorySlugForName(deal.category);
  const categoryUrl = categorySlug ? `${siteUrl}/chollos/${categorySlug}/` : siteUrl;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
      { "@type": "ListItem", position: 2, name: deal.category, item: categoryUrl },
      { "@type": "ListItem", position: 3, name: deal.title, item: `${siteUrl}${dealHref(deal.id)}` },
    ],
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
  const productTitle = dealSearchTitle(deal.title);
  const publicOfferUrl = `${siteUrl}${dealHref(deal.id)}`;
  const categorySlug = categorySlugForName(deal.category);
  const categoryHref = categorySlug ? `/chollos/${categorySlug}` : "/#ofertas";
  const shareText = `${productTitle} por ${money.format(deal.price)} en Chollos al Día`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${publicOfferUrl}`)}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(publicOfferUrl)}&text=${encodeURIComponent(shareText)}`;
  const reportUrl = `mailto:chollosaldia@gmail.com?subject=${encodeURIComponent(`Aviso sobre una oferta: ${deal.title}`)}&body=${encodeURIComponent(`Hola, he visto un cambio de precio, stock o cupón en esta oferta:\n\n${publicOfferUrl}\n\nCambio observado:`)}`;
  const relatedDeals = publishedDeals
    .filter((candidate) => candidate.id !== deal.id)
    .sort((left, right) => Number(right.category === deal.category) - Number(left.category === deal.category) || Number(right.store === deal.store) - Number(left.store === deal.store))
    .slice(0, 3);
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
  const breadcrumbsSchema = JSON.stringify(breadcrumbSchemaFor(deal)).replace(/</g, "\\u003c");

  return (
    <main className="offerPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbsSchema }} />
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
        <nav className="offerBreadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>/</span><Link href={categoryHref}>{deal.category}</Link><span>/</span><b>Oferta</b></nav>
        <div className="offerHero">
          <div className="offerGallery"><div className="offerImageWrap"><img src={deal.imageUrl} alt={productTitle} width={960} height={760} /><span className="storeBadge">{deal.store}</span>{discount > 0 && <span className="offerDiscount">−{discount}%</span>}</div><p>Imagen facilitada por la tienda. La variante puede cambiar.</p></div>
          <div className="offerSummary">
            <p className="offerKicker">{deal.category} · Oferta activa</p>
            <h1>{productTitle}</h1>
            <p className="offerLead">{description}</p>
            <div className="offerPriceBox">
              <span>PRECIO DE OFERTA</span>
              <strong>{money.format(deal.price)}</strong>
              {deal.oldPrice > deal.price && <p>Antes <s>{money.format(deal.oldPrice)}</s> <b>−{discount}%</b></p>}
              {savings > 0 && <em>Ahorras {money.format(savings)}</em>}
            </div>
            {deal.coupon && <div className="offerCoupon"><span>CUPÓN</span><b>{deal.coupon}</b><p>Aplica el código en la tienda si sigue disponible.</p></div>}
            <a className="offerCta" href={deal.affiliateUrl} target="_blank" rel="nofollow sponsored noreferrer">Ir a la oferta en {deal.store} <span aria-hidden="true">→</span></a>
            <div className="offerShare"><span>¿Conoces a alguien a quien le interese?</span><div><a href={whatsappShareUrl} target="_blank" rel="noreferrer">Compartir por WhatsApp</a><a href={telegramShareUrl} target="_blank" rel="noreferrer">Enviar por Telegram</a></div></div>
            <p className="offerMeta"><span aria-hidden="true" />{deal.verifiedDate ? <time dateTime={deal.verifiedDate}>{deal.verifiedAt}</time> : deal.verifiedAt} · Precio sujeto a cambios.</p>
            <a className="offerReport" href={reportUrl}>¿Ha cambiado el precio o el stock? Avísanos</a>
          </div>
        </div>

        <section className="offerContent" aria-labelledby="analysis-title">
          <div className="offerIntro"><p className="eyebrow"><span aria-hidden="true" />ANÁLISIS RÁPIDO</p><h2 id="analysis-title">Lo importante de esta oferta</h2><p>{description} Te mostramos los datos que ayudan a decidir rápido, sin añadir características que la tienda no haya confirmado.</p></div>
          <div className="prosCons">
            <section className="pros"><h3><span aria-hidden="true">✓</span> Puntos a favor</h3><ul>{pros.map((item) => <li key={item}>{item}</li>)}</ul></section>
            <section className="cons"><h3><span aria-hidden="true">!</span> A tener en cuenta</h3><ul>{cons.map((item) => <li key={item}>{item}</li>)}</ul></section>
          </div>
        </section>

        <AdSlot slot={adsenseOfferSlot} placement="offer" />

        {relatedDeals.length > 0 && <section className="relatedDeals" aria-labelledby="related-title"><div className="sectionIntro"><div><p className="eyebrow"><span aria-hidden="true" />SIGUE AHORRANDO</p><h2 id="related-title">Otras ofertas que te pueden interesar.</h2></div><p>Selección activa de la misma tienda o categoría.</p></div><div className="dealGrid">{relatedDeals.map((related) => <article className="dealCard" key={related.id}><Link className="imageWrap dealPreviewLink" href={dealHref(related.id)} aria-label={`Ver oferta: ${related.title}`}><img src={related.imageUrl} alt={related.title} width={720} height={560} /><span className="storeBadge">{related.store}</span></Link><div className="dealBody"><p className="categoryLabel">{related.category}</p><h3><Link href={dealHref(related.id)}>{related.title}</Link></h3><div className="priceRow"><strong>{money.format(related.price)}</strong>{related.oldPrice > related.price && <span>Antes <s>{money.format(related.oldPrice)}</s></span>}</div><Link className="dealButton" href={dealHref(related.id)}>Ver oferta <span aria-hidden="true">→</span></Link></div></article>)}</div></section>}

        <section className="offerPurchase" aria-labelledby="purchase-title"><div><p className="eyebrow"><span aria-hidden="true" />¿TE ENCAJA?</p><h2 id="purchase-title">Comprueba el precio final antes de pagar.</h2><p>El enlace te lleva a la tienda. Allí podrás revisar disponibilidad, gastos de envío, variantes y condiciones de compra.</p></div><a className="primaryButton" href={deal.affiliateUrl} target="_blank" rel="nofollow sponsored noreferrer">Ver oferta en {deal.store} <span aria-hidden="true">→</span></a></section>
      </article>
      <footer><div className="shell footnote"><span>© {new Date().getFullYear()} Chollos al Día</span><p><Link href="/contacto">Contacto</Link> · <a href="mailto:chollosaldia@gmail.com">chollosaldia@gmail.com</a></p><p>Algunos enlaces son de afiliación y pueden generar una comisión sin cambiar el precio para ti.</p></div></footer>
    </main>
  );
}
