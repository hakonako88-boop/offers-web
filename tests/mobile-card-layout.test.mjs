import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const css = fs.readFileSync(new URL('../app/radar.css', import.meta.url), 'utf8');
const rule = (selector) => css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] || '';

test('all deal cards explicitly use a vertical layout, not only the featured card', () => {
  assert.match(rule('.dealHome .dealCard'), /display:flex/);
  assert.match(rule('.dealHome .dealCard'), /flex-direction:column/);
  for (const selector of ['.dealHome .dealCard .imageWrap', '.dealHome .dealCard .dealBody']) {
    assert.match(rule(selector), /grid-row:auto/);
    assert.match(rule(selector), /width:100%/);
  }
  assert.match(rule('.dealHome .dealCard .imageWrap'), /flex:none/);
});

test('current and reference prices remain explicit visible blocks on mobile', () => {
  assert.match(rule('.dealHome .dealCard .priceCurrent'), /display:grid/);
  assert.match(rule('.dealHome .dealCard .priceRow .priceWas'), /display:grid/);
});
