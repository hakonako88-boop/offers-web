import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('Tesla remains directly accessible outside the collapsed mobile menu',()=>{
 const source=fs.readFileSync('app/components/DealExplorer.tsx','utf8');
 const css=fs.readFileSync('app/tesla-entry.css','utf8');
 assert.match(source,/className="teslaMobileShortcut" href="\/tesla\/"/);
 assert.ok(source.indexOf('className="teslaMobileShortcut"')<source.indexOf('<details className="mobileNav"'));
 assert.match(css,/@media\(max-width:1000px\)/);
 assert.match(css,/\.headerInner>\.teslaMobileShortcut\{display:inline-flex/);
 assert.match(css,/\.mobileNav>summary\{background:#fff;color:#073c35/);
});
