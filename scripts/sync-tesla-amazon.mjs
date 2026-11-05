import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { accessToken } from './amazon-creators-lookup.mjs';
import { canonicalAmazonAffiliateUrl } from './amazon-review-drafts.mjs';
import { discoveryTopics, growDiscoveryCatalogue, teslaEditorialCategory } from './tesla-discovery.mjs';

const config = JSON.parse(await readFile(new URL('../data/tesla-discovery-config.json', import.meta.url), 'utf8'));
const file = new URL('../data/tesla-amazon-observations.json', import.meta.url);
const previous = JSON.parse(await readFile(file, 'utf8'));
const checkedAt = new Date().toISOString();
const result = { checkedAt, source: 'Amazon Creators API', country: 'ES', currency: 'EUR', items: [], status: 'unavailable', issues: [], added: 0 };
const credentials = { credentialId: process.env.AMAZON_CREATOR_CREDENTIAL_ID, credentialSecret: process.env.AMAZON_CREATOR_SECRET, version: process.env.AMAZON_CREATOR_VERSION, partnerTag: process.env.AMAZON_PARTNER_TAG };
const resources = ['images.primary.large', 'itemInfo.title', 'offersV2.listings.availability', 'offersV2.listings.condition', 'offersV2.listings.isBuyBoxWinner', 'offersV2.listings.price'];
function normalize(item) {
  const listing = [...(item.offersV2?.listings || [])].filter(row => row.condition?.value === 'New' && row.price?.money?.currency === 'EUR' && Number(row.price?.money?.amount) > 0 && !/OUT_OF_STOCK|UNAVAILABLE/i.test(row.availability?.type || '')).sort((a, b) => Number(Boolean(b.isBuyBoxWinner)) - Number(Boolean(a.isBuyBoxWinner)))[0];
  if (!listing || !/^[A-Z0-9]{10}$/.test(item.asin || '')) return null;
  return { productId: item.asin, store: 'Amazon', name: item.itemInfo?.title?.displayValue || '', imageUrl: item.images?.primary?.large?.url || '', listedPrice: Number(listing.price.money.amount), currency: 'EUR', checkedAt, originalUrl: canonicalAmazonAffiliateUrl(item.asin, credentials.partnerTag), generatedAffiliateUrl: null, priceBasis: 'api_listing_not_checkout', shipping: null, taxIncluded: null, coupon: null, skuVerified: false, compatibilityStatus: 'pending' };
}
async function call(operation, params, token) {
  const response = await fetch(`https://creatorsapi.amazon/catalog/v1/${operation}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-marketplace': 'www.amazon.es' }, body: JSON.stringify({ marketplace: 'www.amazon.es', partnerTag: credentials.partnerTag, resources, ...params }), signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw Error(`HTTP_${response.status}`);
  const data = await response.json();
  if (data.errors?.length) throw Error('API_REPORTED_ERROR');
  return data.searchResult?.items || data.itemsResult?.items || data.itemResult?.items || data.items || [];
}
if (Object.values(credentials).slice(0, 2).some(value => !value) || !credentials.partnerTag) result.issues.push('Amazon API configuration is unavailable.');
else {
  let token;
  try { token = await accessToken(credentials, (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(25000) })); } catch { result.issues.push('Amazon API authentication failed; no replacement credentials or scraped prices used.'); }
  if (token) {
    const incoming = [];
    const ids = [...new Set([...config.reviewedAmazon.map(row => row.asin), ...previous.items.map(row => row.productId)])];
    for (let index = 0; index < ids.length; index += 10) {
      try { incoming.push(...(await call('getItems', { itemIds: ids.slice(index, index + 10) }, token)).map(normalize).filter(Boolean)); }
      catch (error) { result.issues.push(`Exact item lookup: ${error.message}`); }
    }
    for (const keywords of discoveryTopics(config.topics)) {
      try { incoming.push(...(await call('searchItems', { keywords, searchIndex: 'All', condition: 'New', itemCount: 10 }, token)).map(normalize).filter(Boolean)); }
      catch (error) { result.issues.push(`Discovery: ${error.message}`); }
    }
    const reviewedIds = config.reviewedAmazon.map(row => row.asin);
    const grown = growDiscoveryCatalogue(previous.items.filter(row => !reviewedIds.includes(row.productId)), incoming, { maxNew: config.maxNewPerStorePerRun, maxTotal: config.maxAutomaticPerStore });
    const reviewed = incoming.filter(row => reviewedIds.includes(row.productId)).map(row => ({ ...row, manualReview: true, caution: config.reviewedAmazon.find(review => review.asin === row.productId).caution }));
    result.items = [...new Map([...reviewed, ...grown.items].map(row => [row.productId, row])).values()]; result.added = grown.added;
    result.status = result.issues.length ? 'partial' : 'ok';
  }
}
// Persist ASINs/special links and our own category labels, never permanent API
// titles, images, prices or stock in Git history. A live-content backend is
// required before displaying Amazon advertising content with its cache TTL.
if (!result.items.length && result.status !== 'ok') result.items = previous.items;
result.items = result.items.map(row => ({ productId: row.productId, originalUrl: row.originalUrl, checkedAt: row.checkedAt, editorialCategory: row.editorialCategory || teslaEditorialCategory(row.name || ''), manualReview: Boolean(row.manualReview), admission: row.manualReview ? 'manual_reference' : 'automated_low_risk_filter' }));
if (credentials.partnerTag) for (const reviewed of config.reviewedAmazon) {
  if (!result.items.some(row => row.productId === reviewed.asin)) result.items.push({ productId: reviewed.asin, originalUrl: canonicalAmazonAffiliateUrl(reviewed.asin, credentials.partnerTag), checkedAt: null, editorialCategory: 'Carga de vehículos eléctricos', manualReview: true, admission: 'manual_reference' });
}
await mkdir(new URL('../outputs/', import.meta.url), { recursive: true });
await writeFile(new URL('../outputs/tesla-amazon-audit.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
if (process.argv.includes('--update-catalogue')) await writeFile(file, JSON.stringify(result, null, 2) + '\n');
console.log(`Tesla Amazon: ${result.status}; ${result.items.length} products; ${result.added} admitted. ${result.issues.join(' ')}`);
