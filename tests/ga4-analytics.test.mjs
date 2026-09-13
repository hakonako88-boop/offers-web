import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync } from 'node:crypto';
import { createGoogleAssertion, readGa4Metrics, serviceAccountFromEnvironment } from '../scripts/sync-ga4-analytics.mjs';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const account = { client_email: 'analytics@example.iam.gserviceaccount.com', private_key: privateKey };

test('accepts service account JSON or base64 and creates a signed assertion', () => {
  assert.equal(serviceAccountFromEnvironment(Buffer.from(JSON.stringify(account)).toString('base64')).client_email, account.client_email);
  assert.equal(createGoogleAssertion(account, 1000).split('.').length, 3);
});

test('reads aggregate GA4 metrics without exposing visitor identities', async () => {
  const replies = [
    { access_token: 'token' }, { rows: [{ metricValues: [{ value: '3' }] }] },
    { rows: [{ metricValues: [{ value: '120' }, { value: '180' }, { value: '440' }] }] },
    { rows: [{ dimensionValues: [{ value: 'Oferta' }, { value: '/oferta/1/' }], metricValues: [{ value: '90' }] }] },
    { rows: [{ dimensionValues: [{ value: 'Organic Search' }], metricValues: [{ value: '70' }] }] },
  ];
  const fetchImpl = async () => new Response(JSON.stringify(replies.shift()), { status: 200, headers: { 'content-type': 'application/json' } });
  const report = await readGa4Metrics({ propertyId: '123456789', account, fetchImpl });
  assert.deepEqual({ active: report.activeUsers, users: report.users7d, sessions: report.sessions7d, views: report.pageViews7d }, { active: 3, users: 120, sessions: 180, views: 440 });
  assert.equal(report.topPages[0].path, '/oferta/1/');
  assert.equal(report.trafficSources[0].source, 'Organic Search');
});
