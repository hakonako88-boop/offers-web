import type { Metadata } from "next";
import { DealExplorer, type Deal, type DealSummary } from "./components/DealExplorer";
import { dealDiscount, publishedDeals } from "./lib/deals";
import { publishedPosts } from "./lib/posts";

const title = "Chollos de hoy: ofertas, descuentos y cupones";
const description = "Chollos de hoy en Amazon, AliExpress, Miravia y más tiendas. Ofertas seleccionadas con precio, descuento, cupón y enlace directo para ahorrar.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${title} | Chollos al Día`,
    description,
    url: "/",
    images: [{ url: "/og-chollosaldia-v2.png", width: 1731, height: 909, alt: "Chollos al Día: ofertas verificadas y ahorro real" }],
  },
  twitter: { card: "summary_large_image", title: `${title} | Chollos al Día`, description, images: ["/og-chollosaldia-v2.png"] },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://chollosaldia.com/#website",
      name: "Chollos al Día",
      url: "https://chollosaldia.com/",
      inLanguage: "es-ES",
      description,
    },
    {
      "@type": "Organization",
      "@id": "https://chollosaldia.com/#organization",
      name: "Chollos al Día",
      url: "https://chollosaldia.com/",
      logo: {
        "@type": "ImageObject",
        url: "https://chollosaldia.com/favicon-512.png",
        width: 512,
        height: 512,
      },
      sameAs: ["https://t.me/aldiachollos"],
      email: "chollosaldia@gmail.com",
      contactPoint: [{ "@type": "ContactPoint", email: "chollosaldia@gmail.com", contactType: "customer support", availableLanguage: "Spanish" }],
    },
  ],
};

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://chollosaldia.com/#ofertas",
  name: "Chollos y ofertas de hoy",
  description,
  inLanguage: "es-ES",
  isPartOf: { "@id": "https://chollosaldia.com/#website" },
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: publishedDeals.length,
    itemListElement: publishedDeals.slice(0, 20).map((deal, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://chollosaldia.com/oferta/${encodeURIComponent(deal.id)}`,
      name: deal.title,
    })),
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Cómo seleccionáis las ofertas?",
      acceptedAnswer: { "@type": "Answer", text: "Priorizamos descuentos visibles, precios comparados, productos con actividad y enlaces de compra que se puedan comprobar." },
    },
    {
      "@type": "Question",
      name: "¿El precio final puede cambiar?",
      acceptedAnswer: { "@type": "Answer", text: "Sí. Las tiendas pueden modificar el precio, el stock o las condiciones sin previo aviso. Mostramos el dato disponible cuando se publica la oferta." },
    },
    {
      "@type": "Question",
      name: "¿Comprar desde estos enlaces cuesta más?",
      acceptedAnswer: { "@type": "Answer", text: "No. Algunos enlaces son de afiliación y pueden generar una comisión para Chollos al Día, sin aumentar el precio para ti." },
    },
  ],
};

export default function Home() {
  // Keep the landing page fast: every active offer remains available through
  // its own indexable URL, sitemap, store and category pages.
  const homepageDeals = publishedDeals.slice(0, 108).map((deal) => ({ ...deal, store: deal.store as Deal["store"] }));
  const discountedDeals = publishedDeals.filter((deal) => deal.oldPrice > deal.price);
  const summary: DealSummary = {
    total: publishedDeals.length,
    averageDiscount: discountedDeals.length ? Math.round(discountedDeals.reduce((total, deal) => total + dealDiscount(deal), 0) / discountedDeals.length) : 0,
    stores: {
      Amazon: publishedDeals.filter((deal) => deal.store === "Amazon").length,
      AliExpress: publishedDeals.filter((deal) => deal.store === "AliExpress").length,
      Miravia: publishedDeals.filter((deal) => deal.store === "Miravia").length,
      Xiaomi: publishedDeals.filter((deal) => deal.store === "Xiaomi").length,
      PcComponentes: publishedDeals.filter((deal) => deal.store === "PcComponentes").length,
      ElCorteIngles: publishedDeals.filter((deal) => deal.store === "El Corte Inglés").length,
      MediaMarkt: publishedDeals.filter((deal) => deal.store === "MediaMarkt").length,
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <DealExplorer initialDeals={homepageDeals} posts={publishedPosts.slice(0, 6)} summary={summary} />
    </>
  );
}
