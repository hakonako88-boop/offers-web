import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {seasonalBanners} from '../scripts/seasonal-banners.mjs';
test('November homepage links to both real campaign pages without invented discounts',()=>{
 const cards=seasonalBanners(new Date('2026-11-09T12:00:00Z'));
 assert.equal(cards.length,2);
 assert.deepEqual(cards.map(card=>card.href),['/black-friday-2026/','/publicacion/aliexpress-11-11-2026-cupones-ofertas/']);
 assert.doesNotMatch(JSON.stringify(cards),/\d+%|hasta \d+|garantizado/i);
 const page=fs.readFileSync('app/page.tsx','utf8');assert.match(page,/campaignBanners=\{<SeasonalBanners/);
});
test('campaign banners retire after their own end date in Madrid',()=>{
 assert.deepEqual(seasonalBanners(new Date('2026-11-18T23:01:00Z')).map(card=>card.id),['black-friday']);
 assert.equal(seasonalBanners(new Date('2026-11-30T23:01:00Z')).length,0);
 assert.equal(seasonalBanners(new Date('2026-10-20T12:00:00Z')).length,0);
 assert.equal(seasonalBanners(new Date('2026-11-30T12:00:00Z'))[0].title,'Cyber Monday');
});
test('banners use crawlable readable headings, mobile styles and reduced motion',()=>{
 const component=fs.readFileSync('app/components/SeasonalBanners.tsx','utf8');
 const css=fs.readFileSync('app/seasonal-banners.css','utf8');
 assert.match(component,/<a key=/);assert.match(component,/<h2>/);
 assert.match(component,/aria-hidden="true"/);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(component,/<img|<canvas|dangerouslySetInnerHTML/);
});
