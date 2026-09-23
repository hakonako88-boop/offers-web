export const SOURCE_RETRY_MAX_AGE_MS = 48 * 60 * 60 * 1000;
export const ALIEXPRESS_RETRY_POLICY = 'exact-id-query-and-diagnostics-v15-republication-cooldown';
const BASE_RETRY_DELAY_MS = 20 * 60 * 1000;
const MAX_RETRY_DELAY_MS = 4 * 60 * 60 * 1000;

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

export function sourceRetryDelayMs(attempts = 1) {
  const exponent = Math.max(0, Math.min(4, Number(attempts || 1) - 1));
  return Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * (2 ** exponent));
}

export function nextSourceRetryAt(attempts = 1, now = new Date()) {
  return new Date(now.getTime() + sourceRetryDelayMs(attempts)).toISOString();
}

export function isSourceItemReady(item, now = new Date()) {
  if (item?.status !== 'pending') return false;
  const nextAttemptAt = Date.parse(item?.nextAttemptAt || '');
  return !Number.isFinite(nextAttemptAt) || nextAttemptAt <= now.getTime();
}
