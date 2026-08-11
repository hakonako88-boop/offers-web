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
  assert.match(html, /og-chollosaldia-v2\.png/);
  assert.doesNotMatch(html, /Precio 54,40/);
  assert.doesNotMatch(html, /https:\/\/amzn\.to\/4gryAR2/);
  assert.doesNotMatch(html, /t\.href/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("renders an individual offer with price analysis, pros, cons and Product SEO", async () => {
  const offers = JSON.parse(await readFile(new URL("../data/offers.json", import.meta.url), "utf8"));
  const id = String(offers.find((offer) => offer.message_id)?.message_id ?? "");
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

test("keeps affiliate credentials out of the client source", async () => {
  const [client, example] = await Promise.all([
    readFile(new URL("../app/components/DealExplorer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(client, /TELEGRAM_BOT_TOKEN|IMPORT_SECRET|AMAZON_ASSOCIATE_TAG/);
  assert.match(example, /AMAZON_ASSOCIATE_TAG=/);
  assert.match(example, /TELEGRAM_BOT_TOKEN=/);
});
