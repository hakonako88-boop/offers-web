import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const home=fs.readFileSync('app/components/DealExplorer.tsx','utf8');
const selected=fs.readFileSync('app/components/FeaturedSelection.tsx','utf8');
test('buyer sees search, optional coupons and shortlist before full catalogue',()=>{
  const hero=home.indexOf('<section className="hero buyerIntro');
  const catalogue=home.indexOf('id="ofertas"',hero);
  const shortlist=home.indexOf('{featuredSelection}',hero);
  const campaigns=home.indexOf('id="campanas"',catalogue);
  assert(hero>0 && shortlist>hero && catalogue>shortlist && campaigns>catalogue);
  assert(home.includes('<aside className="homeHighlights catalogueHighlights shell"'));
  assert(home.indexOf('<FeaturedCoupons') < shortlist);
  assert(!home.includes('className="heroFeature"'));
});
test('shortlist has one clear detail CTA and no nested coupon actions',()=>{
  assert(selected.includes('Ver oferta <span'));
  assert(!selected.includes('<CouponCopy'));
  assert(selected.includes('Con cupón · consulta condiciones'));
  assert(selected.includes('href="#ofertas"'));
});
