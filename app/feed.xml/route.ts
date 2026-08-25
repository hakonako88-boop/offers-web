import { dealDescription, dealHref, publishedDeals } from "../lib/deals";

const siteUrl = "https://chollosaldia.com";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function publicationDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

export function GET() {
  const latest = publishedDeals[0]?.verifiedDate;
  const gtaGuide = [
    "<item>",
    "<title>GTA 6 barato en PS5: 54 € frente a 79,99 €</title>",
    `<link>${siteUrl}/gta-vi-mas-barato-ps5/</link>`,
    `<guid isPermaLink="true">${siteUrl}/gta-vi-mas-barato-ps5/</guid>`,
    "<description>Precio de GTA 6 en PS5, comparación regional, requisitos, riesgos, presentación del 27 de agosto y fecha oficial de lanzamiento.</description>",
    "<category>Gaming</category>",
    `<pubDate>${new Date("2026-08-25T13:00:00.000Z").toUTCString()}</pubDate>`,
    "</item>",
  ].join("");
  const items = gtaGuide + publishedDeals.slice(0, 29).map((deal) => {
    const url = `${siteUrl}${dealHref(deal.id)}`;
    return [
      "<item>",
      `<title>${escapeXml(`${deal.title} en ${deal.store}`)}</title>`,
      `<link>${escapeXml(url)}</link>`,
      `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `<description>${escapeXml(dealDescription(deal))}</description>`,
      `<category>${escapeXml(deal.category)}</category>`,
      `<pubDate>${publicationDate(deal.verifiedDate)}</pubDate>`,
      "</item>",
    ].join("");
  }).join("");

  const feed = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"><channel>',
    "<title>Chollos al Día - Ofertas nuevas</title>",
    `<link>${siteUrl}</link>`,
    "<description>Ofertas seleccionadas con precio registrado y enlaces directos.</description>",
    "<language>es-ES</language>",
    `<lastBuildDate>${publicationDate(latest)}</lastBuildDate>`,
    items,
    "</channel></rss>",
  ].join("");

  return new Response(feed, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=900",
    },
  });
}
