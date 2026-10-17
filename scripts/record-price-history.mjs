import { readFile, writeFile } from 'node:fs/promises';

const offers = JSON.parse(await readFile(new URL('../data/offers.json', import.meta.url), 'utf8'));
const historyFile = new URL('../data/price-history.json', import.meta.url);
const history = JSON.parse(await readFile(historyFile, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const recent = Date.now() - 14 * 86400000;
let recorded = 0;
for (const offer of offers) {
  const id = String(offer.source_product_id || '').trim();
  const price = Number(String(offer.price || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
  if (!id || !Number.isFinite(price) || price <= 0 || Number(offer.date) * 1000 < recent) continue;
  const key = `${String(offer.store || '').toLowerCase()}:${id}`;
  const points = Array.isArray(history[key]) ? history[key] : [];
  if (points.at(-1)?.date === today) {
    if (points.at(-1)?.price !== price) points[points.length - 1] = { date: today, price };
  } else {
    points.push({ date: today, price });
    recorded++;
  }
  history[key] = points.slice(-90);
}
await writeFile(historyFile, `${JSON.stringify(history, null, 2)}\n`);
console.log(`Price history: ${recorded} daily observations recorded.`);
