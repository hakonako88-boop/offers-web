import fs from 'node:fs';
import path from 'node:path';
import { resolveAliExpressAffiliateProduct } from './aliexpress-link-resolver.mjs';

const ROOT = process.cwd();
const OUTPUT_FILE = path.join(ROOT, 'data', 'aliexpress-api-health.json');
// A catalogue item is used only to verify the account integration. It is not
// published, and no secret or API request signature is ever written to disk.
const HEALTHCHECK_PRODUCT_URL = 'https://es.aliexpress.com/item/1005012274395427.html';

const config = {
  appKey: process.env.ALIEXPRESS_APP_KEY,
  appSecret: process.env.ALIEXPRESS_APP_SECRET,
  trackingId: process.env.ALIEXPRESS_TRACKING_ID,
};

const required = Object.entries({
  ALIEXPRESS_APP_KEY: config.appKey,
  ALIEXPRESS_APP_SECRET: config.appSecret,
  ALIEXPRESS_TRACKING_ID: config.trackingId,
}).filter(([, value]) => !String(value || '').trim()).map(([name]) => name);

const status = {
  checkedAt: new Date().toISOString(),
  productId: '1005012274395427',
  healthy: false,
  missingConfiguration: required,
  identityVerified: false,
  affiliateLinkGenerated: false,
  issues: [],
};

if (!required.length) {
  try {
    const result = await resolveAliExpressAffiliateProduct(HEALTHCHECK_PRODUCT_URL, config);
    status.identityVerified = Boolean(result.identityVerified && result.productId === status.productId);
    status.affiliateLinkGenerated = /^https?:\/\//iu.test(String(result.affiliateUrl || ''));
    status.healthy = status.identityVerified && status.affiliateLinkGenerated;
    status.issues = (result.resolutionIssues || []).map((issue) => String(issue).slice(0, 240)).slice(0, 5);
    if (!status.healthy && !status.issues.length) status.issues = ['La API no devolvió una ficha verificable y un enlace afiliado para el producto de prueba'];
  } catch (error) {
    status.issues = [String(error instanceof Error ? error.message : error).slice(0, 240)];
  }
}

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(status, null, 2)}\n`);
console.log(`AliExpress API health: ${status.healthy ? 'healthy' : 'needs-attention'}.`);
