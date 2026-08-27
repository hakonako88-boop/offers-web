import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
const sourcePollWorkflow = fs.readFileSync(new URL('../.github/workflows/telegram-source-poll.yml', import.meta.url), 'utf8');
const aliExpressSync = fs.readFileSync(new URL('../scripts/sync-aliexpress-deals.mjs', import.meta.url), 'utf8');
const miraviaSync = fs.readFileSync(new URL('../scripts/sync-miravia-deals.mjs', import.meta.url), 'utf8');
const amazonSync = fs.readFileSync(new URL('../scripts/sync-amazon-deals.mjs', import.meta.url), 'utf8');
const inboxSync = fs.readFileSync(new URL('../scripts/process-telegram-inbox.mjs', import.meta.url), 'utf8');
const buttonRepair = fs.readFileSync(new URL('../scripts/repair-telegram-offer-buttons.mjs', import.meta.url), 'utf8');
const welcomePublisher = fs.readFileSync(new URL('../scripts/publish-telegram-welcome.mjs', import.meta.url), 'utf8');
const cloudflareWorker = fs.readFileSync(new URL('../cloudflare-worker/telegram-webhook.js', import.meta.url), 'utf8');

test('removes fixed publication times and checks channels every five minutes', () => {
  assert.doesNotMatch(workflow, /^\s+schedule:/mu);
  assert.match(sourcePollWorkflow, /cron:\s*"\*\/5 \* \* \* \*"/u);
  assert.match(sourcePollWorkflow, /types:\s*\[source_poll\]/u);
  assert.match(sourcePollWorkflow, /telegram_sources_changed/u);
  assert.match(cloudflareWorker, /cron !== '\*\/5 \* \* \* \*'/u);
  assert.match(cloudflareWorker, /githubDispatch\('source_poll'/u);
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

test('publishes one validated offer in each independently isolated slot', () => {
  assert.match(aliExpressSync, /TELEGRAM_SOURCE_QUEUE_MODE === 'true' \? 3 : 1/u);
  assert.match(miraviaSync, /TELEGRAM_SOURCE_QUEUE_MODE === 'true' \? 3 : 1/u);
  assert.match(amazonSync, /TELEGRAM_SOURCE_QUEUE_MODE === 'true' \? 3 : 1/u);
  assert.match(aliExpressSync, /const MINIMUM_PUBLICATION_INTERVAL_MS = 3 \* 60 \* 60 \* 1000;/u);
  assert.match(miraviaSync, /const MINIMUM_PUBLICATION_INTERVAL_MS = 3 \* 60 \* 60 \* 1000;/u);
  assert.match(workflow, /FORCE_AUTOMATIC_PUBLICATION:.*telegram_sources_changed/u);
  assert.match(workflow, /Clasificar mensajes pendientes de los canales/u);
});

test('uses the same stable product id for Telegram buttons and website records', () => {
  assert.match(amazonSync, /presentationOffer = \{ \.\.\.offer, id: `amazon-\$\{offer\.asin\}`/u);
  assert.match(inboxSync, /websiteOfferId = offer\.sourceProductId \|\| offer\.id/u);
  assert.match(inboxSync, /source_product_id: websiteOfferId/u);
  assert.match(workflow, /Corregir botones Ver ficha de Telegram/u);
  assert.match(buttonRepair, /editMessageReplyMarkup/u);
  assert.match(buttonRepair, /offerReplyMarkup/u);
});

test('publishes the channel welcome only once and pins it without notifying subscribers', () => {
  assert.match(workflow, /Publicar y fijar bienvenida del canal/u);
  assert.match(welcomePublisher, /pinChatMessage/u);
  assert.match(welcomePublisher, /disable_notification: true/u);
  assert.match(welcomePublisher, /Telegram welcome already published/u);
  assert.match(welcomePublisher, /COMPARTIR EL CANAL/u);
});
