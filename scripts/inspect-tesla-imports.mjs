import { readFile } from 'node:fs/promises';
// Read-only diagnostics. No credentials, alternate products or generated affiliate URLs.
const catalogue = JSON.parse(await readFile(new URL('../data/tesla-catalogue.json', import.meta.url), 'utf8'));
await Promise.all(catalogue.imports.map(async entry => {
  try {
    const response = await fetch(entry.originalUrl, { signal: AbortSignal.timeout(15000) });
    const html = await response.text();
    const title = html.match(/<title[^>]*>([^<]*)/i)?.[1] || null;
    const metadata = [...html.matchAll(/<meta[^>]*(?:property|name)=["'](og:[^"']+)["'][^>]*content=["']([^"']*)/gi)].map(match => [match[1], match[2]]);
    console.log(JSON.stringify({ id: entry.productId, status: response.status, title, metadata, bytes: html.length }));
  } catch (error) { console.log(JSON.stringify({ id: entry.productId, error: error.message })); }
}));
