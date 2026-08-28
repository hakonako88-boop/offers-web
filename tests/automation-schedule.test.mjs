import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { publicationAllowance } from '../scripts/publication-policy.mjs';

const workflow = fs.readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
const sourcePollWorkflow = fs.readFileSync(new URL('../.github/workflows/telegram-source-poll.yml', import.meta.url), 'utf8');
const aliExpressSync = fs.readFileSync(new URL('../scripts/sync-aliexpress-deals.mjs', import.meta.url), 'utf8');
const miraviaSync = fs.readFileSync(new URL('../scripts/sync-miravia-deals.mjs', import.meta.url), 'utf8');
const amazonSync = fs.readFileSync(new URL('../scripts/sync-amazon-deals.mjs', import.meta.url), 'utf8');
const inboxSync = fs.readFileSync(new URL('../scripts/process-telegram-inbox.mjs', import.meta.url), 'utf8');
const buttonRepair = fs.readFileSync(new URL('../scripts/repair-telegram-offer-buttons.mjs', import.meta.url), 'utf8');
const welcomePublisher = fs.readFileSync(new URL('../scripts/publish-telegram-welcome.mjs', import.meta.url), 'utf8');
const cloudflareWorker = fs.readFileSync(new URL('../cloudflare-worker/telegram-webhook.js', import.meta.url), 'utf8');

