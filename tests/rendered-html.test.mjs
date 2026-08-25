import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(route = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  let response = await worker.fetch(new Request(`http://localhost${route}`, { headers: { accept: "text/html" } }), env, context);
  if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
    response = await worker.fetch(new Request(new URL(response.headers.get("location"), `http://localhost${route}`), { headers: { accept: "text/html" } }), env, context);
  }
  return response;
}

test("renders the Chollos al Día storefront and SEO metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="es">/i);
  assert.match(html, /Chollos de hoy y ofertas del día/);
  assert.match(html, /Ofertas del día que merecen la pena/);
  assert.match(html, /CHOLLOS DIARIOS/);
  assert.match(html, /Últimos chollos/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /rel="canonical" href="https:\/\/chollosaldia\.com\/"/);
  assert.match(html, /href="\/oferta\//);
  assert.match(html, /storeRail/);
  assert.match(html, /Alertas de chollos/);
  assert.match(html, /sectionCover storeAmazon/);
  assert.match(html, /sectionCover categoryGaming/);
  assert.match(html, /href="\/chollos\/cocina"/);
  assert.match(html, /Ver 36 ofertas más/);
  assert.ok((html.match(/class="dealCard"/g) ?? []).length <= 43, "homepage should not render hundreds of offer cards at once");
  assert.match(html, /og-chollosaldia-v2\.png/);
  assert.match(html, /rel="icon" href="\/favicon\.ico" sizes="48x48"/);
  assert.match(html, /href="\/site\.webmanifest"/);
  assert.match(html, /chollosaldia@gmail\.com/);
  assert.match(html, /"@type":"ContactPoint"/);
  assert.doesNotMatch(html, /Precio 54,40/);
  assert.doesNotMatch(html, /AHORRA UN 34%/);
  assert.doesNotMatch(html, /https:\/\/amzn\.to\/4gryAR2/);
  assert.doesNotMatch(html, /Relleno de coj[ií]n|Mantel impermeable|Malla Ocultaci[oó]n/i);
  assert.doesNotMatch(html, /t\.href/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
  assert.doesNotMatch(html, /ca-pub-(?:0000|1234|x+)/i);
});

test("publishes an ads.txt endpoint without inventing an AdSense publisher", async () => {
  const response = await render("/ads.txt");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/plain\b/i);
  const text = await response.text();
  assert.match(text, /AdSense pendiente de configuración|google\.com, pub-\d+, DIRECT, f08c47fec0942fa0/);
  assert.doesNotMatch(text, /pub-(?:0000|1234)/);
});

test("publishes a feed with only the reviewed active offers", async () => {
  const response = await render("/feed.xml");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/rss\+xml\b/i);
  const xml = await response.text();
  assert.match(xml, /<rss version="2.0">/);
  assert.match(xml, /<title>Chollos al Día - Ofertas nuevas<\/title>/);
  assert.match(xml, /https:\/\/chollosaldia\.com\/oferta\//);
  assert.doesNotMatch(xml, /Relleno de coj[ií]n|Mantel impermeable|Malla Ocultaci[oó]n/i);
});

