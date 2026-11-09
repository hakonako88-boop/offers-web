import { readFile, writeFile } from 'node:fs/promises';

const offers = JSON.parse(await readFile(new URL('../data/offers.json', import.meta.url), 'utf8'));
const historyFile = new URL('../data/price-history.json', import.meta.url);
const history = JSON.parse(await readFile(historyFile, 'utf8'));
const recent = Date.now() - 14 * 86400000;
let recorded = 0;
for (const offer of offers) {
  const id = String(offer.source_product_id || '').trim();
  const price = Number(String(offer.price || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
  if (!id || !Number.isFinite(price) || price <= 0 || Number(offer.date) * 1000 < recent) continue;
  const key = `${String(offer.store || '').toLowerCase()}:${id}`;
  // A scheduler run is not a fresh store check. Record the publication date,
  // never manufacture daily observations from an unchanged saved offer.
  const publishedAt = Number(offer.updated_at || offer.date) * 1000;
  if (!Number.isFinite(publishedAt) || publishedAt > Date.now()) continue;
  const observationDate = new Date(publishedAt).toISOString().slice(0, 10);
  const points = (Array.isArray(history[key]) ? history[key] : []).filter(point => point.source === 'publication');
  const observation = { date: observationDate, price, source: 'publication' };
  const existing = points.findIndex(point => point.date === observationDate);
  if (existing >= 0) {
    points[existing] = observation;
  } else {
    points.push(observation);
    recorded++;
  }
  history[key] = points.sort((a,b) => a.date.localeCompare(b.date)).slice(-90);
}
await writeFile(historyFile, `${JSON.stringify(history, null, 2)}\n`);
console.log(`Price history: ${recorded} daily observations recorded.`);
