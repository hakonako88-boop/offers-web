import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const source = path.join(root, "dist", "client");
const output = path.join(root, "out-github");

await rm(output, { recursive: true, force: true });
await cp(source, output, { recursive: true });

const workerUrl = pathToFileURL(path.join(root, "dist", "server", "index.js"));
workerUrl.searchParams.set("export", Date.now().toString());
const { default: worker } = await import(workerUrl.href);

const assets = { fetch: async () => new Response("Not found", { status: 404 }) };
const context = { waitUntil() {}, passThroughOnException() {} };

function publicDealId(value) {
  return String(value || "").trim().replace(/[^a-z0-9._~-]+/giu, "-").replace(/^-+|-+$/gu, "");
}

async function render(route, destination) {
  let response = await worker.fetch(new Request(`https://chollosaldia.com${route}`, { headers: { accept: "text/html" } }), { ASSETS: assets }, context);
  if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
    const redirectedUrl = new URL(response.headers.get("location"), `https://chollosaldia.com${route}`);
    response = await worker.fetch(new Request(redirectedUrl, { headers: { accept: "text/html" } }), { ASSETS: assets }, context);
  }
  if (!response.ok) throw new Error(`No se pudo exportar ${route}: ${response.status}`);
  const target = path.join(output, destination);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, await response.text(), "utf8");
}

async function writeRedirect(destination, target) {
  const escapedTarget = target.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex,follow">
  <meta http-equiv="refresh" content="0;url=${escapedTarget}">
  <link rel="canonical" href="https://chollosaldia.com${escapedTarget}">
  <title>Página trasladada | Chollos al Día</title>
</head>
<body>
  <p>Esta página se ha trasladado. <a href="${escapedTarget}">Continuar en Chollos al Día</a>.</p>
</body>
</html>`;
  const targetFile = path.join(output, destination, "index.html");
  await mkdir(path.dirname(targetFile), { recursive: true });
  await writeFile(targetFile, html, "utf8");
}

await render("/", "index.html");
await render("/aviso-legal", "aviso-legal/index.html");
await render("/privacidad", "privacidad/index.html");
await render("/afiliacion", "afiliacion/index.html");
await render("/contacto", "contacto/index.html");
await render("/como-verificamos-ofertas", "como-verificamos-ofertas/index.html");
await render("/blog", "blog/index.html");
await render("/buscar", "buscar/index.html");
await render("/gta-vi-mas-barato-ps5", "gta-vi-mas-barato-ps5/index.html");
for (const store of ["amazon", "aliexpress", "miravia", "xiaomi", "pccomponentes", "el-corte-ingles", "mediamarkt"]) {
  await render(`/ofertas/${store}`, `ofertas/${store}/index.html`);
}
for (const category of ["tecnologia", "videojuegos", "hogar", "cocina", "bricolaje", "juguetes", "moda", "deporte", "belleza"]) {
  await render(`/chollos/${category}`, `chollos/${category}/index.html`);
}
for (const guide of ["ofertas-amazon", "cupones-aliexpress", "detectar-chollos-reales", "chollos-electronica", "ofertas-cocina"]) {
  await render(`/guias/${guide}`, `guias/${guide}/index.html`);
}
// The sitemap is built from the same reviewed list used by the application.
// Exporting every raw inbox/history entry here used to create stale deal pages
// that the homepage had intentionally hidden.
const sitemapResponse = await worker.fetch(new Request("https://chollosaldia.com/sitemap.xml"), { ASSETS: assets }, context);
if (!sitemapResponse.ok) throw new Error("No se pudo leer el mapa del sitio para exportar las ofertas activas.");
const sitemap = await sitemapResponse.text();
const offerIds = [...new Set([...sitemap.matchAll(/<loc>https:\/\/chollosaldia\.com\/oferta\/([^<]+)<\/loc>/g)]
  .map((match) => decodeURIComponent(match[1]).replace(/\/$/, ""))
  .filter(Boolean))];
for (const id of offerIds) {
  const encodedId = encodeURIComponent(id);
  await render(`/oferta/${encodedId}`, `oferta/${encodedId}/index.html`);
}
// Preserve links already shared by Telegram before product ids became the
// canonical offer URL. Search engines and older channel buttons are redirected
// to the same real product page instead of landing on a 404.
const storedOffers = JSON.parse(await readFile(path.join(root, "data", "offers.json"), "utf8"));
for (const offer of storedOffers) {
  const legacyId = String(offer.message_id || "").trim();
  const stableId = publicDealId(offer.chollometroId || offer.source_product_id || "");
  if (!legacyId || !stableId || legacyId === stableId || !offerIds.includes(stableId)) continue;
  await writeRedirect(`oferta/${encodeURIComponent(legacyId)}`, `/oferta/${encodeURIComponent(stableId)}/`);
}
const productSlugs = [...new Set([...sitemap.matchAll(/<loc>https:\/\/chollosaldia\.com\/producto\/([^<]+)<\/loc>/g)]
  .map((match) => decodeURIComponent(match[1]).replace(/\/$/, ""))
  .filter(Boolean))];
for (const slug of productSlugs) {
  const encodedSlug = encodeURIComponent(slug);
  await render(`/producto/${encodedSlug}`, `producto/${encodedSlug}/index.html`);
}
const postIds = [...new Set([...sitemap.matchAll(/<loc>https:\/\/chollosaldia\.com\/publicacion\/([^<]+)<\/loc>/g)]
  .map((match) => decodeURIComponent(match[1]).replace(/\/$/, ""))
  .filter(Boolean))];
for (const id of postIds) {
  const encodedId = encodeURIComponent(id);
  await render(`/publicacion/${encodedId}`, `publicacion/${encodedId}/index.html`);
}
await render("/robots.txt", "robots.txt");
await render("/ads.txt", "ads.txt");
await render("/sitemap.xml", "sitemap.xml");
await render("/feed.xml", "feed.xml");

// Only redirect obsolete URLs when there is a clear equivalent destination.
// Expired product URLs intentionally remain 404 instead of being redirected
// to unrelated deals, which would be misleading for visitors and search bots.
await writeRedirect("publicacion/[id]/page", "/");
await writeRedirect("&", "/");
await writeRedirect("$", "/");
await writeRedirect("blog/top-5-chollos-julio", "/guias/detectar-chollos-reales/");
await writeRedirect("blog/mejores-chollos-julio-2025", "/guias/detectar-chollos-reales/");
await writeFile(path.join(output, "CNAME"), "chollosaldia.com\n", "utf8");
await writeFile(path.join(output, ".nojekyll"), "", "utf8");

console.log(`Web estática preparada en ${output}`);
