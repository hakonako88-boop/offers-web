import fs from 'node:fs';
import path from 'node:path';
import { miraviaCommunityQualityScore, miraviaQualityScore } from './miravia-offers.mjs';

const file = path.join(process.cwd(), 'data', 'offers.json');
const offers = JSON.parse(fs.readFileSync(file, 'utf8'));

function amount(value = '') {
  const raw = String(value).replace(/\u00a0|\s/gu, '').replace(/[^0-9,.-]/gu, '');
  if (!raw) return 0;
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  return Number(comma > dot ? raw.replaceAll('.', '').replace(',', '.') : raw.replaceAll(',', '')) || 0;
}

const removed = [];
const kept = offers.filter((offer) => {
  if (offer.store !== 'Miravia' || offer.source === 'telegram-inbox') return true;
  const community = /^telegram-/u.test(String(offer.source || ''));
  const input = { title: offer.title, price: amount(offer.price), oldPrice: amount(offer.previousPrice) };
  const score = community
    ? miraviaCommunityQualityScore({ ...input, sourceWeight: /una-ganga/u.test(String(offer.source)) ? 24 : 20 })
    : miraviaQualityScore({ ...input, category: offer.category || 'Tecnología', reviews: 0 });
  if (score > 0) return true;
  removed.push({ messageId: offer.message_id, title: offer.title, price: offer.price, source: offer.source });
  return false;
});

fs.writeFileSync(file, `${JSON.stringify(kept, null, 2)}\n`);
console.log(JSON.stringify({ before: offers.length, after: kept.length, removed: removed.length, offers: removed }, null, 2));
