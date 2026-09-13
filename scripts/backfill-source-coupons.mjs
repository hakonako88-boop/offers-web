import fs from 'node:fs';
import path from 'node:path';
import { couponForPrice } from './community-signals.mjs';

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
  if (String(offer.store || '') !== 'AliExpress') continue;
  const source = sourceByUrl.get(String(offer.source_url || ''));
  if (!source) continue;
  const amount = (value) => Number.parseFloat(String(value || '').replace(/[^0-9,.-]/gu, '').replace(',', '.')) || 0;
  const selected = couponForPrice(source.text || '', amount(offer.price), amount(offer.previousPrice));
  const current = String(offer.coupon || '').trim();
  const knownFalseCoupon = /(?:SEPTIEMBRE|PRECIACOS|NINTENDO|SWITCH|LISTADO|NUEVOS)/iu.test(current);
  if (!selected && !knownFalseCoupon) continue;
  offer.coupon = selected?.code || '';
  if (selected?.discount) offer.couponDiscount = selected.discount;
  if (selected?.minimumSpend) offer.couponMinimumSpend = selected.minimumSpend;
  if (!selected) {
    delete offer.couponDiscount;
    delete offer.couponMinimumSpend;
  }
  if (Number.isInteger(Number(offer.message_id))) repairedMessageIds.add(Number(offer.message_id));
  updated += 1;
}

write(OFFERS_FILE, offers);
write(REPAIRS_FILE, { messageIds: [...repairedMessageIds].sort((left, right) => left - right) });
console.log(`Cupones recuperados: ${updated}; publicaciones de Telegram pendientes de actualizar: ${repairedMessageIds.size}.`);
