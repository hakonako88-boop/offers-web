import type { Metadata } from "next";
import { DealExplorer } from "./components/DealExplorer";

const title = "Ofertas verificadas y descuentos de hoy";
const description = "Encuentra chollos seleccionados, descuentos reales y enlaces directos de AliExpress, Amazon y otras tiendas. Actualizado cada día.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${title} | Chollos al Día`,
    description,
    url: "/",
    images: [{ url: "/og-chollosaldia.png", width: 1536, height: 1024, alt: "Chollos al Día: ofertas verificadas y ahorro real" }],
  },
  twitter: { card: "summary_large_image", title: `${title} | Chollos al Día`, description, images: ["/og-chollosaldia.png"] },
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
      potentialAction: {
        "@type": "SearchAction",
        target: "https://chollosaldia.com/?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://chollosaldia.com/#organization",
      name: "Chollos al Día",
      url: "https://chollosaldia.com/",
      sameAs: ["https://t.me/aldiachollos"],
    },
  ],
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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <DealExplorer />
    </>
  );
}
