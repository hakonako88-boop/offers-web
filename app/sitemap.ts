import type { MetadataRoute } from "next";
import rawOffers from "../data/offers.json";

const siteUrl = "https://chollosaldia.com";
const latestPublication = Math.max(0, ...(rawOffers as Array<{ date?: number }>).map((offer) => Number(offer.date) || 0));
const homepageLastModified = latestPublication ? new Date(latestPublication * 1000) : new Date("2026-08-11T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, lastModified: homepageLastModified, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/aviso-legal`, lastModified: new Date("2026-08-11T00:00:00.000Z"), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacidad`, lastModified: new Date("2026-08-11T00:00:00.000Z"), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/afiliacion`, lastModified: new Date("2026-08-11T00:00:00.000Z"), changeFrequency: "yearly", priority: 0.3 },
  ];
}
