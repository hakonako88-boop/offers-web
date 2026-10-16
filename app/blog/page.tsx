import type { Metadata } from "next";
import Link from "next/link";
import { isProductSelection, postHref, publishedPosts } from "../lib/posts";

const siteUrl = "https://chollosaldia.com";

export const metadata: Metadata = {
  title: "Blog de chollos: guías, ofertas y consejos para ahorrar",
  description: "Blog de chollos con guías para comprobar ofertas, utilizar cupones y comprar mejor en Amazon, AliExpress y otras tiendas.",
  alternates: { canonical: "/blog/" },
  openGraph: { title: "Blog de chollos y guías para ahorrar | Chollos al Día", description: "Guías prácticas, novedades y consejos para reconocer ofertas reales y comprobar el precio antes de comprar.", url: "/blog/", images: [{ url: "/og-chollosaldia-v2.png", width: 1731, height: 909, alt: "Blog de Chollos al Día" }] },
};

const guideCards = [
  { href: "/gta-vi-mas-barato-ps5/", label: "GAMING · ACTUALIZADA", title: "GTA 6 barato: precio en PS5, reserva y ahorro", text: "Precio oficial en España, comparación regional, vídeo ampliado, ediciones y requisitos antes de reservar." },
  { href: "/guias/chollos-electronica/", label: "ELECTRÓNICA", title: "Cómo comparar chollos de electrónica", text: "Modelo, capacidad, accesorios, vendedor y garantía antes de decidir." },
  { href: "/guias/ofertas-cocina/", label: "COCINA", title: "Cómo elegir ofertas de cocina", text: "Capacidad, potencia, medidas, recambios y precio final." },
  { href: "/guias/mejores-aspiradoras-calidad-precio/", label: "RECOMENDACIÓN · LIMPIEZA", title: "Qué aspiradora comprar por calidad-precio", text: "Tipos, autonomía, filtros, recambios y criterios para reconocer una buena oferta." },
  { href: "/guias/ventiladores-guia-compra/", label: "RECOMENDACIÓN · CLIMATIZACIÓN", title: "Qué ventilador comprar para casa", text: "Techo, torre, pie o sobremesa según habitación, ruido e instalación." },
  { href: "/guias/ofertas-alimentacion-supermercado/", label: "RECOMENDACIÓN · ALIMENTACIÓN", title: "Cómo comparar ofertas de alimentación", text: "Precio por unidad, formatos, packs, envío y cupones antes de comprar." },
  { href: "/guias/ofertas-amazon/", label: "AMAZON", title: "Cómo encontrar ofertas reales en Amazon", text: "Comprueba la variante, el envío y las condiciones de la ficha." },
  { href: "/guias/cupones-aliexpress/", label: "ALIEXPRESS", title: "Cómo utilizar cupones de AliExpress", text: "Revisa el mínimo, la variante y el total antes de pagar." },
  { href: "/guias/detectar-chollos-reales/", label: "MÉTODO", title: "Cómo saber si un chollo es real", text: "Distingue un ahorro demostrable de una etiqueta llamativa." },
] as const;

