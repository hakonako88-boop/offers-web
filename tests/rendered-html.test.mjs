import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(route = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${route}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the Chollos al Día storefront and SEO metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="es">/i);
  assert.match(html, /Chollos de hoy: ofertas, descuentos y cupones/);
  assert.match(html, /sí merece/);
  assert.match(html, /Chollos de hoy/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /rel="canonical" href="https:\/\/chollosaldia\.com"/);
  assert.match(html, /href="\/oferta\//);
  assert.match(html, /MAYOR AHORRO REGISTRADO/);
  assert.match(html, /Alertas de chollos/);
  assert.match(html, /sectionCover storeAmazon/);
  assert.match(html, /sectionCover categoryGaming/);
  assert.match(html, /og-chollosaldia-v2\.png/);
  assert.doesNotMatch(html, /Precio 54,40/);
  assert.doesNotMatch(html, /https:\/\/amzn\.to\/4gryAR2/);
  assert.doesNotMatch(html, /Relleno de coj[ií]n|Mantel impermeable|Malla Ocultaci[oó]n/i);
  assert.doesNotMatch(html, /t\.href/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("renders an individual offer with price analysis, pros, cons and Product SEO", async () => {
  const home = await render();
  const homeHtml = await home.text();
  const id = homeHtml.match(/href="\/oferta\/([^"?#]+)"/)?.[1] ?? "";
  assert.ok(id, "Expected at least one published offer");
  const response = await render(`/oferta/${encodeURIComponent(id)}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Lo importante de esta oferta/);
  assert.match(html, /Puntos a favor/);
  assert.match(html, /A tener en cuenta/);
  assert.match(html, /PRECIO DE OFERTA/);
  assert.match(html, /"@type":"Product"/);
  assert.match(html, /rel="nofollow sponsored noreferrer"/);
  assert.match(html, new RegExp(`rel="canonical" href="https://chollosaldia\\.com/oferta/${id}"`));
});

test("keeps the historical contact URL as a useful, indexable page", async () => {
  const response = await render("/contacto");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Has visto un chollo/i);
  assert.match(html, /t\.me\/aldiachollos/);
  assert.match(html, /rel="canonical" href="https:\/\/chollosaldia\.com\/contacto"/);
});

test("renders store pages with active offers and collection SEO", async () => {
  const response = await render("/ofertas/amazon");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Ofertas Amazon de hoy/);
  assert.match(html, /"@type":"CollectionPage"/);
  assert.match(html, /rel="canonical" href="https:\/\/chollosaldia\.com\/ofertas\/amazon"/);
  assert.match(html, /href="\/oferta\//);
});

test("renders the technology category with its own collection SEO", async () => {
  const response = await render("/chollos/tecnologia");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Chollos de tecnologia/);
  assert.match(html, /"@type":"CollectionPage"/);
  assert.match(html, /rel="canonical" href="https:\/\/chollosaldia\.com\/chollos\/tecnologia"/);
  assert.match(html, /name="robots" content="index, follow"/);
});

test("renders a useful Amazon guide with Article and FAQ SEO", async () => {
  const response = await render("/guias/ofertas-amazon");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Como encontrar ofertas reales en Amazon/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /rel="canonical" href="https:\/\/chollosaldia\.com\/guias\/ofertas-amazon"/);
});

test("keeps affiliate credentials out of the client source", async () => {
  const [client, example] = await Promise.all([
    readFile(new URL("../app/components/DealExplorer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(client, /TELEGRAM_BOT_TOKEN|IMPORT_SECRET|AMAZON_ASSOCIATE_TAG/);
  assert.match(example, /AMAZON_ASSOCIATE_TAG=/);
  assert.match(example, /TELEGRAM_BOT_TOKEN=/);
});
