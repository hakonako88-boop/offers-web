import { instagramImageUrl, publicOfferId } from './instagram-publication.mjs';

const TIME_ZONE = 'Europe/Madrid';
const SITE_URL = 'https://chollosaldia.com';
const DAY_MS = 24 * 60 * 60 * 1000;

function compact(value = '') {
  return String(value).replace(/\s+/gu, ' ').trim();
}

function stamp(offer = {}) {
  const raw = Number(offer.date);
  return Number.isFinite(raw) ? (raw > 10_000_000_000 ? raw : raw * 1000) : 0;
}

function priceNumber(value = '') {
  const raw = String(value).replace(/\s|\u00a0/gu, '').replace(/[^0-9,.-]/gu, '');
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  return Number(comma > dot ? raw.replaceAll('.', '').replace(',', '.') : raw.replaceAll(',', '')) || 0;
}

function previousPrice(offer = {}) {
  return compact(offer.previousPrice || offer.previous_price || String(offer.text || '').match(/Antes:\s*([^→\n]+)/iu)?.[1] || '');
}

function discount(offer = {}) {
  const explicit = Number(`${offer.text || ''} ${offer.discount || ''}`.match(/(?:−|-|DESCUENTO:\s*)(\d{1,2})\s*%/iu)?.[1] || 0);
  if (explicit) return explicit;
  const now = priceNumber(offer.price);
  const before = priceNumber(previousPrice(offer));
  return before > now ? Math.round((1 - now / before) * 100) : 0;
}

function coupon(offer = {}) {
  return compact(offer.coupon || String(offer.text || '').match(/Cup[oó]n:\s*([A-Z0-9-]{3,30})/iu)?.[1] || '');
}

function affiliateUrl(offer = {}) {
  const value = compact(offer.url);
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function madridParts(now) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).reduce((all, part) => ({ ...all, [part.type]: part.value }), {});
}

export function pinterestPublicationWindow(state = {}, { now = new Date(), force = false } = {}) {
  if (force) return { allowed: true, reason: 'manual-force' };
  const parts = madridParts(now);
  const hour = Number(parts.hour);
  if (hour < 8 || hour >= 23) return { allowed: false, reason: 'quiet-hours' };
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const published = Array.isArray(state.published) ? state.published : [];
  const today = published.filter((entry) => String(entry.publishedAt || '').startsWith(date));
  if (today.length >= 3) return { allowed: false, reason: 'daily-limit' };
  const latest = Math.max(0, ...published.map((entry) => Date.parse(entry.publishedAt || '') || 0));
  if (latest && now.getTime() - latest < 3 * 60 * 60 * 1000) return { allowed: false, reason: 'publication-interval' };
  return { allowed: true, reason: 'slot-available' };
}

export function selectPinterestOffer(offers = [], state = {}, { now = new Date(), siteUrl = SITE_URL } = {}) {
  const published = new Set((state.published || []).map((entry) => String(entry.offerId || '')));
  const cutoff = now.getTime() - 3 * DAY_MS;
  return offers
    .filter((offer) => {
      const id = publicOfferId(offer);
      return id
        && !published.has(id)
        && stamp(offer) >= cutoff
        && compact(offer.title).length >= 12
        && compact(offer.price)
        && affiliateUrl(offer)
        && instagramImageUrl(offer, siteUrl)
        && !/daily-summary|campaign|removed/iu.test(String(offer.source || ''));
    })
    .sort((left, right) => (discount(right) * 10_000 + stamp(right)) - (discount(left) * 10_000 + stamp(left)))[0] || null;
}

export function pinterestPinPayload(offer = {}, { boardId, siteUrl = SITE_URL } = {}) {
  const id = publicOfferId(offer);
  const title = compact(offer.title).slice(0, 100);
  const store = compact(offer.store || 'Tienda');
  const price = compact(offer.price);
  const before = previousPrice(offer);
  const cut = discount(offer);
  const code = coupon(offer);
  const detailsUrl = `${String(siteUrl).replace(/\/$/u, '')}/oferta/${encodeURIComponent(id)}/`;
  const description = [
    `${title}.`,
    `Oferta en ${store}: ${price}.`,
    before ? `Antes: ${before}.` : '',
    cut ? `Descuento: ${cut}%.` : '',
    code ? `Cupón: ${code}.` : '',
    'Precio y disponibilidad sujetos a cambios.',
    'Enlace de afiliado: puede generar una comisión para Chollos al Día sin coste adicional.',
    `Más detalles: ${detailsUrl}`,
  ].filter(Boolean).join(' ').slice(0, 500);
  return {
    board_id: String(boardId || '').trim(),
    title,
    description,
    link: affiliateUrl(offer),
    // Pinterest's image_url source type accepts a public remote product image.
    // Mark it as a standard organic Pin rather than an ad-only creative.
    media_source: { source_type: 'image_url', url: instagramImageUrl(offer, siteUrl), is_standard: true },
  };
}
