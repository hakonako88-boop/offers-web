import crypto from 'node:crypto';
import { formatTelegramDealCard, formatWebsiteDealText, improveOfferTitle } from './offer-presentation.mjs';

function compact(value = '') {
  return String(value).replace(/\s+/gu, ' ').trim();
}

export function isReliableProductTitle(value = '') {
  const title = compact(value);
  return title.length >= 5
    && !/^https?:\/\//iu.test(title)
    && !/^(?:ahorra|ofert[oó]n|oferta|chollo|descuento|precio)\b/iu.test(title)
    && !/^(?:amazon|aliexpress|miravia)(?:\s+(?:españa|espana|es))?$/iu.test(title);
}

/** Keeps facts supplied by the shop/API ahead of text copied from a forwarded
 * card. Forwarded titles are only a fallback: source channels often truncate
 * or embellish them, which made AliExpress posts look inaccurate. */
export function mergeProductMetadata(official = {}, forwarded = {}) {
  const result = { ...official };
  if (!isReliableProductTitle(result.title) && isReliableProductTitle(forwarded.title)) result.title = forwarded.title;
  if (!compact(result.description) && compact(forwarded.description)) result.description = forwarded.description;
  if (!compact(result.imageUrl) && compact(forwarded.imageUrl)) result.imageUrl = forwarded.imageUrl;
  if (!(Number(result.price) > 0) && Number(forwarded.price) > 0) result.price = Number(forwarded.price);
  if (!(Number(result.previousPrice) > Number(result.price)) && Number(forwarded.previousPrice) > Number(result.price)) {
    result.previousPrice = Number(forwarded.previousPrice);
  }
  return result;
}

function parseAmount(value = '') {
  const clean = String(value)
    .replace(/\u00a0/g, '')
    .replace(/\s/g, '')
    .replace(/[^0-9,.-]/g, '');
  if (!clean) return 0;

  const lastComma = clean.lastIndexOf(',');
  const lastDot = clean.lastIndexOf('.');
  const normalized = lastComma >= 0 && lastDot >= 0
    ? (lastComma > lastDot ? clean.replaceAll('.', '').replace(',', '.') : clean.replaceAll(',', ''))
    : clean.replace(',', '.');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function euro(amount) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function commandCodeMatches(received, expected) {
  const left = Buffer.from(String(received || ''));
  const right = Buffer.from(String(expected || ''));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

export function firstUrl(text) {
  const match = String(text).match(/https?:\/\/[^\s<>]+/i);
  return match ? match[0].replace(/[),.;!?]+$/u, '') : '';
}

/** Reads a normal URL as well as the hidden destination of Telegram's
 * clickable text (for example, a forwarded “Ver aquí en Amazon” button). */
export function urlFromTelegramMessage(message = {}, text = '') {
  const entities = [...(message.entities || []), ...(message.caption_entities || [])];
  const linked = entities.find((entity) => entity?.type === 'text_link' && entity.url)?.url;
  if (linked) return String(linked);
  for (const entity of entities) {
    if (entity?.type !== 'url') continue;
    const candidate = String(text).slice(Number(entity.offset || 0), Number(entity.offset || 0) + Number(entity.length || 0));
    if (candidate) return candidate;
  }
  return firstUrl(text);
}

export function storeFromUrl(url) {
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return 'Tienda';
  }
  if (/(^|\.)amazon\./.test(host) || host === 'amzn.to') return 'Amazon';
  if (/(^|\.)aliexpress\./.test(host) || /s\.click\.aliexpress\.com/.test(host)) return 'AliExpress';
  if (/(^|\.)miravia\./.test(host) || /awin1\.com/.test(host)) return 'Miravia';
  return 'Tienda';
}

function fieldValue(lines, names) {
  for (const line of lines) {
    const match = line.match(/^\s*([^:]+)\s*:\s*(.+)\s*$/u);
    if (!match) continue;
    const key = match[1]
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
    if (names.includes(key)) return compact(match[2]);
  }
  return '';
}

function fallbackTitle(lines) {
  return lines
    .map((line) => compact(line))
    .find((line) => line
      && !/^https?:\/\//i.test(line)
      && !/^[^:]{1,22}:\s*/u.test(line)
      && !/^\/(?:publicar|start|ayuda)/i.test(line))
    || '';
}

export function controlHelp() {
  return [
    '👋 Envíame un enlace de una oferta y prepararé la publicación.',
    '',
    'Después basta con pegar un enlace. El bot obtiene título, foto, descripción y precio de la ficha pública. Si la tienda oculta el precio, te pedirá solo ese dato.',
    '',
    'Amazon: puedes mandar el enlace directo; se añade tu tag automáticamente. AliExpress y Miravia: envía el enlace ya generado desde tu afiliación.',
    '',
    'También puedes reenviar una publicación con foto y pegar después su enlace de compra.',
  ].join('\n');
}

