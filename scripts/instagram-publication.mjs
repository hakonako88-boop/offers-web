const TIME_ZONE = 'Europe/Madrid';

function compact(value = '') {
  return String(value).replace(/\s+/gu, ' ').trim();
}

export function publicOfferId(offer = {}) {
  return String(offer.chollometroId || offer.source_product_id || offer.message_id || '')
    .trim()
    .replace(/[^a-z0-9._~-]+/giu, '-')
    .replace(/^-+|-+$/gu, '');
}

export function instagramImageUrl(offer = {}, siteUrl = 'https://chollosaldia.com') {
  const image = compact(offer.image);
  if (!image) return '';
  try {
    const url = new URL(image, `${String(siteUrl).replace(/\/$/u, '')}/`);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function offerDiscount(offer = {}) {
  const text = `${offer.text || ''} ${offer.discount || ''}`;
  const explicit = Number(text.match(/(?:−|-|DESCUENTO:\s*)(\d{1,2})\s*%/iu)?.[1] || 0);
  return Number.isFinite(explicit) ? explicit : 0;
}

function stamp(offer = {}) {
  const raw = Number(offer.date);
  return Number.isFinite(raw) ? (raw > 10_000_000_000 ? raw : raw * 1000) : 0;
}

export function selectInstagramOffer(offers = [], state = {}, { now = new Date(), siteUrl = 'https://chollosaldia.com' } = {}) {
  const publishedIds = new Set((state.published || []).map((entry) => String(entry.offerId || '')));
  const recentCutoff = now.getTime() - 72 * 60 * 60 * 1000;
  return offers
    .filter((offer) => {
      const id = publicOfferId(offer);
      return id
        && !publishedIds.has(id)
        && stamp(offer) >= recentCutoff
        && compact(offer.title).length >= 8
        && compact(offer.price)
        && instagramImageUrl(offer, siteUrl)
        && !/daily-summary|campaign/iu.test(String(offer.source || ''));
    })
    .sort((left, right) => {
      const leftScore = offerDiscount(left) * 1_000 + stamp(left);
      const rightScore = offerDiscount(right) * 1_000 + stamp(right);
      return rightScore - leftScore;
    })[0] || null;
}

export function instagramPublicationWindow(state = {}, { now = new Date(), force = false } = {}) {
  if (force) return { allowed: true, reason: 'manual-force' };
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).reduce((all, part) => ({ ...all, [part.type]: part.value }), {});
  const hour = Number(parts.hour);
  if (hour < 9 || hour >= 22) return { allowed: false, reason: 'quiet-hours' };
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const today = (state.published || []).filter((entry) => String(entry.publishedAt || '').startsWith(date));
  if (today.length >= 4) return { allowed: false, reason: 'daily-limit' };
  const lastPublishedAt = Math.max(0, ...(state.published || []).map((entry) => Date.parse(entry.publishedAt || '') || 0));
  if (lastPublishedAt && now.getTime() - lastPublishedAt < 3 * 60 * 60 * 1000) {
    return { allowed: false, reason: 'publication-interval' };
  }
  return { allowed: true, reason: 'slot-available' };
}

export function instagramCaption(offer = {}, siteUrl = 'https://chollosaldia.com') {
  const id = publicOfferId(offer);
  const title = compact(offer.title).slice(0, 150);
  const store = compact(offer.store || 'Tienda');
  const price = compact(offer.price);
  const text = compact(offer.text);
  const previous = compact(offer.previousPrice || offer.previous_price || text.match(/Antes:\s*([^→\n]+)/iu)?.[1] || '');
  const discount = offerDiscount(offer);
  const coupon = compact(offer.coupon || text.match(/Cup[oó]n:\s*([A-Z0-9-]{3,24})/iu)?.[1] || '');
  const detailUrl = `${String(siteUrl).replace(/\/$/u, '')}/oferta/${encodeURIComponent(id)}/`;
  return [
    `🔥 ${title}`,
    '',
    `💶 Precio: ${price}`,
    previous ? `📛 Antes: ${previous}` : '',
    discount ? `📉 Descuento: -${discount}%` : '',
    coupon ? `🎟️ Cupón: ${coupon}` : '',
    '',
    `🔎 Oferta y condiciones: ${detailUrl}`,
    '👉 Más chollos en el enlace de la bio',
    '',
    `#ChollosAlDia #Ofertas #Chollos #${store.replace(/[^\p{L}\p{N}]/gu, '')}`,
  ].filter((line, index) => line || [1, 6, 9].includes(index)).join('\n').slice(0, 2_000);
}
