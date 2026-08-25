import fs from 'node:fs';
import path from 'node:path';
import { AWIN_RETAILERS, retailQualityScore } from './awin-retailers.mjs';
import { mediaMarktQualityScore } from './tradedoubler-mediamarkt.mjs';

const file = path.join(process.cwd(), 'data', 'offers.json');
const offers = JSON.parse(fs.readFileSync(file, 'utf8'));
const eci = AWIN_RETAILERS.find((retailer) => retailer.slug === 'el-corte-ingles');
const pcComponentes = AWIN_RETAILERS.find((retailer) => retailer.slug === 'pccomponentes');

function numeric(value = '') {
  const raw = String(value).replace(/\u00a0|\s/gu, '').replace(/[^0-9,.-]/gu, '');
  if (!raw) return 0;
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  return Number(comma > dot ? raw.replaceAll('.', '').replace(',', '.') : raw.replaceAll(',', '')) || 0;
}

const removed = [];
const kept = offers.filter((offer) => {
  if (!['El Corte Inglés', 'MediaMarkt', 'PcComponentes'].includes(offer.store)) return true;
  const input = {
    title: offer.title,
    category: offer.category,
    price: numeric(offer.price),
    oldPrice: numeric(offer.previousPrice),
  };
  const score = offer.store === 'MediaMarkt'
    ? mediaMarktQualityScore(input)
    : retailQualityScore(input, offer.store === 'PcComponentes' ? pcComponentes : eci);
  if (score > 0) return true;
  removed.push({ store: offer.store, title: offer.title, price: offer.price, previousPrice: offer.previousPrice });
  return false;
});

fs.writeFileSync(file, `${JSON.stringify(kept, null, 2)}\n`);
console.log(JSON.stringify({ before: offers.length, after: kept.length, removed: removed.length, offers: removed }, null, 2));
