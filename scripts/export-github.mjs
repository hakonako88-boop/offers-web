import { cp, mkdir, rm, writeFile } from "node:fs/promises";
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

async function render(route, destination) {
  const response = await worker.fetch(new Request(`https://chollosaldia.com${route}`, { headers: { accept: "text/html" } }), { ASSETS: assets }, context);
  if (!response.ok) throw new Error(`No se pudo exportar ${route}: ${response.status}`);
  const target = path.join(output, destination);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, await response.text(), "utf8");
}

await render("/", "index.html");
await render("/aviso-legal", "aviso-legal/index.html");
await render("/privacidad", "privacidad/index.html");
await render("/afiliacion", "afiliacion/index.html");
await render("/contacto", "contacto/index.html");
await render("/como-verificamos-ofertas", "como-verificamos-ofertas/index.html");
for (const store of ["amazon", "aliexpress", "miravia"]) {
  await render(`/ofertas/${store}`, `ofertas/${store}/index.html`);
}
for (const category of ["tecnologia", "videojuegos", "hogar"]) {
  await render(`/chollos/${category}`, `chollos/${category}/index.html`);
}
for (const guide of ["ofertas-amazon", "cupones-aliexpress", "detectar-chollos-reales"]) {
  await render(`/guias/${guide}`, `guias/${guide}/index.html`);
}
// The sitemap is built from the same reviewed list used by the application.
// Exporting every raw inbox/history entry here used to create stale deal pages
// that the homepage had intentionally hidden.
const sitemapResponse = await worker.fetch(new Request("https://chollosaldia.com/sitemap.xml"), { ASSETS: assets }, context);
if (!sitemapResponse.ok) throw new Error("No se pudo leer el mapa del sitio para exportar las ofertas activas.");
const sitemap = await sitemapResponse.text();
const offerIds = [...new Set([...sitemap.matchAll(/<loc>https:\/\/chollosaldia\.com\/oferta\/([^<]+)<\/loc>/g)]
  .map((match) => decodeURIComponent(match[1]))
  .filter(Boolean))];
for (const id of offerIds) {
  const encodedId = encodeURIComponent(id);
  await render(`/oferta/${encodedId}`, `oferta/${encodedId}/index.html`);
}
const postIds = [...new Set([...sitemap.matchAll(/<loc>https:\/\/chollosaldia\.com\/publicacion\/([^<]+)<\/loc>/g)]
  .map((match) => decodeURIComponent(match[1]))
  .filter(Boolean))];
for (const id of postIds) {
  const encodedId = encodeURIComponent(id);
  await render(`/publicacion/${encodedId}`, `publicacion/${encodedId}/index.html`);
}
await render("/robots.txt", "robots.txt");
await render("/ads.txt", "ads.txt");
await render("/sitemap.xml", "sitemap.xml");
await render("/feed.xml", "feed.xml");
await writeFile(path.join(output, "CNAME"), "chollosaldia.com\n", "utf8");
await writeFile(path.join(output, ".nojekyll"), "", "utf8");

console.log(`Web estática preparada en ${output}`);
