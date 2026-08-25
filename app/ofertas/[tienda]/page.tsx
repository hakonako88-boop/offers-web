import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dealDiscount, dealHref, dealSavings, publishedDeals } from "../../lib/deals";

const siteUrl = "https://chollosaldia.com";
const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const stores = {
  amazon: {
    name: "Amazon",
    label: "Ofertas Amazon",
    eyebrow: "SELECCION AMAZON",
    title: "Ofertas de Amazon con ahorro visible.",
    description: "Ofertas de Amazon seleccionadas por Chollos al Dia: precio actual, precio anterior cuando esta disponible y enlace directo a la tienda.",
    guidance: "Compara siempre la variante, el envio y el precio final dentro de Amazon antes de completar la compra.",
  },
  aliexpress: {
    name: "AliExpress",
    label: "Ofertas AliExpress",
    eyebrow: "SELECCION ALIEXPRESS",
    title: "Chollos de AliExpress con precio y cupon claros.",
    description: "Chollos de AliExpress con descuento comprobable, precio publicado y cupon cuando figura en la oferta. Accede directamente a la tienda.",
    guidance: "En AliExpress, revisa el cupon, la variante, el envio y la fecha estimada de entrega antes de pagar.",
  },
  miravia: {
    name: "Miravia",
    label: "Ofertas Miravia",
    eyebrow: "SELECCION MIRAVIA",
    title: "Ofertas de Miravia seleccionadas para ahorrar.",
    description: "Ofertas de Miravia con precio registrado y ahorro visible. Solo incluimos productos con una ficha y un enlace de compra identificables.",
    guidance: "Comprueba el vendedor, las condiciones de envio y los cupones activos de Miravia antes de finalizar el pedido.",
  },
  xiaomi: {
    name: "Xiaomi",
    label: "Ofertas Xiaomi",
    eyebrow: "SELECCION XIAOMI",
    title: "Ofertas oficiales de Xiaomi con descuento real.",
    description: "Móviles, wearables y productos Xiaomi seleccionados desde el catálogo oficial, con precio anterior y enlace de afiliación comprobado.",
    guidance: "Comprueba la configuración, el color, el almacenamiento, el envío y la garantía indicados por Xiaomi antes de comprar.",
  },
  pccomponentes: {
    name: "PcComponentes",
    label: "Ofertas PcComponentes",
    eyebrow: "SELECCION PCCOMPONENTES",
    title: "Chollos de PcComponentes para renovar tu tecnología.",
    description: "Ofertas de PcComponentes filtradas por ahorro real en informática, gaming, móviles y electrónica de consumo.",
    guidance: "Revisa si el producto lo vende directamente PcComponentes, su estado, el plazo de entrega y las condiciones de devolución.",
  },
  "el-corte-ingles": {
    name: "El Corte Inglés",
    label: "Ofertas El Corte Inglés",
    eyebrow: "SELECCION EL CORTE INGLES",
    title: "Ofertas seleccionadas de El Corte Inglés.",
    description: "Descuentos de El Corte Inglés con precio anterior comprobable en tecnología, hogar, belleza, moda y otras categorías útiles.",
    guidance: "Comprueba la talla o variante, el vendedor, la entrega y si la promoción exige alguna condición adicional.",
  },
  mediamarkt: {
    name: "MediaMarkt",
    label: "Ofertas MediaMarkt",
    eyebrow: "SELECCION MEDIAMARKT",
    title: "Chollos de MediaMarkt en tecnología y hogar.",
    description: "Ofertas de MediaMarkt filtradas por ahorro real en móviles, informática, televisores, gaming y electrodomésticos.",
    guidance: "Comprueba la disponibilidad, la modalidad de entrega o recogida, la variante y el vendedor antes de finalizar la compra.",
  },
} as const;

type StoreSlug = keyof typeof stores;
type StorePageProps = { params: Promise<{ tienda: string }> };

function getStore(slug: string) {
  return stores[slug as StoreSlug];
}

function absoluteImageUrl(value: string) {
  try {
    return new URL(value, siteUrl).toString();
  } catch {
    return `${siteUrl}/og-chollosaldia-v2.png`;
  }
}

