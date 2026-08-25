import type { Metadata } from "next";
import Link from "next/link";
import { postHref, publishedPosts } from "../lib/posts";

const siteUrl = "https://chollosaldia.com";

export const metadata: Metadata = {
  title: "Blog de chollos: guías, ofertas y consejos para ahorrar",
  description: "Blog de chollos con guías para comprobar ofertas, utilizar cupones y comprar mejor en Amazon, AliExpress y otras tiendas.",
  alternates: { canonical: "/blog/" },
  openGraph: { title: "Blog de chollos y guías para ahorrar | Chollos al Día", description: "Guías prácticas, novedades y consejos para reconocer ofertas reales y comprobar el precio antes de comprar.", url: "/blog/", images: [{ url: "/og-chollosaldia-v2.png", width: 1731, height: 909, alt: "Blog de Chollos al Día" }] },
};

const guideCards = [
  { href: "/gta-vi-mas-barato-ps5/", label: "GAMING", title: "GTA VI: España frente al precio regional de India", text: "Compara precios, cambio, requisitos de región y riesgos antes de reservar." },
  { href: "/guias/chollos-electronica/", label: "ELECTRÓNICA", title: "Cómo comparar chollos de electrónica", text: "Modelo, capacidad, accesorios, vendedor y garantía antes de decidir." },
  { href: "/guias/ofertas-cocina/", label: "COCINA", title: "Cómo elegir ofertas de cocina", text: "Capacidad, potencia, medidas, recambios y precio final." },
  { href: "/guias/ofertas-amazon/", label: "AMAZON", title: "Cómo encontrar ofertas reales en Amazon", text: "Comprueba la variante, el envío y las condiciones de la ficha." },
  { href: "/guias/cupones-aliexpress/", label: "ALIEXPRESS", title: "Cómo utilizar cupones de AliExpress", text: "Revisa el mínimo, la variante y el total antes de pagar." },
  { href: "/guias/detectar-chollos-reales/", label: "MÉTODO", title: "Cómo saber si un chollo es real", text: "Distingue un ahorro demostrable de una etiqueta llamativa." },
] as const;

export default function BlogPage() {
  const posts = publishedPosts.slice(0, 12);
  const schema = { "@context": "https://schema.org", "@type": "CollectionPage", "@id": `${siteUrl}/blog/`, name: "Blog de chollos y guías para ahorrar", description: "Guías y publicaciones de Chollos al Día para comprobar ofertas y comprar mejor.", inLanguage: "es-ES", isPartOf: { "@id": `${siteUrl}/#website` }, mainEntity: { "@type": "ItemList", numberOfItems: guideCards.length, itemListElement: guideCards.map((guide, index) => ({ "@type": "ListItem", position: index + 1, name: guide.title, url: `${siteUrl}${guide.href}` })) } };
  return <main className="blogHub">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</gu, "\\u003c") }} />
    <header className="siteHeader"><div className="shell headerInner"><Link className="brand" href="/"><span className="brandMark" aria-hidden="true">€</span><span>Chollos <span>al</span>Día</span></Link><nav aria-label="Navegación principal"><Link href="/#ofertas">Ofertas de hoy</Link><a className="telegramLink" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Telegram ↗</a></nav></div></header>
    <article className="shell blogHubArticle">
      <nav className="offerBreadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>/</span><b>Blog de chollos</b></nav>
      <header className="blogHubHero"><p className="eyebrow"><span aria-hidden="true" />GUÍAS PARA COMPRAR MEJOR</p><h1>Blog de chollos, ofertas y ahorro.</h1><p>Información práctica para comprobar precios, aplicar cupones y elegir el producto correcto. Explicamos lo importante sin inventar características ni crear urgencia artificial.</p><div><Link href="/#ofertas">Ver chollos de hoy</Link><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Recibir alertas en Telegram</a></div></header>
      <section className="blogGuideSection" aria-labelledby="blog-guides-title"><div className="sectionIntro"><div><p className="eyebrow"><span aria-hidden="true" />GUÍAS DESTACADAS</p><h2 id="blog-guides-title">Aprende a reconocer una buena oferta.</h2></div><p>Elige una guía según la tienda o el producto que estés comparando.</p></div><div className="blogGuideGrid">{guideCards.map((guide) => <article key={guide.href}><span>{guide.label}</span><h3><Link href={guide.href}>{guide.title}</Link></h3><p>{guide.text}</p><Link href={guide.href}>Leer guía <b aria-hidden="true">→</b></Link></article>)}</div></section>
      {posts.length > 0 && <section className="editorialPosts blogPosts" aria-labelledby="blog-posts-title"><div className="sectionIntro"><div><p className="eyebrow"><span aria-hidden="true" />NOVEDADES</p><h2 id="blog-posts-title">Últimas publicaciones.</h2></div><p>Campañas, avisos y contenidos publicados desde Chollos al Día.</p></div><div className="postGrid">{posts.map((post) => <article className="postCard" key={post.id}><Link className="postCardImage" href={postHref(post.id)}><img src={post.imageUrl} alt={post.title} loading="lazy" width={720} height={480} /></Link><div><time dateTime={post.publishedAt}>{post.publishedLabel}</time><h3><Link href={postHref(post.id)}>{post.title}</Link></h3><p>{post.body.replace(/\s+/gu, " ").slice(0, 145)}{post.body.length > 145 ? "…" : ""}</p></div></article>)}</div></section>}
      <section className="guideCta"><div><p className="eyebrow"><span aria-hidden="true" />OFERTAS ACTUALIZADAS</p><h2>Aplica las guías a los chollos de hoy.</h2><p>Compara el precio, la variante y las condiciones antes de abrir la tienda.</p></div><Link className="primaryButton" href="/#ofertas">Explorar ofertas <span aria-hidden="true">→</span></Link></section>
    </article>
  </main>;
}
