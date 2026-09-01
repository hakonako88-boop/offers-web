import fs from 'node:fs';
import path from 'node:path';
import { couponCodesFromText } from './community-signals.mjs';

const ROOT = process.cwd();
const OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const QUEUE_FILE = path.join(ROOT, 'data', 'telegram-source-queue.json');
const REPAIRS_FILE = path.join(ROOT, 'data', 'telegram-caption-repairs.json');

const read = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

const offers = read(OFFERS_FILE, []);
const queue = read(QUEUE_FILE, { items: [] });
const repairs = read(REPAIRS_FILE, { messageIds: [] });
const sourceByUrl = new Map((queue.items || [])
  .filter((item) => item.status === 'published' && item.sourceUrl)
  .map((item) => [String(item.sourceUrl), item]));
const repairedMessageIds = new Set((repairs.messageIds || []).map(Number).filter(Number.isInteger));
let updated = 0;

for (const offer of offers) {
  if (String(offer.store || '') !== 'AliExpress' || String(offer.coupon || '').trim()) continue;
  const source = sourceByUrl.get(String(offer.source_url || ''));
  if (!source) continue;
  const coupon = couponCodesFromText(source.text || '');
  if (!coupon) continue;
  offer.coupon = coupon;
  if (Number.isInteger(Number(offer.message_id))) repairedMessageIds.add(Number(offer.message_id));
  updated += 1;
}

write(OFFERS_FILE, offers);
write(REPAIRS_FILE, { messageIds: [...repairedMessageIds].sort((left, right) => left - right) });
console.log(`Cupones recuperados: ${updated}; publicaciones de Telegram pendientes de actualizar: ${repairedMessageIds.size}.`);