/** A quick acknowledgement prevents a forwarded offer from looking ignored
 * while the shop page or the affiliate catalogue is being checked. */
export function processingOfferReply(store = 'Tienda') {
  const label = ['Amazon', 'AliExpress', 'Miravia'].includes(store) ? store : 'la tienda';
  return `🔎 Estoy comprobando la ficha de ${label}: título, precio, foto y enlace. Te confirmaré aquí si se publica o si falta el enlace directo.`;
}

export function activateChatFromMessage({ text = '', controlCode = '' } = {}) {
  const match = String(text).trim().match(/^\/(?:activar|autorizar)(?:@\w+)?\s+(\S+)\s*$/i);
  if (!match) return { status: 'ignore' };
  return commandCodeMatches(match[1], controlCode)
    ? { status: 'authorized' }
    : { status: 'unauthorized' };
}

function amazonUrlWithTag(url, partnerTag) {
  if (!partnerTag || storeFromUrl(url) !== 'Amazon') return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() === 'amzn.to') return url;
    parsed.searchParams.set('tag', partnerTag);
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Amazon's public ASIN image endpoint is a reliable fallback when the
 * product page rejects an automated metadata request. */
export function amazonProductImageFromUrl(url = '') {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)amazon\./iu.test(parsed.hostname)) return '';
    const asin = parsed.pathname.match(/\/(?:dp|gp\/product)\/([a-z0-9]{10})(?:[/?]|$)/iu)?.[1];
    return asin ? `https://m.media-amazon.com/images/P/${asin.toUpperCase()}.01._SCLZZZZZZZ_.jpg` : '';
  } catch {
    return '';
  }
}

function hasAffiliateLink(url, store) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (store === 'AliExpress') return /(^|\.)s\.click\.aliexpress\.com$/.test(host) || /(^|\.)a\.aliexpress\.com$/.test(host);
    if (store === 'Miravia') return /(^|\.)awin1\.com$/.test(host) || /(^|\.)awin\.com$/.test(host);
    return true;
  } catch {
    return false;
  }
}

export function offerFromProductMetadata({ url = '', metadata = {}, partnerTag = '' } = {}) {
  const store = storeFromUrl(url);
  if (!['Amazon', 'AliExpress', 'Miravia'].includes(store)) {
    return {
      status: 'needs_store',
      message: 'No he encontrado una ficha directa de Amazon, AliExpress o Miravia detrás de ese enlace. No publico imágenes ni enlaces de otros canales. Pega el enlace real del producto y prepararé el título, la foto y tu enlace de afiliado.',
    };
  }
  const finalUrl = amazonUrlWithTag(url, partnerTag);
  const title = compact(metadata.title);
  const price = Number(metadata.price) || 0;
  const previousPrice = Number(metadata.previousPrice) > price ? Number(metadata.previousPrice) : 0;
  const imageUrl = compact(metadata.imageUrl);
  if (!isReliableProductTitle(title) || !imageUrl || !price) {
    return {
      status: 'needs_details',
      missing: [!isReliableProductTitle(title) && 'título fiable', !imageUrl && 'foto', !price && 'precio'].filter(Boolean),
    };
  }
  if (store === 'Amazon' && !partnerTag && !/[?&]tag=/i.test(finalUrl)) {
    return { status: 'needs_affiliate', message: 'Falta configurar el tag de Amazon para poder crear tu enlace de afiliado.' };
  }
  if ((store === 'AliExpress' || store === 'Miravia') && !hasAffiliateLink(finalUrl, store)) {
    return { status: 'needs_affiliate', message: `Ese enlace de ${store} no parece ser de afiliación. Genera el enlace desde tu panel de afiliado y envíamelo de nuevo.` };
  }
  const discount = previousPrice ? Math.round(((previousPrice - price) / previousPrice) * 100) : 0;
  return {
    status: 'ready',
    offer: {
      id: `manual-${Date.now()}`,
      title: improveOfferTitle(title),
      store,
      category: 'Ofertas',
      coupon: '',
      price,
      priceLabel: euro(price),
      previousPrice,
      previousPriceLabel: previousPrice ? euro(previousPrice) : '',
      discount,
      url: finalUrl,
      imageUrl,
      description: compact(metadata.description).slice(0, 220) || `${title.slice(0, 180)} · Oferta publicada en Chollos al Día.`,
    },
  };
}

/** Turns a forwarded deal card into factual product metadata. It preserves
 * the original price wording and does not invent a discount or description. */
