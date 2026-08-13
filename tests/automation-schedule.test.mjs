import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
const aliExpressSync = fs.readFileSync(new URL('../scripts/sync-aliexpress-deals.mjs', import.meta.url), 'utf8');
const miraviaSync = fs.readFileSync(new URL('../scripts/sync-miravia-deals.mjs', import.meta.url), 'utf8');

test('uses the five requested daytime automatic slots', () => {
  const crons = [...workflow.matchAll(/^\s*- cron:\s*"([^"]+)"/gmu)].map((match) => match[1]);
  assert.deepEqual(crons, [
    '0 7 * * *',
    '0 9 * * *',
    '0 11 * * *',
    '0 13 * * *',
    '0 15 * * *',
  ]);
});

test('keeps Amazon outside every scheduled publication', () => {
  const amazonStep = workflow.match(/- name: Buscar y publicar ofertas de Amazon[\s\S]*?run: npm run sync:amazon/u)?.[0] || '';
  assert.doesNotMatch(amazonStep, /github\.event_name == 'schedule'/u);
  assert.doesNotMatch(workflow, /automatic_amazon/u);
});

test('allows up to three validated offers per AliExpress and Miravia slot', () => {
  assert.match(aliExpressSync, /const MAX_POSTS_PER_RUN = 3;/u);
  assert.match(miraviaSync, /const MAX_POSTS_PER_RUN = 3;/u);
  assert.match(aliExpressSync, /const MINIMUM_PUBLICATION_INTERVAL_MS = 3 \* 60 \* 60 \* 1000;/u);
  assert.match(miraviaSync, /const MINIMUM_PUBLICATION_INTERVAL_MS = 3 \* 60 \* 60 \* 1000;/u);
});
