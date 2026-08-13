import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
const aliExpressSync = fs.readFileSync(new URL('../scripts/sync-aliexpress-deals.mjs', import.meta.url), 'utf8');
const miraviaSync = fs.readFileSync(new URL('../scripts/sync-miravia-deals.mjs', import.meta.url), 'utf8');

test('registers twenty Madrid slots in five alternating batches', () => {
  const crons = [...workflow.matchAll(/\bcron:\s*"([^"]+)"/gmu)].map((match) => match[1]);
  assert.deepEqual(crons, [
    '0 9 * * *', '4 9 * * *', '8 9 * * *', '12 9 * * *',
    '30 11 * * *', '34 11 * * *', '38 11 * * *', '42 11 * * *',
    '30 14 * * *', '34 14 * * *', '38 14 * * *', '42 14 * * *',
    '30 18 * * *', '34 18 * * *', '38 18 * * *', '42 18 * * *',
    '30 21 * * *', '34 21 * * *', '38 21 * * *', '42 21 * * *',
  ]);
  assert.equal((workflow.match(/timezone:\s*"Europe\/Madrid"/gu) || []).length, 20);
});

test('keeps Amazon outside every scheduled publication', () => {
  const amazonStep = workflow.match(/- name: Buscar y publicar ofertas de Amazon[\s\S]*?run: npm run sync:amazon/u)?.[0] || '';
  assert.doesNotMatch(amazonStep, /github\.event_name == 'schedule'/u);
  assert.doesNotMatch(workflow, /automatic_amazon/u);
});

test('publishes one validated offer in each independently isolated slot', () => {
  assert.match(aliExpressSync, /const MAX_POSTS_PER_RUN = 1;/u);
  assert.match(miraviaSync, /const MAX_POSTS_PER_RUN = 1;/u);
  assert.match(aliExpressSync, /const MINIMUM_PUBLICATION_INTERVAL_MS = 3 \* 60 \* 60 \* 1000;/u);
  assert.match(miraviaSync, /const MINIMUM_PUBLICATION_INTERVAL_MS = 3 \* 60 \* 60 \* 1000;/u);
  assert.match(workflow, /FORCE_AUTOMATIC_PUBLICATION:.*github\.event_name == 'schedule'/u);
  assert.match(workflow, /startsWith\(github\.event\.schedule, '0 '\)/u);
  assert.match(workflow, /startsWith\(github\.event\.schedule, '4 '\)/u);
});
