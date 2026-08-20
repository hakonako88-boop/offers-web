import type { Metadata } from "next";
import Link from "next/link";
import { getPostById, postHref, publishedPosts } from "../../lib/posts";

const siteUrl = "https://chollosaldia.com";

type PageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return publishedPosts.map((post) => ({ id: post.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = getPostById((await params).id);
  if (!post) return { title: "Publicación no encontrada", robots: { index: false, follow: false } };
  const description = post.body.replace(/\s+/gu, " ").slice(0, 155);
  return {
    title: post.title,
    description,
    alternates: { canonical: postHref(post.id) },
    openGraph: { title: post.title, description, url: postHref(post.id), type: "article", publishedTime: post.publishedAt, images: [{ url: post.imageUrl, alt: post.title }] },
    twitter: { card: "summary_large_image", title: post.title, description, images: [post.imageUrl] },
  };
}

export default async function PublicationPage({ params }: PageProps) {
  const post = getPostById((await params).id);
  if (!post) return <main className="postNotFound shell"><Link href="/">← Volver al inicio</Link><h1>Esta publicación no está disponible</h1></main>;
  const description = post.body.replace(/\s+/gu, " ").slice(0, 220);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description,
    image: [new URL(post.imageUrl, siteUrl).toString()],
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    mainEntityOfPage: `${siteUrl}${postHref(post.id)}`,
    author: { "@type": "Organization", name: "Chollos al Día", url: siteUrl },
    publisher: { "@type": "Organization", name: "Chollos al Día", logo: { "@type": "ImageObject", url: `${siteUrl}/favicon-512.png` } },
  };
  return <main className="postPage">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</gu, "\\u003c") }} />
    <header className="siteHeader"><div className="shell headerInner"><Link className="brand" href="/"><span className="brandMark">€</span><span>Chollos <span>al</span>Día</span></Link><nav><Link href="/">Ofertas de hoy</Link><a className="telegramLink" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Telegram ↗</a></nav></div></header>
    <article className="postArticle shell">
      <nav className="postBreadcrumb"><Link href="/">Inicio</Link><span>/</span><b>Publicaciones</b></nav>
      <p className="eyebrow"><span aria-hidden="true" />NOVEDADES DE CHOLLOS AL DÍA</p>
      <h1>{post.title}</h1>
      <time dateTime={post.publishedAt}>Publicado el {post.publishedLabel}</time>
      <img className="postHeroImage" src={post.imageUrl} alt={post.title} width={1200} height={800} />
      <div className="postBody">{post.body.split(/\n{2,}/gu).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      {post.linkUrl && <a className="primaryButton postExternal" href={post.linkUrl} target="_blank" rel="nofollow sponsored noreferrer">Abrir enlace <span aria-hidden="true">↗</span></a>}
      <div className="postBack"><Link href="/">← Ver todos los chollos</Link></div>
    </article>
  </main>;
}
