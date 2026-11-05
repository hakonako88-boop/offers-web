import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('selected reference is an interactive storefront with truthful alerts and real deal data', () => {
  const home = fs.readFileSync('app/components/DealExplorer.tsx', 'utf8');
  const css = fs.readFileSync('app/reference-storefront.css', 'utf8');
  assert.match(home, /Las mejores ofertas<br \/>y <em>chollos del día/);
  assert.match(home, /Recibe las ofertas en nuestro canal gratuito de Telegram/);
  assert.match(home, /setCouponOnly\(value === 'cupones'\)/);
  assert.match(home, /aria-label="Ordenar ofertas"/);
  assert.match(home, /money.format\(deal.price\)/);
  assert.match(css, /repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /max-width:600px/);
  assert.ok(fs.statSync('public/images/shopping-hero-2026.webp').size < 150_000);
  const layout = fs.readFileSync('app/layout.tsx', 'utf8');
  assert.ok(layout.indexOf('reference-storefront.css') > layout.indexOf('mobile-offer-cards.css'));
});
