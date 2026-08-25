import type { Metadata } from "next";
import Link from "next/link";
import CouponCopy from "../../components/CouponCopy";
import { notFound } from "next/navigation";
import { categoryDeals, categoryIsIndexable, categoryPages, getCategoryPage } from "../../lib/categories";
import { dealDiscount, dealHref, dealSavings, publishedDeals } from "../../lib/deals";

const siteUrl = "https://chollosaldia.com";
const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
type CategoryPageProps = { params: Promise<{ categoria: string }> };

function absoluteImageUrl(value: string) {
  try { return new URL(value, siteUrl).toString(); } catch { return `${siteUrl}/og-chollosaldia-v2.png`; }
}

export function generateStaticParams() {
  return Object.keys(categoryPages).map((categoria) => ({ categoria }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { categoria } = await params;
  const category = getCategoryPage(categoria);
  if (!category) return { title: "Pagina no encontrada", robots: { index: false, follow: false } };
  const deals = categoryDeals(categoria, publishedDeals);
  const path = `/chollos/${categoria}/`;
  return {
    title: category.seoTitle,
    description: category.description,
    alternates: { canonical: path },
    robots: categoryIsIndexable(categoria, publishedDeals) ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { title: `${category.seoTitle} | Chollos al Dia`, description: category.description, url: path, images: [{ url: "/og-chollosaldia-v2.png", width: 1731, height: 909, alt: category.shortName }] },
    twitter: { card: "summary_large_image", title: category.seoTitle, description: category.description, images: ["/og-chollosaldia-v2.png"] },
    other: deals.length ? {} : { "x-chollos-status": "sin-ofertas-activas" },
  };
}

export default async function CategoryOffersPage({ params }: CategoryPageProps) {
  const { categoria } = await params;
  const category = getCategoryPage(categoria);
  if (!category) notFound();
  const deals = categoryDeals(categoria, publishedDeals);
  const displayedDeals = deals.slice(0, 60);
  const averageDiscount = deals.length ? Math.round(deals.reduce((total, deal) => total + dealDiscount(deal), 0) / deals.length) : 0;
  const indexable = categoryIsIndexable(categoria, publishedDeals);
  const relatedGuide = categoria === "tecnologia"
    ? { href: "/guias/chollos-electronica/", label: "Leer la guía para comparar ofertas de electrónica" }
    : categoria === "cocina"
      ? { href: "/guias/ofertas-cocina/", label: "Leer la guía para elegir ofertas de cocina" }
      : null;
  const schema = {
    "@context": "https://schema.org", "@graph": [{
      "@type": "CollectionPage", "@id": `${siteUrl}/chollos/${categoria}/`,
      name: category.seoTitle, description: category.description, inLanguage: "es-ES", isPartOf: { "@id": `${siteUrl}/#website` },
      mainEntity: { "@type": "ItemList", numberOfItems: displayedDeals.length, itemListElement: displayedDeals.map((deal, index) => ({ "@type": "ListItem", position: index + 1, url: `${siteUrl}${dealHref(deal.id)}`, name: deal.title, image: absoluteImageUrl(deal.imageUrl) })) },
    }, {
      "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
        { "@type": "ListItem", position: 2, name: category.shortName, item: `${siteUrl}/chollos/${categoria}/` },
      ],
    }],
  };

  return <main className="categoryPage">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <div className="announcement"><div className="shell announcementInner"><span><b>Seleccion actualizada</b> · precios y enlaces revisados al publicar</span><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Alertas en Telegram ↗</a></div></div>
    <header className="siteHeader"><div className="shell headerInner"><Link className="brand" href="/" aria-label="Chollos al Dia, inicio"><span className="brandMark" aria-hidden="true">€</span><span>Chollos <span>al</span>Dia</span></Link><nav aria-label="Navegacion principal"><Link href="/#ofertas">Ofertas de hoy</Link><a className="telegramLink" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Telegram ↗</a></nav></div></header>
    <article className="storeArticle shell">
      <nav className="offerBreadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>/</span><b>{category.shortName}</b></nav>
      <header className="storeHero categoryHero"><div><p className="eyebrow"><span aria-hidden="true" />{category.eyebrow}</p><h1>{category.title}</h1><p>{category.description}</p></div><aside><strong>{deals.length}</strong><span>ofertas activas</span><b>{averageDiscount ? `-${averageDiscount}%` : "Precio"}</b><small>{averageDiscount ? "descuento medio" : "registrado al publicar"}</small></aside></header>
      <section className="categoryContext" aria-labelledby="category-context-title"><div><p className="eyebrow"><span aria-hidden="true" />SELECCIÓN EXPLICADA</p><h2 id="category-context-title">Ofertas de {category.shortName.toLowerCase()} con datos que puedes comprobar.</h2><p>{category.searchIntro}</p></div><aside><strong>Antes de comprar</strong><ul>{category.checks.map((check) => <li key={check}>{check}</li>)}</ul></aside></section>
      <section className="storeDeals" aria-labelledby="category-deals-title"><div className="sectionIntro"><div><p className="eyebrow"><span aria-hidden="true" />OFERTAS ACTIVAS</p><h2 id="category-deals-title">Chollos de {category.shortName.toLowerCase()} de hoy</h2></div><p>Las ofertas se retiran de la selección cuando caducan o dejan de cumplir el filtro de calidad.</p></div>{deals.length ? <div className="dealGrid storeDealGrid">{displayedDeals.map((deal) => {
        const discount = dealDiscount(deal); const savings = dealSavings(deal);
        return <article className="dealCard" key={deal.id}><Link className="imageWrap dealPreviewLink" href={dealHref(deal.id)} aria-label={`Ver oferta: ${deal.title}`}><img src={deal.imageUrl} alt={deal.title} width={720} height={560} />{discount > 0 && <span className="discountBadge">-{discount}%</span>}<span className="storeBadge">{deal.store}</span></Link><div className="dealBody"><p className="categoryLabel">{deal.category}</p><h3><Link href={dealHref(deal.id)}>{deal.title}</Link></h3><div className="priceRow"><strong>{money.format(deal.price)}</strong>{discount > 0 && <span>Antes <s>{money.format(deal.oldPrice)}</s></span>}</div>{savings > 0 && <p className="saving">Ahorras {money.format(savings)}</p>}{deal.coupon ? <CouponCopy code={deal.coupon} compact /> : <p className="noCoupon">Precio directo, sin cupon extra</p>}<Link className="dealButton" href={dealHref(deal.id)}>Ver oferta y analisis <span aria-hidden="true">→</span></Link></div></article>;
      })}</div> : <div className="empty"><b>No hay ahora mismo chollos activos de {category.shortName.toLowerCase()} que pasen el filtro.</b><span>Preferimos no rellenar esta pagina con productos que no aporten valor.</span><Link href="/#ofertas">Ver todas las ofertas</Link></div>}</section>
      <section className="storeAdvice"><div><p className="eyebrow"><span aria-hidden="true" />COMPRA CON CRITERIO</p><h2>Lo que debes comprobar.</h2></div><p>{category.guidance} {indexable ? "Esta pagina se actualiza con ofertas que tienen un ahorro demostrable." : "La pagina se activara para Google cuando haya una seleccion suficiente de ofertas validas."}{relatedGuide && <Link className="categoryGuideLink" href={relatedGuide.href}>{relatedGuide.label}<span aria-hidden="true">→</span></Link>}</p></section>
    </article>
    <footer><div className="shell footnote"><span>© {new Date().getFullYear()} Chollos al Dia</span><p>Algunos enlaces son de afiliacion y pueden generar una comision sin cambiar el precio para ti.</p></div></footer>
  </main>;
}
