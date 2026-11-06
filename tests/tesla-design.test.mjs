import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('Tesla has an isolated automotive visual layer and real section navigation',async()=>{
 const page=await readFile(new URL('../app/tesla/page.tsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../app/tesla/tesla-design.css',import.meta.url),'utf8');
 assert.match(page,/import '\.\/tesla-design\.css'/);
 for(const id of ['ofertas-hoy','vehiculo','productos-recibidos','amazon']) assert.ok(page.includes(`href="#${id}"`));
 assert.match(css,/background:#073c34/); assert.match(css,/color:#fff9ec/);
 assert.match(css,/\.teslaLivePrice strong/); assert.match(css,/@media\(max-width:650px\)/);
 assert.doesNotMatch(css,/animation:|display:none/);
});
