import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const LIDL_PROGRAM_ID = '335844';

export function spanishLidlFeeds(payload = {}) {
  return (Array.isArray(payload.feeds) ? payload.feeds : [])
    .filter((feed) => feed?.active !== false && feed?.visible !== false)
    .filter((feed) => (feed.programs || []).some((program) => String(program?.programId || '') === LIDL_PROGRAM_ID))
    .filter((feed) => !feed.languageISOCode || /^(?:es|spa|spanish)$/iu.test(String(feed.languageISOCode)))
    .map((feed) => ({
      feedId: String(feed.feedId || ''),
      name: String(feed.name || ''),
      language: String(feed.languageISOCode || ''),
      currency: String(feed.currencyISOCode || ''),
      products: Number(feed.numberOfProducts || 0),
      modifiedAt: String(feed.lastModifiedTime || ''),
    }))
    .filter((feed) => feed.feedId)
    .sort((left, right) => right.products - left.products);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const token = String(process.env.TRADEDOUBLER_PRODUCTS_TOKEN || '').trim();
  if (!token) {
    console.log('Lidl feed discovery skipped: missing TRADEDOUBLER_PRODUCTS_TOKEN.');
    process.exit(0);
  }
  const response = await fetch(`https://api.tradedoubler.com/1.0/productFeeds;programId=${LIDL_PROGRAM_ID}?token=${encodeURIComponent(token)}`, {
    headers: { accept: 'application/json', 'user-agent': 'ChollosAlDiaBot/1.0 (+https://chollosaldia.com/aviso-legal)' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`TradeDoubler productFeeds returned ${response.status}`);
  const feeds = spanishLidlFeeds(await response.json());
  const output = { programId: LIDL_PROGRAM_ID, checkedAt: new Date().toISOString(), status: feeds.length ? 'available' : 'not-available', feeds };
  fs.writeFileSync(path.join(process.cwd(), 'data', 'tradedoubler-lidl-feeds.json'), `${JSON.stringify(output, null, 2)}\n`);
  console.log(feeds.length ? `Lidl: ${feeds.length} Spanish product feed(s) available.` : 'Lidl: the account has no active Spanish product feed yet.');
}
