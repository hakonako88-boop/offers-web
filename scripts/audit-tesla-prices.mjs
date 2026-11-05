import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { ALIEXPRESS_ENDPOINT, createAliExpressSignature } from './aliexpress-offers.mjs';
import { discoveryTopics, growDiscoveryCatalogue } from './tesla-discovery.mjs';
import { appendTeslaHistory } from './tesla-daily-selection.mjs';

// Read-only affiliate API audit. Does not generate replacement links or publish anything.
const catalogue = JSON.parse(await readFile(new URL('../data/tesla-catalogue.json', import.meta.url), 'utf8'));
const output = { checkedAt: new Date().toISOString(), country: 'ES', currency: 'EUR', source: 'AliExpress affiliate API', items: [], discoveries: [], issues: [] };
const appKey = process.env.ALIEXPRESS_APP_KEY;
const appSecret = process.env.ALIEXPRESS_APP_SECRET;
const trackingId = process.env.ALIEXPRESS_TRACKING_ID;
const discoveryConfig = JSON.parse(await readFile(new URL('../data/tesla-discovery-config.json', import.meta.url), 'utf8'));
const approvedDiscoveryIds = discoveryConfig.reviewedAliExpressIds;
let previous = { items: [], discoveries: [] };
try { previous = JSON.parse(await readFile(new URL('../data/tesla-price-observations.json', import.meta.url), 'utf8')); } catch { /* First audit has no previous observations. */ }
async function requestOnce(method, fields) {
  const params = { app_key: appKey, format: 'json', method, sign_method: 'sha256', timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '), v: '2.0', ...fields };
  const signed = { ...params, sign: createAliExpressSignature(params, appSecret) };
  const response = await fetch(`${ALIEXPRESS_ENDPOINT}?${new URLSearchParams(signed)}`, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.error_response) throw Error(`API code ${String(data.error_response.code || 'unknown').replace(/[^\w.-]/g, '')}`);
  const envelope = data[method.replaceAll('.', '_') + '_response']?.resp_result;
  if (!envelope || (envelope.resp_code && Number(envelope.resp_code) !== 200)) throw Error(`API result ${Number(envelope?.resp_code) || 'empty'}`);
  const products = envelope.result?.products?.product || [];
  return Array.isArray(products) ? products : [products];
}
async function request(method, fields) {
  for (let attempt = 0; ; attempt++) {
    try { return await requestOnce(method, fields); }
    catch (error) {
      if (attempt >= 3 || !/ApiCallLimit|HTTP 429|HTTP 50[234]/i.test(error.message)) throw error;
      await new Promise(resolve => setTimeout(resolve, [2000, 5000, 10000][attempt]));
    }
  }
}
function observation(product, originalUrl = null) {
  const price = Number(product.target_sale_price);
  return {
    productId: String(product.product_id), store: 'AliExpress', name: String(product.product_title || ''),
    imageUrl: String(product.product_main_image_url || ''),
    listedPrice: Number.isFinite(price) && price > 0 ? price : null,
    priceBasis: 'product_level_not_selected_sku', shipping: null, taxIncluded: null,
    currency: String(product.target_sale_price_currency || 'EUR'),
    originalUrl, generatedAffiliateUrl: originalUrl ? null : String(product.promotion_link || ''),
    coupon: product.promo_code_info || product.promo_code || null,
    skuVerified: false, compatibilityStatus: 'pending', checkedAt: output.checkedAt,
  };
}
if (!appKey || !appSecret || !trackingId) output.issues.push('Authorized API configuration is unavailable in this environment.');
else {
  const fields = 'product_id,product_title,product_main_image_url,target_sale_price,target_sale_price_currency,target_original_price,promotion_link,promo_code,promo_code_info';
  try {
    const activeAutomatic = previous.discoveries.filter(row => row.admission === 'automated_low_risk_filter').map(row => row.productId);
    const ids = [...new Set([...catalogue.imports.map(item => item.productId), ...approvedDiscoveryIds, ...activeAutomatic])];
    const products = [];
    for (let offset = 0; offset < ids.length; offset += 10) {
      try { products.push(...await request('aliexpress.affiliate.productdetail.get', { product_ids: ids.slice(offset, offset + 10).join(','), target_currency: 'EUR', target_language: 'ES', country: 'ES', tracking_id: trackingId, fields })); }
      catch (error) { output.issues.push(`Product batch ${offset / 10 + 1}: ${error.message}`); }
    }
    for (const entry of catalogue.imports) {
      const product = products.find(product => String(product.product_id) === entry.productId);
      if (product) output.items.push(observation(product, entry.originalUrl));
      else output.issues.push(`No exact API result: ${entry.productId}`);
    }
    for (const id of [...approvedDiscoveryIds, ...activeAutomatic]) {
      const product = products.find(product => String(product.product_id) === id);
      if (product) {
        const row = observation(product);
        row.generatedAffiliateUrl ||= previous.discoveries.find(item => item.productId === id)?.generatedAffiliateUrl || '';
        output.discoveries.push(row);
      }
    }
  } catch (error) { output.issues.push(`Product detail: ${error.message}`); }
  try {
    const products = [];
    for (const keywords of discoveryTopics(discoveryConfig.topics)) products.push(...await request('aliexpress.affiliate.product.query', { keywords, target_currency: 'EUR', target_language: 'ES', ship_to_country: 'ES', tracking_id: trackingId, page_size: '10', fields }));
    const discoveries = products.filter(product => /tesla/i.test(product.product_title || '')).map(product => observation(product));
    output.discoveries.push(...discoveries.filter(item => !output.discoveries.some(existing => existing.productId === item.productId)));
  } catch (error) { output.issues.push(`Discovery: ${error.message}`); }
}
await mkdir(new URL('../outputs/', import.meta.url), { recursive: true });
await writeFile(new URL('../outputs/tesla-price-audit.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
if (process.argv.includes('--update-catalogue') && (output.items.length || previous.items?.length)) {
  // Failed rows retain their original timestamp, never a synthetic fresh date.
  const merge = (oldRows, newRows) => [...new Map([...oldRows, ...newRows].map(row => [row.productId, row])).values()];
  const grown = growDiscoveryCatalogue(previous.discoveries.filter(row => row.admission === 'automated_low_risk_filter'), output.discoveries, { maxNew: discoveryConfig.maxNewPerStorePerRun, maxTotal: discoveryConfig.maxAutomaticPerStore, excludedIds: [...catalogue.imports.map(row => row.productId), ...approvedDiscoveryIds] });
  const reviewed = merge(previous.discoveries.filter(row => approvedDiscoveryIds.includes(row.productId)), output.discoveries.filter(row => approvedDiscoveryIds.includes(row.productId)));
  const updated = { ...output, added: grown.added, items: merge(previous.items || [], output.items), discoveries: merge([...reviewed, ...grown.items], output.discoveries.filter(row => !reviewed.some(existing => existing.productId === row.productId) && !grown.items.some(existing => existing.productId === row.productId))).slice(0, 50) };
  updated.priceHistory = appendTeslaHistory(previous.priceHistory, [...previous.items, ...previous.discoveries, ...updated.items, ...updated.discoveries]);
  await writeFile(new URL('../data/tesla-price-observations.json', import.meta.url), JSON.stringify(updated, null, 2) + '\n');
}
// Public product facts only: no request URLs, signatures, keys or private account data.
console.log('TESLA_AUDIT_RESULT ' + JSON.stringify(output));
