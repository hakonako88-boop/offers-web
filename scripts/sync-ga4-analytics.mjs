import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT = path.join(process.cwd(), 'data', 'web-analytics.json');

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

export function serviceAccountFromEnvironment(value = process.env.GA4_SERVICE_ACCOUNT_JSON || '') {
  const raw = String(value).trim();
  if (!raw) throw new Error('Falta GA4_SERVICE_ACCOUNT_JSON.');
  const decoded = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const account = JSON.parse(decoded);
  if (!account.client_email || !account.private_key) throw new Error('La cuenta de servicio de GA4 está incompleta.');
  return account;
}

export function createGoogleAssertion(account, now = Math.floor(Date.now() / 1000)) {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), account.private_key).toString('base64url');
  return `${unsigned}.${signature}`;
}

function metric(row, index) {
  return Number(row?.metricValues?.[index]?.value) || 0;
}

async function jsonRequest(fetchImpl, url, options) {
  const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(20_000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Google Analytics respondió ${response.status}.`);
  return data;
}

export async function readGa4Metrics({ propertyId, account, fetchImpl = fetch }) {
  if (!/^\d+$/u.test(String(propertyId || ''))) throw new Error('GA4_PROPERTY_ID debe ser el número de la propiedad, no el ID G- de medición.');
  const tokenResponse = await jsonRequest(fetchImpl, 'https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: createGoogleAssertion(account) }),
  });
  const headers = { authorization: `Bearer ${tokenResponse.access_token}`, 'content-type': 'application/json' };
  const base = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}`;
  const [realtime, period, pages, sources] = await Promise.all([
    jsonRequest(fetchImpl, `${base}:runRealtimeReport`, { method: 'POST', headers, body: JSON.stringify({ metrics: [{ name: 'activeUsers' }] }) }),
    jsonRequest(fetchImpl, `${base}:runReport`, { method: 'POST', headers, body: JSON.stringify({ dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }], metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }] }) }),
    jsonRequest(fetchImpl, `${base}:runReport`, { method: 'POST', headers, body: JSON.stringify({ dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }], dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 5 }) }),
    jsonRequest(fetchImpl, `${base}:runReport`, { method: 'POST', headers, body: JSON.stringify({ dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 5 }) }),
  ]);
  return {
    connected: true, activeUsers: metric(realtime.rows?.[0], 0), users7d: metric(period.rows?.[0], 0),
    sessions7d: metric(period.rows?.[0], 1), pageViews7d: metric(period.rows?.[0], 2),
    topPages: (pages.rows || []).map((row) => ({ title: row.dimensionValues?.[0]?.value || 'Página', path: row.dimensionValues?.[1]?.value || '/', views: metric(row, 0) })),
    trafficSources: (sources.rows || []).map((row) => ({ source: row.dimensionValues?.[0]?.value || 'Otros', sessions: metric(row, 0) })),
    updatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await readGa4Metrics({ propertyId: process.env.GA4_PROPERTY_ID, account: serviceAccountFromEnvironment() });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`GA4 actualizado: ${report.activeUsers} activos y ${report.users7d} usuarios en 7 días.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
