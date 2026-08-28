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

export function publicOfferUrl(id, siteUrl = 'https://chollosaldia.com') {
  const cleanId = String(id || '').trim().replace(/[^a-z0-9._~-]+/giu, '-').replace(/^-+|-+$/gu, '');
  if (!cleanId) return '';
  return `${String(siteUrl).replace(/\/$/u, '')}/oferta/${encodeURIComponent(cleanId)}/`;
}

function campaignSlug(value = '') {
  return normalized(value)
    .replace(/[^a-z0-9]+/gu, '_')
    .replace(/^_+|_+$/gu, '')
    .slice(0, 50) || 'general';
}

export function trackedPublicOfferUrl(offer = {}, siteUrl = 'https://chollosaldia.com') {
  const base = publicOfferUrl(offer.id, siteUrl);
  if (!base) return '';
  const inferredStore = String(offer.id || '').split(/[-_:]/u)[0];
  const store = campaignSlug(offer.storeSlug || offer.store || inferredStore);
  const sourceType = campaignSlug(offer.kind || 'oferta');
  const params = new URLSearchParams({
    utm_source: 'telegram',
    utm_medium: 'social',
    utm_campaign: `ofertas_${store}`,
    utm_content: sourceType,
  });
  return `${base}?${params.toString()}`;
}

