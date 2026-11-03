import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('../app/', import.meta.url));
const component = fs.readFileSync(new URL('../app/components/BrandLink.tsx', import.meta.url), 'utf8');
test('brand always navigates to the home page with a static-safe anchor', () => {
  assert.match(component, /<a[^>]+href="\/"/);
  assert.doesNotMatch(component, /href="#inicio"/);
  assert.match(component, /aria-label="Chollos al Día, inicio"/);
  assert.match(component, /brand-mark-2026\.svg/);
});
test('all former header and footer logos use the shared link', () => {
  let count = 0;
  function inspect(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) { inspect(file); continue; }
      if (!file.endsWith('.tsx')) continue;
      const source = fs.readFileSync(file, 'utf8');
      assert.doesNotMatch(source, /className="brand"\s+href=/, file);
      count += [...source.matchAll(/<BrandLink\s*\/>/gu)].length;
    }
  }
  inspect(appRoot);
  assert.ok(count >= 18, `Only ${count} logo positions were migrated`);
});
test('new favicon and header symbol use the same mark', () => {
  const icon = fs.readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
  const symbol = fs.readFileSync(new URL('../public/brand-mark-2026.svg', import.meta.url), 'utf8');
  for (const color of ['#17393b', '#fffaf0', '#ff845a']) {
    assert.ok(icon.includes(color) && symbol.includes(color));
  }
  const ico = fs.readFileSync(new URL('../public/favicon.ico', import.meta.url));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico[6], 48);
});
