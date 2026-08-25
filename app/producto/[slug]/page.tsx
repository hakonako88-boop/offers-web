import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dealHref } from "../../lib/deals";
import { getProductBySlug, productHref, publishedProducts } from "../../lib/products";

const siteUrl = "https://chollosaldia.com";
const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return publishedProducts.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProductBySlug((await params).slug);
  if (!product) return { title: "Producto no encontrado", robots: { index: false, follow: false } };
  const description = product.bestOffer
    ? `Compara el precio de ${product.name}. Mejor oferta activa: ${money.format(product.bestOffer.price)} en ${product.bestOffer.store}.`
    : `Consulta el último precio registrado y ofertas relacionadas de ${product.name}.`;
  return { title: `${product.name}: precio y ofertas`, description, alternates: { canonical: productHref(product) }, robots: { index: Boolean(product.bestOffer), follow: true }, openGraph: { title: `${product.name}: precio y ofertas`, description, url: productHref(product), images: [{ url: product.imageUrl, alt: product.name }] } };
}

export default async function ProductPage({ params }: Props) {
  const product = getProductBySlug((await params).slug);
  if (!product) notFound();
  const schema = { "@context": "https://schema.org", "@graph": [{ "@type": "Product", "@id": `${siteUrl}${productHref(product)}#product`, name: product.name, image: [product.imageUrl], category: product.category, offers: product.activeOffers.map((offer) => ({ "@type": "Offer", price: offer.price, priceCurrency: "EUR", availability: "https://schema.org/InStock", url: offer.affiliateUrl, seller: { "@type": "Organization", name: offer.store } })) }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl }, { "@type": "ListItem", position: 2, name: product.category, item: `${siteUrl}/#ofertas` }, { "@type": "ListItem", position: 3, name: product.name, item: `${siteUrl}${productHref(product)}` }] }] };
  return <main className="productPage"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</gu, "\\u003c") }} />
    <header className="productHeader"><Link className="brand" href="/"><span className="brandMark">€</span><span>Chollos <span>al</span>Día</span></Link><Link href="/#ofertas">Ofertas de hoy</Link></header>
    <article className="productShell">
      <nav className="offerBreadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>/</span><Link href="/#ofertas">{product.category}</Link><span>/</span><b>{product.name}</b></nav>
      <section className="productHero"><div className="productImage"><img src={product.imageUrl} alt={product.name} width={900} height={700} /></div><div><p className="eyebrow"><span />PRODUCTO · {product.category}</p><h1>{product.name}</h1>{product.subcategory && <p className="productSubcategory">{product.subcategory}</p>}{product.bestOffer ? <><p className="productBestLabel">Mejor precio activo</p><strong className="productBestPrice">{money.format(product.bestOffer.price)}</strong><p>Disponible en {product.bestOffer.store}. Comprueba el precio, la variante y el envío antes de pagar.</p><a className="productCta" href={product.bestOffer.affiliateUrl} target="_blank" rel="sponsored nofollow noopener noreferrer">Ver mejor oferta ↗</a></> : <div className="expiredNotice"><b>Ahora mismo no hay una oferta activa.</b><p>Conservamos esta página para comparar el último precio registrado y mostrar nuevas ofertas cuando aparezcan.</p></div>}</div></section>
      <section className="productSection"><p className="eyebrow"><span />COMPARA TIENDAS</p><h2>Ofertas actuales</h2>{product.activeOffers.length ? <div className="productOfferList">{product.activeOffers.map((offer, index) => <article key={offer.id}><div><span>{index === 0 ? "Mejor precio" : "Otra tienda"}</span><h3>{offer.store}</h3><p>Comprobado: {offer.verifiedAt}{offer.coupon ? ` · Cupón ${offer.coupon}` : ""}</p></div><strong>{money.format(offer.price)}</strong><Link href={dealHref(offer.id)}>Ver análisis</Link><a href={offer.affiliateUrl} target="_blank" rel="sponsored nofollow noopener noreferrer">Ir a la tienda ↗</a></article>)}</div> : <p className="productEmpty">Estamos buscando nuevas ofertas activas de este producto.</p>}</section>
      <section className="productSection"><p className="eyebrow"><span />HISTÓRICO REAL</p><h2>Evolución del precio</h2>{product.historyReady ? <div className="productStats"><div><span>Mínimo registrado</span><strong>{money.format(product.minimumPrice!)}</strong></div><div><span>Precio medio</span><strong>{money.format(product.averagePrice!)}</strong></div><div><span>Máximo registrado</span><strong>{money.format(product.maximumPrice!)}</strong></div><div><span>Comprobaciones</span><strong>{product.history.length}</strong></div></div> : <div className="priceHistoryEmpty"><b>Estamos empezando a registrar el historial de este producto.</b><p>Mostraremos mínimo, media, máximo y gráfica cuando existan al menos tres comprobaciones reales en fechas diferentes. No completamos períodos con precios estimados.</p></div>}</section>
      <aside className="productTransparency"><b>Transparencia</b><p>Algunos enlaces son de afiliación y pueden generar una comisión sin cambiar el precio para ti. “Mejor precio” compara únicamente las ofertas activas que hemos podido verificar; no significa mejor producto ni mínimo histórico.</p></aside>
    </article>
  </main>;
}
