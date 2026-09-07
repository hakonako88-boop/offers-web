import { publishedProducts } from "../lib/products";

/**
 * Internal deploy manifest. GitHub Pages is static: not every product belongs
 * in sitemap.xml, but historic product URLs must remain renderable so an old
 * Google result or Telegram link does not turn into a new 404.
 */
export function GET() {
  return Response.json(
    { products: publishedProducts.map(({ slug }) => slug) },
    { headers: { "X-Robots-Tag": "noindex, nofollow" } },
  );
}