export function offerReplyMarkup(offer = {}, purchaseLabel = '🛒 COMPRAR') {
  const actions = [];
  if (offer.url) actions.push({ text: purchaseLabel, url: offer.url });
  const webUrl = trackedPublicOfferUrl(offer);
  if (webUrl) actions.push({ text: '📋 DETALLES', url: webUrl });
  return actions.length ? { inline_keyboard: [actions] } : undefined;
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
  let original = compact(value)
    .replace(/^[🔥✨💥⚡🛍️\s]+/gu, '')
    .replace(/^(?:(?:super\s+)?ofert(?:a|ón)|chollo|precio\s+incre[ií]ble)\s*[:!·|—-]*\s*/iu, '')
    .replace(/\s*(?:\|\s*)?#(?:publicidad|publi|oferta(?:flash)?|chollos?)(?:\s+#[\p{L}\p{N}_]+)*\s*$/giu, '')
    .replace(/\b(\d+)\s*[xX×]\s*(\d+)\s*Cm\b/gu, '$1×$2 cm')
    .replace(/\bCm\b/gu, 'cm');
  const letters = original.match(/\p{L}/gu) || [];
  const uppercase = original.match(/\p{Lu}/gu) || [];
  if (letters.length >= 12 && uppercase.length / letters.length > 0.82) {
    original = `${original.charAt(0).toLocaleUpperCase('es')}${original.slice(1).toLocaleLowerCase('es')}`;
    for (const acronym of ['SPARK', 'USB', 'DGT', 'LED', 'HDMI', 'SSD', 'RAM', 'OLED', 'QLED', 'JBL']) {
      original = original.replace(new RegExp(`\\b${acronym}\\b`, 'giu'), acronym);
    }
  }
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

  if (/ventilador/.test(text)) {
    const brand = original.match(/\b(SPARK)\b/iu)?.[1] || '';
    const inches = original.match(/\b(?:de\s+)?(\d{1,2})\s*(?:"|pulgadas?\b)/iu)?.[1] || '';
    const power = original.match(/\b(\d{2,4})\s*W\b/iu)?.[1] || '';
    return trimAtWord(`Ventilador${brand ? ` ${brand}` : ''}${inches ? ` de sobremesa · ${inches}"` : ''}${power ? ` · ${power} W` : ''}`);
  }

  if (/baliza\s+v16|luz\s+de\s+emergencia.*(?:dgt|coche)/.test(text)) {
    const connected = /dgt\s*3[.,]?0|geolocaliz/.test(text) ? ' con geolocalización' : '';
    return `Baliza V16 DGT${connected} para coche`;
  }

  if (/auriculares|headphones|earbuds/.test(text)) {
    if (/^auriculares(?:\s+inal[aá]mbricos)?\b/i.test(original)) return trimAtWord(original);
    const brand = brandBefore(original, /(?:auriculares|headphones|earbuds)/i);
    const wireless = /inalambr|bluetooth|wireless/.test(text) ? ' inalámbricos' : '';
    return trimAtWord(`Auriculares${wireless}${brand ? ` ${brand}` : ''}`);
  }

  return trimAtWord(original, 94);
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

function offerDescription({ title, discount, description = '' } = {}) {
  const supplied = compact(description);
  const product = improveOfferTitle(title);
  const sameAsTitle = normalized(supplied) === normalized(product)
    || normalized(supplied) === normalized(title);
  const usableDescription = supplied
    && !sameAsTitle
    && !/oferta publicada en chollos al dia/i.test(supplied)
    && !/oferta reenviada/i.test(supplied)
    ? supplied
    : '';

  if (usableDescription) return trimAtWord(usableDescription, 210);
  const titleText = normalized(title);
  if (/ventilador/.test(titleText)) {
    const speeds = /3\s+velocidades/.test(titleText) ? '3 velocidades, ' : '';
    const blades = /aspas.*aluminio/.test(titleText) ? 'aspas de aluminio y ' : '';
    const quiet = /silencios/.test(titleText) ? 'funcionamiento silencioso' : 'dirección ajustable';
    return trimAtWord(`Ventilador de sobremesa con ${speeds}${blades}${quiet}. Ideal para refrescar espacios pequeños.`, 210);
  }
  if (/baliza\s+v16|luz\s+de\s+emergencia.*(?:dgt|coche)/.test(titleText)) {
    return 'Baliza de emergencia V16 con visibilidad 360°, conexión DGT 3.0 y base imantada para el coche.';
  }
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
  description = '',
} = {}) {
  const storeTag = storeHashtag(store);
  const discountLabel = Number(discount) > 0 ? ` · <b>−${Math.round(Number(discount))}%</b>` : '';
  const savingsText = savings ? `Ahorras <b>${escapeHtml(savings)}</b>${discountLabel}` : (discountLabel ? `Descuento${discountLabel}` : 'Precio sujeto a stock');
  const actionLine = coupon
    ? `🎟️ Usa el cupón <code>${escapeHtml(coupon)}</code> al tramitar${highlight ? `\n📈 ${escapeHtml(highlight)}` : ''}`
    : highlight
      ? `🔻 ${escapeHtml(highlight)}`
      : `🔻 ${savingsText}`;
  const linkLine = '👇🏻 <b>Toca COMPRAR</b> para ir directamente a la tienda';

  return [
    `🔥 <b>${escapeHtml(improveOfferTitle(title))}</b> · #${storeTag}`,
    '',
    `✨ ${escapeHtml(offerDescription({ title, discount, description }))}`,
    '',
    previousPrice ? `📛 <b>PVP:</b> <s>${escapeHtml(previousPrice)}</s>` : '',
    `💶 <b>PRECIO OFERTA:</b> <b>${escapeHtml(price)}</b> 💥`,
    actionLine,
    '',
    linkLine,
    '',
    '🔔 <b>Sigue @aldiachollos</b> para recibir los próximos chollos · Compártelo si puede ayudar',
  ].filter((line, index) => line || index === 1 || index === 3 || index === 7 || index === 9).join('\n').slice(0, 1000);
}

export function formatWebsiteDealText({ title, store, price, previousPrice = '', savings = '', discount = 0, coupon = '' } = {}) {
  const before = previousPrice ? `Antes: ${previousPrice}  →  ` : '';
  const saving = savings ? `\nAhorras: ${savings}` : '';
  const percentage = Number(discount) > 0 ? ` · −${Math.round(Number(discount))}%` : '';
  return [
    `CHOLLO EN ${compact(store).toUpperCase()}`,
    improveOfferTitle(title),
    `${before}Ahora: ${price}${percentage}${saving}`,
    coupon ? `Cupón: ${compact(coupon).slice(0, 40)}` : '',
  ].filter(Boolean).join('\n');
}
