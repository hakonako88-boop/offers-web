import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide, guides } from "../../lib/guides";
import { dealDiscount, dealHref, dealSavings, publishedDeals } from "../../lib/deals";
import { getProductForDeal, productHref } from "../../lib/products";

const siteUrl = "https://chollosaldia.com";
const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
type GuidePageProps = { params: Promise<{ guia: string }> };

export function generateStaticParams() { return Object.keys(guides).map((guia) => ({ guia })); }

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { guia } = await params;
  const guide = getGuide(guia);
  if (!guide) return { title: "Guia no encontrada", robots: { index: false, follow: false } };
  const path = `/guias/${guia}/`;
  return { title: guide.seoTitle, description: guide.description, alternates: { canonical: path }, openGraph: { title: `${guide.seoTitle} | Chollos al Dia`, description: guide.description, url: path, images: [{ url: "/og-chollosaldia-v2.png", width: 1731, height: 909, alt: guide.title }] }, twitter: { card: "summary_large_image", title: guide.seoTitle, description: guide.description, images: ["/og-chollosaldia-v2.png"] } };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { guia } = await params;
  const guide = getGuide(guia);
  if (!guide) notFound();
  const deals = publishedDeals.filter(guide.matches).slice(0, 3);
  const articleSchema = { "@context": "https://schema.org", "@type": "Article", headline: guide.title, description: guide.description, inLanguage: "es-ES", datePublished: "2026-08-12", dateModified: "2026-08-25", mainEntityOfPage: `${siteUrl}/guias/${guia}/`, author: { "@type": "Organization", name: "Chollos al Dia" }, publisher: { "@type": "Organization", name: "Chollos al Dia", url: siteUrl } };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: guide.faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };
  return <main className="guidePage">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c") }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
    <div className="announcement"><div className="shell announcementInner"><span><b>Guia para comprar mejor</b> · informacion clara antes de decidir</span><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Alertas en Telegram ↗</a></div></div>
    <header className="siteHeader"><div className="shell headerInner"><Link className="brand" href="/" aria-label="Chollos al Dia, inicio"><span className="brandMark" aria-hidden="true">€</span><span>Chollos <span>al</span>Dia</span></Link><nav aria-label="Navegacion principal"><Link href="/#ofertas">Ofertas de hoy</Link><a className="telegramLink" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Telegram ↗</a></nav></div></header>
    <article className="guideArticle shell">
      <nav className="offerBreadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>/</span><b>Guias</b><span>/</span><b>{guide.title}</b></nav>
      <header className="guideHero"><p className="eyebrow"><span aria-hidden="true" />{guide.eyebrow}</p><h1>{guide.title}</h1><p>{guide.intro}</p><div><span>Lectura: 3 min</span><span>Actualizada hoy</span><span>Por Chollos al Dia</span></div></header>
      <div className="guideBody"><aside className="guideChecklist"><p>LISTA RAPIDA</p><h2>Antes de comprar</h2><ul>{guide.checklist.map((item) => <li key={item}>{item}</li>)}</ul></aside><div className="guideCopy">{guide.sections.map((section, index) => <section key={section.title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{section.title}</h2><p>{section.body}</p></section>)}</div></div>
      <nav className="guideRelated" aria-label="Ofertas relacionadas"><span>Ahora puedes aplicar esta guía</span><Link href={guide.relatedHref}>{guide.relatedLabel}<b aria-hidden="true">→</b></Link></nav>
      {deals.length > 0 && <section className="guideDeals" aria-labelledby="guide-deals-title"><div className="sectionIntro"><div><p className="eyebrow"><span aria-hidden="true" />SELECCION ACTUAL</p><h2 id="guide-deals-title">Ofertas para aplicar esta guia.</h2></div><p>Precios actuales obtenidos de las ofertas publicadas. Comprueba siempre la ficha final de la tienda.</p></div><div className="dealGrid storeDealGrid">{deals.map((deal) => { const discount = dealDiscount(deal); const savings = dealSavings(deal); const product = getProductForDeal(deal); const destination = product ? productHref(product) : dealHref(deal.id); return <article className="dealCard" key={deal.id}><Link className="imageWrap dealPreviewLink" href={destination} aria-label={`Comparar producto: ${deal.title}`}><img src={deal.imageUrl} alt={deal.title} width={720} height={560} />{discount > 0 && <span className="discountBadge">-{discount}%</span>}<span className="storeBadge">{deal.store}</span></Link><div className="dealBody"><p className="categoryLabel">{deal.category}</p><h3><Link href={destination}>{deal.title}</Link></h3><div className="priceRow"><strong>{money.format(deal.price)}</strong>{discount > 0 && <span>Antes <s>{money.format(deal.oldPrice)}</s></span>}</div>{savings > 0 && <p className="saving">Ahorras {money.format(savings)}</p>}<Link className="dealButton" href={destination}>{product ? "Comparar precios" : "Ver oferta y analisis"} <span aria-hidden="true">→</span></Link></div></article>; })}</div></section>}
      <section className="guideFaq" aria-labelledby="guide-faq-title"><p className="eyebrow"><span aria-hidden="true" />DUDAS HABITUALES</p><h2 id="guide-faq-title">Preguntas frecuentes</h2>{guide.faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</section>
      <section className="guideCta"><div><p className="eyebrow"><span aria-hidden="true" />CHOLLOS AL DIA</p><h2>Recibe las ofertas cuando aun estan activas.</h2><p>La web te ayuda a comparar. El canal de Telegram te avisa cuando aparece una oportunidad nueva.</p></div><a className="primaryButton" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Unirme a Telegram <span aria-hidden="true">↗</span></a></section>
    </article>
    <footer><div className="shell footnote"><span>© {new Date().getFullYear()} Chollos al Dia</span><p>Algunos enlaces son de afiliacion y pueden generar una comision sin cambiar el precio para ti.</p></div></footer>
  </main>;
}
