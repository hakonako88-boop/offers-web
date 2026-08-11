function compact(value = '') {
  return String(value).replace(/\s+/gu, ' ').trim();
}

function normalized(value = '') {
  return compact(value)
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function escapeHtml(value = '') {
  return compact(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function trimAtWord(value, maximum = 108) {
  const text = compact(value);
  if (text.length <= maximum) return text;
  const cut = text.slice(0, maximum + 1).lastIndexOf(' ');
  return `${text.slice(0, cut > 48 ? cut : maximum).trim()}…`;
}

function dimensions(value = '') {
  const match = String(value).match(/\b(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)\b/i);
  return match ? `${match[1]}×${match[2]} ${match[3].toLowerCase()}` : '';
}

function brandBefore(title, pattern) {
  const before = compact(String(title).split(pattern)[0]);
  if (!before || before.split(' ').length > 4) return '';
  return before.replace(/[,.·|]+$/u, '').trim();
}

/**
 * Reduces catalogue-style titles to a short, factual headline.  It only uses
 * words already present in the supplier's title, and falls back safely when a
 * product does not match one of the common deal types.
 */
export function improveOfferTitle(value = '') {
  const original = compact(value)
    .replace(/\b(\d+)\s*[xX×]\s*(\d+)\s*Cm\b/gu, '$1×$2 cm')
    .replace(/\bCm\b/gu, 'cm');
  const text = normalized(original);
  if (!original) return 'Oferta destacada';

  if (/relleno\s+de\s+cojin/.test(text)) {
    const brandAfter = original.match(/relleno\s+de\s+coj[ií]n\s+([\p{L}\p{N}-]{2,})\b/iu)?.[1] || '';
    const brand = brandBefore(original, /relleno\s+de\s+coj[ií]n/i) || brandAfter;
    const size = dimensions(original);
    const fibre = /siliconad/.test(text) ? ' de fibra siliconada' : '';
    return trimAtWord(`Relleno de cojín${brand ? ` ${brand}` : ''}${size ? ` ${size}` : ''}${fibre}`);
  }

  if (/cuerda.*deform/.test(text)) {
    return /nino|juguete/.test(text)
      ? 'Cuerda deformable antiestrés para niños'
      : 'Cuerda deformable antiestrés';
  }

  if (/tren/.test(text) && /magnet/.test(text)) {
    return /nino/.test(text) ? 'Tren magnético eléctrico para niños' : 'Tren magnético eléctrico';
  }

  if (/alfombrilla.*(?:raton|mouse)|mousepad/.test(text)) {
    const character = /charizard/.test(text) ? ' Charizard' : '';
    const size = /xxl/.test(text) ? ' XXL' : '';
    return `Alfombrilla gaming${character}${size}`;
  }

  if (/freidora.*aire/.test(text) && /silicona/.test(text)) {
    return 'Molde de silicona para freidora de aire';
  }

  if (/auriculares|headphones|earbuds/.test(text)) {
    if (/^auriculares(?:\s+inal[aá]mbricos)?\b/i.test(original)) return trimAtWord(original);
    const brand = brandBefore(original, /(?:auriculares|headphones|earbuds)/i);
    const wireless = /inalambr|bluetooth|wireless/.test(text) ? ' inalámbricos' : '';
    return trimAtWord(`Auriculares${wireless}${brand ? ` ${brand}` : ''}`);
  }

  return trimAtWord(original);
}

export function categoryHashtag(value = '') {
  const text = normalized(value);
  if (/tecnolog|electron|informat|mobile|telefono|data|memory|gaming|software/.test(text)) return 'Tecnología';
  if (/hogar|home|bedding|bath|cocina|garden|jardin|appliance/.test(text)) return 'Hogar';
  if (/moda|fashion|ropa|clothing|shoe|calzado|bag|bolso/.test(text)) return 'Moda';
  if (/belleza|beauty|salud|health/.test(text)) return 'Belleza';
  if (/juguete|toy|baby|bebe/.test(text)) return 'Juguetes';
  if (/deporte|sport/.test(text)) return 'Deporte';
  if (/bricolaje|herramienta|tool/.test(text)) return 'Bricolaje';
  return 'Ofertas';
}

function storeHashtag(store = '') {
  return compact(store).replace(/[^\p{L}\p{N}]/gu, '') || 'Tienda';
}

function escapeUrl(value = '') {
  try {
    const url = new URL(String(value));
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString().replace(/&/g, '&amp;').replace(/"/g, '%22');
  } catch {
    return '';
  }
}

function offerDescription({ title, discount, description = '' } = {}) {
  const supplied = compact(description);
  const product = improveOfferTitle(title);
  const sameAsTitle = normalized(supplied) === normalized(product)
    || normalized(supplied) === normalized(title);
  const usableDescription = supplied
    && !sameAsTitle
    && !/oferta publicada en chollos al dia/i.test(supplied)
    ? supplied
    : '';

  if (usableDescription) return trimAtWord(usableDescription, 210);
  const discountText = Number(discount) > 0
    ? ` con un ${Math.round(Number(discount))}% de descuento`
    : ' a un precio rebajado';
  return trimAtWord(`Una buena oportunidad para conseguir ${product}${discountText}. Revisa el stock y las condiciones antes de finalizar la compra.`, 210);
}

export function formatTelegramDealCard({
  title,
  store,
  price,
  previousPrice = '',
  savings = '',
  discount = 0,
  highlight = '',
  coupon = '',
  url = '',
  description = '',
} = {}) {
  const storeTag = storeHashtag(store);
  const discountLabel = Number(discount) > 0 ? ` · <b>−${Math.round(Number(discount))}%</b>` : '';
  const savingsText = savings ? `Ahorras <b>${escapeHtml(savings)}</b>${discountLabel}` : (discountLabel ? `Descuento${discountLabel}` : 'Precio sujeto a stock');
  const actionLine = coupon
    ? `🔻 Usa el cupón <code>${escapeHtml(coupon)}</code> al tramitar`
    : highlight
      ? `🔻 ${escapeHtml(highlight)}`
      : `🔻 ${savingsText}`;
  const offerLink = escapeUrl(url);
  const linkLine = offerLink
    ? `<a href="${offerLink}">👉🏻 Ver oferta en ${escapeHtml(store)}</a>`
    : '👉🏻 Consulta la oferta antes de que cambie el precio';

  return [
    `<b>${escapeHtml(improveOfferTitle(title))}</b> #${storeTag}`,
    '',
    `✨ ${escapeHtml(offerDescription({ title, discount, description }))}`,
    '',
    previousPrice ? `📛 <b>PVP:</b> <s>${escapeHtml(previousPrice)}</s>` : '',
    `💶 <b>PRECIO OFERTA:</b> <b>${escapeHtml(price)}</b> 💥`,
    actionLine,
    '',
    linkLine,
    '',
    '🪐 Más ofertas en @aldiachollos #Publi',
    `🔥 TOP CHOLLOS ${escapeHtml(store).toUpperCase()}`,
  ].filter((line, index) => line || index === 1 || index === 3 || index === 7 || index === 9).join('\n').slice(0, 1000);
}

export function formatWebsiteDealText({ title, store, price, previousPrice = '', savings = '', discount = 0 } = {}) {
  const before = previousPrice ? `Antes: ${previousPrice}  →  ` : '';
  const saving = savings ? `\nAhorras: ${savings}` : '';
  const percentage = Number(discount) > 0 ? ` · −${Math.round(Number(discount))}%` : '';
  return [
    `CHOLLO EN ${compact(store).toUpperCase()}`,
    improveOfferTitle(title),
    `${before}Ahora: ${price}${percentage}${saving}`,
  ].join('\n');
}
