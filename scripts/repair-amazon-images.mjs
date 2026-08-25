import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDealImageCard } from './deal-image-card.mjs';
import { amazonPageImage, telegramPostImage } from './amazon-review-drafts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OFFERS_FILE = path.join(ROOT, 'data', 'offers.json');
const QUEUE_FILE = path.join(ROOT, 'data', 'telegram-source-queue.json');

const offers = JSON.parse(fs.readFileSync(OFFERS_FILE, 'utf8'));
const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')).items || [];
const byTelegramMessage = new Map(queue.filter((item) => item.telegramMessageId).map((item) => [Number(item.telegramMessageId), item]));
const requestedFiles = new Set(process.argv.slice(2).map((value) => path.basename(value)));

let repaired = 0;
let failed = 0;
for (const offer of offers.filter((item) => item.store === 'Amazon' && item.image?.startsWith('/tg/'))) {
  const target = path.join(ROOT, 'public', offer.image.replace(/^\//u, ''));
  const size = fs.existsSync(target) ? fs.statSync(target).size : 0;
  if (requestedFiles.size ? !requestedFiles.has(path.basename(target)) : size >= 2_000) continue;
  const source = byTelegramMessage.get(Number(offer.message_id));
  const imageUrl = await amazonPageImage(offer.url) || await telegramPostImage(source?.sourceUrl || '');
  if (!imageUrl) {
    console.error(`Sin imagen fuente: ${offer.message_id} ${offer.title}`);
    failed += 1;
    continue;
  }
  try {
    const price = String(offer.price || '');
    const previousPrice = String(offer.previousPrice || '');
    const current = Number(price.replace(/[^0-9,]/gu, '').replace(',', '.')) || 0;
    const previous = Number(previousPrice.replace(/[^0-9,]/gu, '').replace(',', '.')) || 0;
    const discount = previous > current && current > 0 ? Math.round(((previous - current) / previous) * 100) : 0;
    const card = await createDealImageCard({ imageUrl, store: 'Amazon', price, previousPrice, discount });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, card);
    console.log(`Reparada: ${offer.message_id} (${card.length} bytes)`);
    repaired += 1;
  } catch (error) {
    console.error(`Error ${offer.message_id}: ${error.message}`);
    failed += 1;
  }
}

console.log(JSON.stringify({ repaired, failed }));
if (failed) process.exitCode = 1;