test('uses a ten-minute Cloudflare clock with a staggered GitHub fallback', () => {
  assert.doesNotMatch(workflow, /^\s+schedule:/mu);
  assert.match(sourcePollWorkflow, /cron:\s*"7,37 \* \* \* \*"/u);
  assert.match(sourcePollWorkflow, /types:\s*\[source_poll\]/u);
  assert.match(sourcePollWorkflow, /telegram_sources_changed/u);
  assert.match(cloudflareWorker, /cron === '\*\/10 \* \* \* \*'/u);
  assert.match(cloudflareWorker, /githubDispatch\('source_poll'/u);
  assert.match(cloudflareWorker, /cron === '45 20,21 \* \* \*'/u);
  assert.match(cloudflareWorker, /githubDispatch\('daily_summary'/u);
  assert.doesNotMatch(cloudflareWorker, /automatic_(?:amazon|aliexpress|miravia)/u);
});

test('runs the three stores only after a source change or an explicit manual check', () => {
  const amazonStep = workflow.match(/- name: Buscar y publicar ofertas de Amazon[\s\S]*?run: npm run sync:amazon/u)?.[0] || '';
  const aliStep = workflow.match(/- name: Buscar y publicar ofertas de AliExpress[\s\S]*?run: npm run sync:aliexpress/u)?.[0] || '';
  const miraviaStep = workflow.match(/- name: Buscar y publicar ofertas de Miravia[\s\S]*?run: npm run sync:miravia/u)?.[0] || '';
  assert.match(workflow, /types: \[telegram_update, telegram_sources_changed\]/u);
  assert.match(amazonStep, /telegram_sources_changed/u);
  assert.match(aliStep, /telegram_sources_changed/u);
  assert.match(miraviaStep, /telegram_sources_changed/u);
  assert.match(amazonStep, /AMAZON_CREATOR_CREDENTIAL_ID/u);
  assert.doesNotMatch(workflow, /automatic_amazon/u);
});

test('keeps automatic source runs fast and prevents state commits from redeploying twice', () => {
  assert.match(workflow, /contains\(github\.event\.head_commit\.message, '\[source-watch\]'\)/u);
  assert.match(workflow, /contains\(github\.event\.head_commit\.message, '\[automation-state\]'\)/u);
  assert.match(workflow, /Actualizar ofertas desde Telegram \[automation-state\]/u);
  for (const stepName of [
    'Comprobar acceso seguro a Telegram',
    'Optimizar perfil público del canal de Telegram',
    'Publicar y fijar bienvenida del canal',
    'Retirar publicaciones con datos erróneos',
    'Limpiar pies de foto pendientes en Telegram',
  ]) {
    const escaped = stepName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const step = workflow.match(new RegExp(`- name: ${escaped}[\\s\\S]*?(?=\\n\\s{6}- name:|$)`, 'u'))?.[0] || '';
    assert.match(step, /github\.event_name != 'repository_dispatch'/u);
  }
  const buttonStep = workflow.match(/- name: Corregir botones Ver ficha de Telegram[\s\S]*?(?=\n\s{6}- name:|$)/u)?.[0] || '';
  assert.match(buttonStep, /github\.event_name == 'workflow_dispatch'/u);
  assert.match(buttonStep, /inputs\.repair_telegram_captions/u);
});

test('serializes every Pages deployment and leaves the source queue to the lightweight watcher', () => {
  assert.doesNotMatch(workflow, /chollosaldia-source-publication/u);
  assert.match(workflow, /'chollosaldia-telegram-inbox' \|\| 'chollosaldia-production'/u);
  const saveStep = workflow.match(/- name: Guardar ofertas nuevas[\s\S]*?(?=\n\s{6}- name:|$)/u)?.[0] || '';
  assert.match(saveStep, /git restore -- data\/telegram-source-queue\.json/u);
  const stagedLine = saveStep.split('\n').find((line) => line.includes('git add data/offers.json')) || '';
  assert.doesNotMatch(stagedLine, /data\/telegram-source-queue\.json/u);
  assert.match(stagedLine, /data\/telegram-source-queue-report\.json/u);
});

test('publishes one validated offer in each independently isolated slot', () => {
  assert.match(aliExpressSync, /TELEGRAM_SOURCE_QUEUE_MODE === 'true' \? 3 : 1/u);
  assert.match(miraviaSync, /TELEGRAM_SOURCE_QUEUE_MODE === 'true' \? 3 : 1/u);
  assert.match(amazonSync, /TELEGRAM_SOURCE_QUEUE_MODE === 'true' \? 3 : 1/u);
  assert.match(aliExpressSync, /const MINIMUM_PUBLICATION_INTERVAL_MS = 3 \* 60 \* 60 \* 1000;/u);
  assert.match(miraviaSync, /const MINIMUM_PUBLICATION_INTERVAL_MS = 3 \* 60 \* 60 \* 1000;/u);
  assert.match(workflow, /FORCE_AUTOMATIC_PUBLICATION:.*telegram_sources_changed/u);
  assert.match(workflow, /BYPASS_PUBLICATION_SCHEDULE:.*workflow_dispatch/u);
  assert.match(workflow, /Clasificar mensajes pendientes de los canales/u);
});

test('consumes the Amazon Telegram queue in source-only mode without enabling it for TikTok retries', () => {
  const amazonQueueStep = workflow.match(/- name: Preparar vista previa automática de Amazon[\s\S]*?(?=\n\s{6}- name:|$)/u)?.[0] || '';
  const tiktokRetryStep = workflow.match(/- name: Enviar automáticamente la oferta a borradores de TikTok[\s\S]*?(?=\n\s{6}- name:|$)/u)?.[0] || '';
  assert.match(amazonQueueStep, /TELEGRAM_PENDING_ONLY:\s*"true"/u);
  assert.match(amazonQueueStep, /TELEGRAM_PROCESS_AMAZON_QUEUE:\s*"true"/u);
  assert.match(amazonQueueStep, /inputs\.run_automatic_source == 'amazon'/u);
  assert.doesNotMatch(tiktokRetryStep, /TELEGRAM_PROCESS_AMAZON_QUEUE/u);
  assert.match(inboxSync, /if \(!pendingOnly \|\| settings\.processAmazonQueue\)/u);
});

test('uses the same stable product id for Telegram buttons and website records', () => {
  assert.match(amazonSync, /presentationOffer = \{ \.\.\.offer, id: `amazon-\$\{offer\.asin\}`/u);
  assert.match(inboxSync, /websiteOfferId = offer\.sourceProductId \|\| offer\.id/u);
  assert.match(inboxSync, /source_product_id: websiteOfferId/u);
  assert.match(workflow, /Corregir botones Ver ficha de Telegram/u);
  assert.match(buttonRepair, /editMessageReplyMarkup/u);
  assert.match(buttonRepair, /offerReplyMarkup/u);
});

test('shows a compact preview and reveals editing controls only on demand', () => {
  assert.match(inboxSync, /text: '✅ PUBLICAR'.*callback_data: 'offer:confirm'/u);
  assert.match(inboxSync, /text: '✏️ EDITAR'.*callback_data: 'offer:edit-menu'/u);
  assert.match(inboxSync, /callback\.data === 'offer:edit-menu'.*callback\.data === 'offer:edit-back'/su);
  assert.doesNotMatch(inboxSync, /✅ CONFIRMAR PUBLICACIÓN'.*inline_keyboard/su);
});

test('publishes the channel welcome only once and pins it without notifying subscribers', () => {
  assert.match(workflow, /Publicar y fijar bienvenida del canal/u);
  assert.match(welcomePublisher, /pinChatMessage/u);
  assert.match(welcomePublisher, /disable_notification: true/u);
  assert.match(welcomePublisher, /Telegram welcome already published/u);
  assert.match(welcomePublisher, /COMPARTIR EL CANAL/u);
});

test('spreads publications through Madrid daytime and enforces retailer caps', () => {
  const night = publicationAllowance({ store: 'Amazon', now: new Date('2026-08-28T03:00:00+02:00') });
  assert.equal(night.reason, 'quiet-hours');
  const offers = Array.from({ length: 2 }, () => ({
    store: 'Miravia',
    date: Math.floor(Date.parse('2026-08-28T13:00:00+02:00') / 1000),
  }));
  const capped = publicationAllowance({ store: 'Miravia', offers, now: new Date('2026-08-28T21:00:00+02:00') });
  assert.equal(capped.reason, 'store-daily-limit');
  assert.equal(publicationAllowance({ store: 'Miravia', offers, now: new Date(), bypass: true }).allowed, true);
});
