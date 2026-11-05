import test from 'node:test';
import assert from 'node:assert/strict';
import { offerFreshness } from '../scripts/offer-freshness.mjs';

test('publication freshness uses minutes and hours without inventing verification', () => {
  const now = Date.parse('2026-11-05T12:00:00Z');
  assert.equal(offerFreshness('2026-11-05T12:00:00Z', now), 'Publicada ahora');
  assert.equal(offerFreshness('2026-11-05T11:59:00Z', now), 'Hace 1 minuto');
  assert.equal(offerFreshness('2026-11-05T10:00:00Z', now), 'Hoy · hace 2 horas');
  assert.equal(offerFreshness('2026-11-04T11:00:00Z', now), 'Ayer');
  assert.equal(offerFreshness('2026-11-02T11:00:00Z', now), 'Hace 3 días');
});
test('invalid and future publication dates are not presented as fresh', () => {
  assert.equal(offerFreshness('invalid'), null);
  assert.equal(offerFreshness('2026-11-06T10:00:00Z', Date.parse('2026-11-05T10:00:00Z')), null);
});
test('Madrid calendar midnight and daylight saving changes', () => {
  assert.equal(offerFreshness('2026-11-04T22:00:00Z', Date.parse('2026-11-04T23:30:00Z')), 'Ayer');
  assert.equal(offerFreshness('2026-10-24T21:00:00Z', Date.parse('2026-10-25T22:30:00Z')), 'Ayer');
});