export function generateStaticParams() {
  return Object.keys(stores).map((tienda) => ({ tienda }));
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { tienda } = await params;
  const store = getStore(tienda);
  if (!store) return { title: "Pagina no encontrada", robots: { index: false, follow: false } };
  const path = `/ofertas/${tienda}/`;
  const title = `${store.label} de hoy: descuentos y precios`;
  return {
    title,
    description: store.description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | Chollos al Dia`, description: store.description, url: path, images: [{ url: "/og-chollosaldia-v2.png", width: 1731, height: 909, alt: store.label }] },
    twitter: { card: "summary_large_image", title, description: store.description, images: ["/og-chollosaldia-v2.png"] },
  };
}

export default async function StoreOffersPage({ params }: StorePageProps) {
  const { tienda } = await params;
  const store = getStore(tienda);
  if (!store) notFound();

  const deals = publishedDeals.filter((deal) => deal.store === store.name);
  const displayedDeals = deals.slice(0, 60);
  const averageDiscount = deals.length ? Math.round(deals.reduce((total, deal) => total + dealDiscount(deal), 0) / deals.length) : 0;
  const collectionSchema = {
    "@context": "https://schema.org",
    "@graph": [{
      "@type": "CollectionPage", "@id": `${siteUrl}/ofertas/${tienda}/`,
      name: store.label, description: store.description, inLanguage: "es-ES", isPartOf: { "@id": `${siteUrl}/#website` },
      mainEntity: { "@type": "ItemList", numberOfItems: displayedDeals.length, itemListElement: displayedDeals.map((deal, index) => ({ "@type": "ListItem", position: index + 1, url: `${siteUrl}${dealHref(deal.id)}`, name: deal.title, image: absoluteImageUrl(deal.imageUrl) })) },
    }, {
      "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
        { "@type": "ListItem", position: 2, name: store.label, item: `${siteUrl}/ofertas/${tienda}` },
      ],
    }],
  };

  return (
    <main className="storePage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema).replace(/</g, "\\u003c") }} />
      <div className="announcement"><div className="shell announcementInner"><span><b>Ofertas actualizadas</b> · descuentos y enlaces revisados al publicar</span><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Alertas en Telegram ↗</a></div></div>
      <header className="siteHeader"><div className="shell headerInner"><Link className="brand" href="/" aria-label="Chollos al Dia, inicio"><span className="brandMark" aria-hidden="true">€</span><span>Chollos <span>al</span>Dia</span></Link><nav aria-label="Navegacion principal"><Link href="/#ofertas">Ofertas de hoy</Link><a className="telegramLink" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Telegram ↗</a></nav></div></header>
      <article className="storeArticle shell">
        <nav className="offerBreadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>/</span><b>{store.label}</b></nav>
        <header className="storeHero"><div><p className="eyebrow"><span aria-hidden="true" />{store.eyebrow}</p><h1>{store.title}</h1><p>{store.description}</p></div><aside><strong>{deals.length}</strong><span>ofertas activas</span><b>{averageDiscount ? `-${averageDiscount}%` : "Precio"}</b><small>{averageDiscount ? "descuento medio" : "registrado al publicar"}</small></aside></header>
        <section className="storeDeals" aria-labelledby="store-deals-title"><div className="sectionIntro"><div><p className="eyebrow"><span aria-hidden="true" />OFERTAS ACTIVAS</p><h2 id="store-deals-title">{store.label} de hoy</h2></div><p>Mostramos primero las {Math.min(60, deals.length)} ofertas más recientes. Los precios, el stock y los cupones pueden cambiar.</p></div>{deals.length ? <div className="dealGrid storeDealGrid">{displayedDeals.map((deal) => {
          const discount = dealDiscount(deal); const savings = dealSavings(deal);
          return <article className="dealCard" key={deal.id}><Link className="imageWrap dealPreviewLink" href={dealHref(deal.id)} aria-label={`Ver oferta: ${deal.title}`}><img src={deal.imageUrl} alt={deal.title} width={720} height={560} />{discount > 0 && <span className="discountBadge">-{discount}%</span>}<span className="storeBadge">{deal.store}</span></Link><div className="dealBody"><p className="categoryLabel">{deal.category}</p><h3><Link href={dealHref(deal.id)}>{deal.title}</Link></h3><div className="priceRow"><strong>{money.format(deal.price)}</strong>{discount > 0 && <span>Antes <s>{money.format(deal.oldPrice)}</s></span>}</div>{savings > 0 && <p className="saving">Ahorras {money.format(savings)}</p>}{deal.coupon ? <p className="storeCoupon">Cupon: <b>{deal.coupon}</b></p> : <p className="noCoupon">Precio directo, sin cupon extra</p>}<Link className="dealButton" href={dealHref(deal.id)}>Ver oferta y analisis <span aria-hidden="true">→</span></Link></div></article>;
        })}</div> : <div className="empty"><b>Ahora mismo no hay ofertas activas de {store.name} que pasen nuestro filtro.</b><span>Vuelve pronto o consulta todas las ofertas seleccionadas.</span><Link href="/#ofertas">Ver todas las ofertas</Link></div>}</section>
        <section className="storeAdvice"><div><p className="eyebrow"><span aria-hidden="true" />ANTES DE COMPRAR</p><h2>Que conviene revisar.</h2></div><p>{store.guidance} Mostramos el precio disponible cuando se publica la oferta, no una promesa de precio futuro.</p></section>
      </article>
      <footer><div className="shell footnote"><span>© {new Date().getFullYear()} Chollos al Dia</span><p>Algunos enlaces son de afiliacion y pueden generar una comision sin cambiar el precio para ti.</p></div></footer>
    </main>
  );
}
