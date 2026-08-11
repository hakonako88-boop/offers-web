import type { MetadataRoute } from "next";
import { dealHref, publishedDeals } from "./lib/deals";

const siteUrl = "https://chollosaldia.com";
const latestPublication = Math.max(0, ...publishedDeals.map((deal) => Date.parse(deal.verifiedDate || "") || 0));
const homepageLastModified = latestPublication ? new Date(latestPublication) : new Date("2026-08-11T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: homepageLastModified, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/aviso-legal`, lastModified: new Date("2026-08-11T00:00:00.000Z"), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacidad`, lastModified: new Date("2026-08-11T00:00:00.000Z"), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/afiliacion`, lastModified: new Date("2026-08-11T00:00:00.000Z"), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/contacto`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];
  return [
    ...staticPages,
    ...publishedDeals.map((deal) => ({
      url: `${siteUrl}${dealHref(deal.id)}`,
      lastModified: deal.verifiedDate ? new Date(deal.verifiedDate) : homepageLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
