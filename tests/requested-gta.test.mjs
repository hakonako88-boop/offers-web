import test from 'node:test';
import assert from 'node:assert/strict';
import { requestedGta, requestedGtaCaption } from '../scripts/publish-requested-gta.mjs';
test('requested reservation uses owner affiliate and exact variant, with conditional price',()=>{
  const link=new URL(requestedGta.url);
  assert.equal(link.searchParams.get('awinaffid'),'2023977');
  assert.equal(link.searchParams.get('awinmid'),'37168');
  assert.equal(link.searchParams.get('ued'),'https://www.miravia.es/p/i1374712289389270-s6187750476753622.html');
  assert(!requestedGta.url.includes('1204190'));
  assert(requestedGta.description.startsWith('Precio condicionado:'));
  assert.match(requestedGtaCaption,/sin disco/);
  assert.match(requestedGtaCaption,/76,63/);
  assert.match(requestedGtaCaption,/69,63/);
  assert(!requestedGta.coupon.includes('ESFS'));
});
