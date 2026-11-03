import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('shared secondary-page design follows legacy styles', () => {
  const layout = read('app/layout.tsx');
  assert.ok(layout.indexOf('./pages-modern.css') > layout.indexOf('./brand.css'));
  const css = read('app/pages-modern.css');
  for (const scope of ['.offerPage','.storePage','.postPage','.guidePage','.productPage','.legalPage','.campaign26']) assert.ok(css.includes(scope));
  assert.match(css, /--page-price:#c52c44/);
  assert.match(css, /\.campaign26Card\{display:flex;flex-direction:column\}/);
});
test('campaign uses shared home brand and explicit calendar dates', () => {
  const campaign = read('app/black-friday-2026/CampaignExperience.tsx');
  assert.match(campaign, /<BrandLink \/>/);
  assert.match(campaign, /className="campaign26Date">27/);
  assert.match(campaign, /className="campaign26Date">30/);
  assert.ok(campaign.includes('Ningún producto de esta selección se presenta como promoción confirmada'));
});
