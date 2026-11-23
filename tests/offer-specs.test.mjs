import test from 'node:test';
import assert from 'node:assert/strict';
import {offerSpecs} from '../scripts/offer-specs.mjs';
test('retains qualifiers, decimal values and variants',()=>{
  assert.deepEqual(offerSpecs('Modelo A | hasta 30 horas | 5,5 litros | 128 GB o 256 GB'),['hasta 30 horas','5,5 litros','128 GB o 256 GB']);
  assert.deepEqual(offerSpecs('Modelo A | Oferta 19 € | color negro'),[]);
});
