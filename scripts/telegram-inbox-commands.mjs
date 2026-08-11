import crypto from 'node:crypto';

function compact(value = '') {
  return String(value).replace(/\s+/gu, ' ').trim();
}

function escapeHtml(value = '') {
  return compact(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

function commandCodeMatches(received, expected) {
  const left = Buffer.from(String(received || ''));
  const right = Buffer.from(String(expected || ''));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

function firstUrl(text) {
  const match = String(text).match(/https?:\/\/[^\s<>]+/i);
  return match ? match[0].replace(/[),.;!?]+$/u, '') : '';
}

function storeFromUrl(url) {
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
    '📩 Envíame una foto con esta plantilla en el mismo mensaje:',
    '',
    '/publicar TU_CLAVE',
    'https://www.amazon.es/dp/...?...tag=TU_TAG',
    'Título: Nombre del producto',
    'Precio: 19,99 €',
    'Antes: 39,99 €',
    'Categoría: Tecnología',
    '',
    'La foto es obligatoria. Para Amazon usa el enlace directo de SiteStripe con tag=.',
  ].join('\n');
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
      title: title.slice(0, 220),
      store,
      category: category.slice(0, 60),
      price,
      priceLabel: euro(price),
      previousPrice,
      previousPriceLabel: previousPrice ? euro(previousPrice) : '',
      discount,
      url,
      photoFileId,
      description: `${title.slice(0, 180)} · Oferta publicada en Chollos al Día.`,
    },
  };
}

export function formatManualTelegramCaption(offer) {
  const previous = offer.previousPriceLabel
    ? `🏷️ <b>Antes:</b> <s>${escapeHtml(offer.previousPriceLabel)}</s>`
    : '';
  const savings = offer.previousPrice > offer.price
    ? `💸 <b>Ahorras:</b> ${escapeHtml(euro(offer.previousPrice - offer.price))}`
    : '';
  const discount = offer.discount > 0 ? `📉 <b>DESCUENTO:</b> ${offer.discount}%` : '';

  return [
    '#publi',
    '',
    `<b>🛍️ OFERTÓN EN ${escapeHtml(offer.store).toUpperCase()}</b>`,
    '━━━━━━━━━━━━━━━━━━',
    `<b>${escapeHtml(offer.title)}</b>`,
    '',
    `💶 <b>PRECIO:</b> <b>${escapeHtml(offer.priceLabel)}</b>`,
    previous,
    savings,
    discount,
    `📂 <b>Categoría:</b> ${escapeHtml(offer.category)}`,
    '━━━━━━━━━━━━━━━━━━',
    '<i>⚠️ Precio y stock pueden cambiar.</i>',
    `#Chollos #${escapeHtml(offer.store).replace(/\s+/g, '')}`,
  ].filter(Boolean).join('\n').slice(0, 1000);
}

export function formatManualWebsiteText(offer) {
  const previous = offer.previousPriceLabel ? `\n🏷️ Antes: ${offer.previousPriceLabel}` : '';
  const savings = offer.previousPrice > offer.price
    ? `\n💸 Ahorras: ${euro(offer.previousPrice - offer.price)}`
    : '';
  const discount = offer.discount > 0 ? `\n📉 Descuento: ${offer.discount}%` : '';
  return [
    `OFERTÓN EN ${offer.store.toUpperCase()}`,
    offer.title,
    `💶 Precio: ${offer.priceLabel}${previous}${savings}${discount}`,
    `📂 Categoría: ${offer.category}`,
  ].join('\n');
}
