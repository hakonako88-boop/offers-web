import type { MetadataRoute } from "next";
import { categoryIsIndexable, categoryPages } from "./lib/categories";
import { dealHref, publishedDeals } from "./lib/deals";
import { postHref, publishedPosts } from "./lib/posts";

const siteUrl = "https://chollosaldia.com";
const latestPublication = Math.max(0, ...publishedDeals.map((deal) => Date.parse(deal.verifiedDate || "") || 0), ...publishedPosts.map((post) => Date.parse(post.publishedAt) || 0));
const homepageLastModified = latestPublication ? new Date(latestPublication) : new Date("2026-08-11T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: homepageLastModified, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/ofertas/amazon/`, lastModified: homepageLastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/ofertas/aliexpress/`, lastModified: homepageLastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/ofertas/miravia/`, lastModified: homepageLastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/ofertas/xiaomi/`, lastModified: homepageLastModified, changeFrequency: "daily", priority: 0.78 },
    { url: `${siteUrl}/ofertas/pccomponentes/`, lastModified: homepageLastModified, changeFrequency: "daily", priority: 0.78 },
    { url: `${siteUrl}/ofertas/el-corte-ingles/`, lastModified: homepageLastModified, changeFrequency: "daily", priority: 0.78 },
    { url: `${siteUrl}/ofertas/mediamarkt/`, lastModified: homepageLastModified, changeFrequency: "daily", priority: 0.78 },
    { url: `${siteUrl}/guias/ofertas-amazon/`, lastModified: new Date("2026-08-12T00:00:00.000Z"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/guias/cupones-aliexpress/`, lastModified: new Date("2026-08-12T00:00:00.000Z"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/guias/detectar-chollos-reales/`, lastModified: new Date("2026-08-12T00:00:00.000Z"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/como-verificamos-ofertas/`, lastModified: new Date("2026-08-12T00:00:00.000Z"), changeFrequency: "monthly", priority: 0.65 },
    ...Object.keys(categoryPages)
      .filter((category) => categoryIsIndexable(category, publishedDeals))
      .map((category) => ({ url: `${siteUrl}/chollos/${category}/`, lastModified: homepageLastModified, changeFrequency: "daily" as const, priority: 0.75 })),
    { url: `${siteUrl}/aviso-legal/`, lastModified: new Date("2026-08-11T00:00:00.000Z"), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacidad/`, lastModified: new Date("2026-08-11T00:00:00.000Z"), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/afiliacion/`, lastModified: new Date("2026-08-11T00:00:00.000Z"), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/contacto/`, lastModified: new Date("2026-08-12T00:00:00.000Z"), changeFrequency: "monthly", priority: 0.4 },
  ];
  return [
    ...staticPages,
    ...publishedDeals.map((deal) => ({
      url: `${siteUrl}${dealHref(deal.id)}`,
      lastModified: deal.verifiedDate ? new Date(deal.verifiedDate) : homepageLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...publishedPosts.map((post) => ({
      url: `${siteUrl}${postHref(post.id)}`,
      lastModified: new Date(post.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.55,
    })),
  ];
}