export function forwardedOfferMetadata(text = '', photoFileId = '') {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n').map((line) => compact(line)).filter(Boolean);
  const headline = lines.find((line) => !/^https?:\/\//iu.test(line)
    && !/(?:descuento\s*:|precio(?:\s+(?:oferta|final|actual))?\s*:|precio más bajo|compra recurrente|compra única|ver aquí)/iu.test(line)) || '';
  const title = compact(headline.replace(/[🔥✨💥]+/gu, '').replace(/\|\s*#.+$/u, ''));
  const priceLine = lines.find((line) => (
    /(?:precio(?:\s+(?:oferta|final|actual))?|compra\s+(?:recurrente|única)|ahora|solo)\b/iu.test(line)
    && !/(?:precio\s+m[aá]s\s+bajo|antes|pvp)\b/iu.test(line)
  )) || lines.find((line) => /\d+(?:[.,]\d{1,2})?\s*€/u.test(line)) || '';
  const previousLine = lines.find((line) => /precio\s+m[aá]s\s+bajo|\b(?:pvp|antes)\b/iu.test(line)) || '';
  const lastAmount = (value = '') => [...String(value).matchAll(/\d+(?:[.,]\d{1,2})?/gu)].at(-1)?.[0] || '';
  const price = parseAmount(lastAmount(priceLine));
  const previousPrice = parseAmount(lastAmount(previousLine));
  return {
    title,
    // “Forwarded” is an internal ingestion detail, never public copy. Keeping
    // the factual title here lets the presentation layer create its normal
    // concise product description without revealing how it arrived.
    description: title,
    imageUrl: photoFileId,
    price,
    previousPrice: previousPrice > price ? previousPrice : 0,
    photoFileId,
  };
}

export function manualOfferFromMessage({ text = '', photoFileId = '', controlCode = '' } = {}) {
  const source = String(text || '').replace(/\r\n/g, '\n').trim();
  const lines = source.split('\n').map((line) => line.trim()).filter(Boolean);
  const first = lines[0] || '';
  const command = first.match(/^\/publicar(?:@\w+)?\s+(\S+)\s*$/i);

  if (!command) return { status: 'ignore' };
  if (!commandCodeMatches(command[1], controlCode)) return { status: 'unauthorized' };

  const bodyLines = lines.slice(1);
  const url = firstUrl(bodyLines.join('\n'));
  const store = storeFromUrl(url);
  const title = fieldValue(bodyLines, ['titulo', 'title', 'producto']) || fallbackTitle(bodyLines);
  const price = parseAmount(fieldValue(bodyLines, ['precio', 'precio final', 'precio oferta']));
  const oldPrice = parseAmount(fieldValue(bodyLines, ['antes', 'precio anterior', 'pvp']));
  const category = fieldValue(bodyLines, ['categoria', 'category']) || 'Ofertas';
  const description = fieldValue(bodyLines, ['descripcion', 'descripción', 'detalle', 'texto']);
  const coupon = fieldValue(bodyLines, ['cupon', 'cupón', 'codigo', 'código']);

  const missing = [];
  if (!url) missing.push('el enlace');
  if (!title) missing.push('el título');
  if (!price) missing.push('el precio');
  if (!photoFileId) missing.push('la foto');
  if (store === 'Amazon' && !/[?&]tag=/i.test(url)) missing.push('un enlace de Amazon directo con tag=');

  if (missing.length) {
    return {
      status: 'invalid',
      message: `Falta ${missing.join(', ')}.\n\n${controlHelp()}`,
    };
  }

  const previousPrice = oldPrice > price ? oldPrice : 0;
  const discount = previousPrice ? Math.round(((previousPrice - price) / previousPrice) * 100) : 0;
  return {
    status: 'ready',
    offer: {
      id: `manual-${Date.now()}`,
      title: improveOfferTitle(title),
      store,
      category: category.slice(0, 60),
      coupon: coupon.slice(0, 40),
      price,
      priceLabel: euro(price),
      previousPrice,
      previousPriceLabel: previousPrice ? euro(previousPrice) : '',
      discount,
      url,
      photoFileId,
      description: description.slice(0, 220) || `${title.slice(0, 180)} · Oferta publicada en Chollos al Día.`,
    },
  };
}

export function formatManualTelegramCaption(offer) {
  return formatTelegramDealCard({
    title: offer.title,
    store: offer.store,
    category: offer.category,
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    savings: offer.previousPrice > offer.price ? euro(offer.previousPrice - offer.price) : '',
    discount: offer.discount,
    coupon: offer.coupon,
    url: offer.url,
    description: offer.description,
  });
}

export function formatManualWebsiteText(offer) {
  return formatWebsiteDealText({
    title: offer.title,
    store: offer.store,
    price: offer.priceLabel,
    previousPrice: offer.previousPriceLabel,
    savings: offer.previousPrice > offer.price ? euro(offer.previousPrice - offer.price) : '',
    discount: offer.discount,
  });
}
