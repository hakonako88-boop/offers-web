function timestamp(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

export function prioritizeAliExpressSignals(signals = []) {
  return [...signals].sort((left, right) => {
    const leftQueued = Number(Boolean(left.queueItemId && left.sourceStore === 'AliExpress'));
    const rightQueued = Number(Boolean(right.queueItemId && right.sourceStore === 'AliExpress'));
    if (leftQueued !== rightQueued) return rightQueued - leftQueued;
    // A steady stream of new source posts must not starve older pending links.
    if (leftQueued) return timestamp(left.publishedAt) - timestamp(right.publishedAt);
    const leftNolo = Number(left.source === 'nolodejesescapar');
    const rightNolo = Number(right.source === 'nolodejesescapar');
    return rightNolo - leftNolo || timestamp(right.publishedAt) - timestamp(left.publishedAt);
  });
}
