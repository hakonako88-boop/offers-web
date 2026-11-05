import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('three readable columns and one shortlist move beside the catalogue only on wide screens', () => {
  const css = fs.readFileSync('app/catalogue-sidebar.css', 'utf8');
  const home = fs.readFileSync('app/components/DealExplorer.tsx', 'utf8');
  assert.match(css, /min-width:1280px/);
  assert.match(css, /repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) 252px/);
  assert.match(css, /min-height:1000px/);
  assert.equal(home.split('{featuredSelection}').length - 1, 1);
  const selected = fs.readFileSync('app/components/FeaturedSelection.tsx', 'utf8');
  assert.match(selected, /<OfferFreshness date=\{deal.verifiedDate\}/);
  assert.match(selected, /Chollos destacados/);
});
