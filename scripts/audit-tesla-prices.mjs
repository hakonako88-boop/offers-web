import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { ALIEXPRESS_ENDPOINT, createAliExpressSignature } from './aliexpress-offers.mjs';

// Read-only affiliate API audit. Does not generate replacement links or publish anything.
const catalogue = JSON.parse(await readFile(new URL('../data/tesla-catalogue.json', import.meta.url), 'utf8'));
const output = { checkedAt: new Date().toISOString(), country: 'ES', currency: 'EUR', source: 'AliExpress affiliate API', items: [], discoveries: [], issues: [] };
const appKey = process.env.ALIEXPRESS_APP_KEY;
const appSecret = process.env.ALIEXPRESS_APP_SECRET;
const trackingId = process.env.ALIEXPRESS_TRACKING_ID;
async function request(method, fields) {
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
function observation(product, originalUrl = null) {
  const price = Number(product.target_sale_price);
  return {
    productId: String(product.product_id), name: String(product.product_title || ''),
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
    const products = await request('aliexpress.affiliate.productdetail.get', { product_ids: catalogue.imports.map(item => item.productId).join(','), target_currency: 'EUR', target_language: 'ES', country: 'ES', tracking_id: trackingId, fields });
    for (const entry of catalogue.imports) {
      const product = products.find(product => String(product.product_id) === entry.productId);
      if (product) output.items.push(observation(product, entry.originalUrl));
      else output.issues.push(`No exact API result: ${entry.productId}`);
    }
  } catch (error) { output.issues.push(`Product detail: ${error.message}`); }
  try {
    const products = await request('aliexpress.affiliate.product.query', { keywords: 'Tesla Model Y organizer floor mats', target_currency: 'EUR', target_language: 'ES', ship_to_country: 'ES', tracking_id: trackingId, page_size: '10', fields });
    output.discoveries = products.filter(product => /tesla/i.test(product.product_title || '') && /organ|mat|alfombr|storage/i.test(product.product_title || '')).map(product => observation(product));
  } catch (error) { output.issues.push(`Discovery: ${error.message}`); }
}
await mkdir(new URL('../outputs/', import.meta.url), { recursive: true });
await writeFile(new URL('../outputs/tesla-price-audit.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
// Public product facts only: no request URLs, signatures, keys or private account data.
console.log('TESLA_AUDIT_RESULT ' + JSON.stringify(output));
