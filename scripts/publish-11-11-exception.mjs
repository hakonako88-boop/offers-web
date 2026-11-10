import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { isGamingOffer } from './editorial-interest.mjs';
import { isSourceItemReady } from './source-retry-policy.mjs';

const day = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
if (day !== '2026-11-11') throw new Error('La excepción solo está autorizada para el 11.11 de 2026.');
const queue = JSON.parse(fs.readFileSync('data/telegram-source-queue.json','utf8'));
const selected = queue.items.filter(item => item.source === 'telegram-tecnofertastop' && item.store === 'AliExpress'
  && isSourceItemReady(item,new Date()) && !isGamingOffer({title:item.text}))
  .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,3);
if (!selected.length) console.log('No hay ofertas individuales elegibles de TecnOfertasTop; no se fuerza contenido incompleto.');
for (const item of selected) {
  console.log(`Revisando oferta exacta: ${item.id}`);
  const result = spawnSync(process.execPath,['scripts/sync-aliexpress-deals.mjs'],{
    stdio:'inherit',env:{...process.env,REQUESTED_SOURCE_ITEM_ID:item.id,FORCE_AUTOMATIC_PUBLICATION:'true',BYPASS_PUBLICATION_SCHEDULE:'true',TELEGRAM_SOURCE_QUEUE_MODE:'true'},
    timeout:240000,
  });
  if (result.status !== 0) console.warn(`No terminó correctamente la revisión de ${item.id}; no se reenvía sin verificar.`);
}
