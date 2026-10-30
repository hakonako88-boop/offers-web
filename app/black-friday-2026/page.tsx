import type { Metadata } from "next";
import { publishedDeals } from "../lib/deals";
import CampaignExperience from "./CampaignExperience";

const title = "Black Friday y Cyber Monday 2026: ofertas y cupones";
const description = "Consulta una selección actualizada de ofertas publicadas para Black Friday y Cyber Monday 2026. Compara producto, ahorro, cupón y precio final antes de comprar.";
const url = "https://chollosaldia.com/black-friday-2026/";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/black-friday-2026/" },
  openGraph: { title: `${title} | Chollos al Día`, description, url, images: ["/og-chollosaldia-v3.png"] },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": url,
  name: title,
  description,
  inLanguage: "es-ES",
  isPartOf: { "@id": "https://chollosaldia.com/#website" },
};

export default function BlackFriday2026() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <CampaignExperience initialDeals={publishedDeals} />
  </>;
}
