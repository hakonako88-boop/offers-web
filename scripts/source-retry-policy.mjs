export const SOURCE_RETRY_MAX_AGE_MS = 48 * 60 * 60 * 1000;
export const ALIEXPRESS_RETRY_POLICY = 'exact-id-query-and-diagnostics-v14-resilient-retry';

export function isRecentSourceItem(item, now = new Date()) {
  const publishedAt = Date.parse(item?.publishedAt || item?.createdAt || '');
  return !Number.isFinite(publishedAt)
    || publishedAt >= now.getTime() - SOURCE_RETRY_MAX_AGE_MS;
}

export function retryableAliExpressQueueCount(items = [], now = new Date()) {
  return items.filter((item) => item.store === 'AliExpress'
    && item.status === 'rejected'
    && item.retryPolicyVersion !== ALIEXPRESS_RETRY_POLICY
    && isRecentSourceItem(item, now)).length;
}