test("renders an individual offer with price analysis, pros, cons and Product SEO", async () => {
  const home = await render();
  const homeHtml = await home.text();
  const id = homeHtml.match(/href="\/oferta\/([^/"?#]+)\/"/)?.[1] ?? "";
  assert.ok(id, "Expected at least one published offer");
  const response = await render(`/oferta/${encodeURIComponent(id)}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Lo importante de esta oferta/);
  assert.match(html, /Puntos a favor/);
  assert.match(html, /A tener en cuenta/);
  assert.match(html, /Otras ofertas que te pueden interesar/);
  assert.match(html, /Compartir por WhatsApp/);
  assert.match(html, /t\.me\/share\/url/);
  assert.match(html, /Ha cambiado el precio o el stock/);
  assert.match(html, /Aviso%20sobre%20una%20oferta/);
  assert.match(html, /PRECIO DE OFERTA/);
  assert.match(html, /"@type":"Product"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.doesNotMatch(html, /priceValidUntil/);
  assert.match(html, /rel="nofollow sponsored noreferrer"/);
  assert.match(html, new RegExp(`rel="canonical" href="https://chollosaldia\\.com/oferta/${id}/"`));
});

test("keeps a Telegram AliExpress offer on the website even without a previous price", async () => {
  const response = await render("/oferta/4473");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Tronsmart altavoz bluetooth/i);
  assert.match(html, /38,94/);
  assert.match(html, /s\.click\.aliexpress\.com/);
  assert.match(html, /manual-4473\.jpg/);
});

test("keeps older Telegram offers beyond the homepage card limit", async () => {
  const response = await render("/oferta/4472");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Silla de Playa Plegable/i);
  assert.match(html, /11,27/);
  assert.match(html, /s\.click\.aliexpress\.com/);
  assert.match(html, /manual-4472\.jpg/);
});

test("shows the newest offers in a bounded chronological homepage grid", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /class="dealCard"[\s\S]{0,1200}href="\/oferta\//);
  assert.match(html, /mostrando[\s\S]{0,30}36/);
});

test("keeps the historical contact URL as a useful, indexable page", async () => {
  const response = await render("/contacto");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Has visto un chollo/i);
  assert.match(html, /t\.me\/aldiachollos/);
  assert.match(html, /mailto:chollosaldia@gmail\.com/);
  assert.match(html, /rel="canonical" href="https:\/\/chollosaldia\.com\/contacto\/"/);
});

test("explains the editorial verification method in an indexable page", async () => {
  const response = await render("/como-verificamos-ofertas");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /C[oó]mo verificamos las ofertas/);
  assert.match(html, /Filtramos el ruido/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /rel="canonical" href="https:\/\/chollosaldia\.com\/como-verificamos-ofertas\/"/);
});

test("renders store pages with active offers and collection SEO", async () => {
  const response = await render("/ofertas/amazon");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Ofertas Amazon de hoy/);
  assert.match(html, /"@type":"CollectionPage"/);
  assert.match(html, /rel="canonical" href="https:\/\/chollosaldia\.com\/ofertas\/amazon\/"/);
  assert.match(html, /href="\/oferta\//);
});

test("renders the technology category with its own collection SEO", async () => {
  const response = await render("/chollos/tecnologia");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Chollos de tecnolog[ií]a/);
  assert.match(html, /"@type":"CollectionPage"/);
  assert.match(html, /rel="canonical" href="https:\/\/chollosaldia\.com\/chollos\/tecnologia\/"/);
  assert.match(html, /name="robots" content="index, follow"/);
});

test("renders expanded category landing pages with canonical metadata", async () => {
  const response = await render("/chollos/cocina");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Chollos de cocina/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, /rel="canonical" href="https:\/\/chollosaldia\.com\/chollos\/cocina\/"/);
});

test("renders a useful Amazon guide with Article and FAQ SEO", async () => {
  const response = await render("/guias/ofertas-amazon");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Como encontrar ofertas reales en Amazon/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /rel="canonical" href="https:\/\/chollosaldia\.com\/guias\/ofertas-amazon\/"/);
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

test("exports every linked store and category to GitHub Pages", async () => {
  const exporter = await readFile(new URL("../scripts/export-github.mjs", import.meta.url), "utf8");
  for (const slug of ["amazon", "aliexpress", "miravia", "xiaomi", "pccomponentes", "el-corte-ingles", "mediamarkt"]) {
    assert.match(exporter, new RegExp(`\\b${slug}\\b`));
  }
  for (const slug of ["tecnologia", "videojuegos", "hogar", "cocina", "bricolaje", "juguetes", "moda", "deporte", "belleza"]) {
    assert.match(exporter, new RegExp(`\\b${slug}\\b`));
  }
});