export default function BlogPage() {
  const posts = publishedPosts.filter(isProductSelection).slice(0, 13);
  const featured = posts[0];
  const schema = { "@context": "https://schema.org", "@type": "CollectionPage", "@id": `${siteUrl}/blog/`, name: "Blog de chollos y guías para ahorrar", description: "Guías y publicaciones de Chollos al Día para comprobar ofertas y comprar mejor.", inLanguage: "es-ES", isPartOf: { "@id": `${siteUrl}/#website` }, mainEntity: { "@type": "ItemList", numberOfItems: guideCards.length, itemListElement: guideCards.map((guide, index) => ({ "@type": "ListItem", position: index + 1, name: guide.title, url: `${siteUrl}${guide.href}` })) } };
  return <main className="blogHub">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</gu, "\\u003c") }} />
    <header className="siteHeader"><div className="shell headerInner"><Link className="brand" href="/"><span className="brandMark" aria-hidden="true">€</span><span>Chollos <span>al</span>Día</span></Link><nav aria-label="Navegación principal"><Link href="/#ofertas">Ofertas de hoy</Link><a className="telegramLink" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Telegram ↗</a></nav></div></header>
    <article className="shell blogHubArticle">
      <nav className="offerBreadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>/</span><b>Blog de chollos</b></nav>
      <header className="blogHubHero"><p className="eyebrow"><span aria-hidden="true" />LA GUÍA PARA COMPRAR MEJOR</p><h1>Buenas compras empiezan aquí.</h1><p>Selecciones de productos, precios a la vista y guías útiles. Encuentra una idea, consulta la oferta y decide con todos los datos.</p><div><Link href="/#ofertas">Ver ofertas de hoy</Link><a href={posts.length > 1 ? "#ultimas-publicaciones" : "#guias-practicas"}>Leer el blog ↓</a></div></header>
      {featured && <section className="blogFeatured" aria-label="Publicación destacada"><Link className="blogFeaturedImage" href={postHref(featured.id)}><img src={featured.imageUrl} alt={featured.title} width={960} height={640} /></Link><div><p className="eyebrow"><span aria-hidden="true" />ÚLTIMA PUBLICACIÓN</p><time dateTime={featured.publishedAt}>{featured.publishedLabel}</time><h2><Link href={postHref(featured.id)}>{featured.title}</Link></h2><p>{featured.body.replace(/\s+/gu, " ").slice(0, 190)}…</p><Link className="blogFeaturedLink" href={postHref(featured.id)}>Leer selección <span aria-hidden="true">↗</span></Link></div></section>}
      {posts.length > 1 && <section className="editorialPosts blogPosts" id="ultimas-publicaciones" aria-labelledby="blog-posts-title"><div className="sectionIntro"><div><p className="eyebrow"><span aria-hidden="true" />SELECCIONES Y NOVEDADES</p><h2 id="blog-posts-title">Lo último en el blog</h2></div><p>Productos destacados y contenido para comprar con más criterio.</p></div><div className="postGrid">{posts.slice(1).map((post) => <article className="postCard" key={post.id}><Link className="postCardImage" href={postHref(post.id)}><img src={post.imageUrl} alt={post.title} loading="lazy" width={720} height={480} /></Link><div><time dateTime={post.publishedAt}>{post.publishedLabel}</time><h3><Link href={postHref(post.id)}>{post.title}</Link></h3><p>{post.body.replace(/\s+/gu, " ").slice(0, 145)}{post.body.length > 145 ? "…" : ""}</p><Link className="postRead" href={postHref(post.id)}>Leer artículo →</Link></div></article>)}</div></section>}
      <section className="blogGuideSection" id="guias-practicas" aria-labelledby="blog-guides-title"><div className="sectionIntro"><div><p className="eyebrow"><span aria-hidden="true" />GUÍAS PRÁCTICAS</p><h2 id="blog-guides-title">Aprende a reconocer una buena oferta</h2></div><p>Consejos útiles según la tienda o el producto que estés comparando.</p></div><div className="blogGuideGrid">{guideCards.map((guide) => <article key={guide.href}><span>{guide.label}</span><h3><Link href={guide.href}>{guide.title}</Link></h3><p>{guide.text}</p><Link href={guide.href}>Leer guía <b aria-hidden="true">→</b></Link></article>)}</div></section>
      <section className="guideCta"><div><p className="eyebrow"><span aria-hidden="true" />OFERTAS ACTUALIZADAS</p><h2>Aplica las guías a los chollos de hoy.</h2><p>Compara el precio, la variante y las condiciones antes de abrir la tienda.</p></div><Link className="primaryButton" href="/#ofertas">Explorar ofertas <span aria-hidden="true">→</span></Link></section>
    </article>
  </main>;
}
