import { couponOptions } from './coupon-options.mjs';

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

function escapeCaptionField(value, budget) {
  const characters = Array.from(compact(value));
  while (escapeHtml(characters.join('')).length > budget) characters.pop();
  return escapeHtml(characters.join(''));
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

export function shareOfferUrl(offer = {}, siteUrl = 'https://chollosaldia.com') {
  const webUrl = trackedPublicOfferUrl(offer, siteUrl);
  if (!webUrl) return '';
  const title = trimAtWord(improveOfferTitle(offer.title || 'Mira este chollo'), 90);
  const params = new URLSearchParams({
    url: webUrl,
    text: `🔥 ${title}\nEncontrado en @aldiachollos`,
  });
  return `https://t.me/share/url?${params.toString()}`;
}

export function purchaseButtonLabel(store = '') {
  const normalizedStore = normalized(store);
  if (normalizedStore.includes('amazon')) return '🛒 VER EN AMAZON';
  if (normalizedStore.includes('aliexpress')) return '🛒 VER EN ALIEXPRESS';
  if (normalizedStore.includes('miravia')) return '🛒 VER EN MIRAVIA';
  if (normalizedStore.includes('mediamarkt')) return '🛒 VER EN MEDIAMARKT';
  if (normalizedStore.includes('pccomponentes')) return '🛒 VER EN PCCOMPONENTES';
  return '🛒 VER OFERTA';
}

export function offerReplyMarkup(offer = {}, purchaseLabel = '') {
  const rows = [];
  if (offer.url) rows.push([{ text: purchaseLabel || purchaseButtonLabel(offer.store), url: offer.url }]);
  const webUrl = trackedPublicOfferUrl(offer);
  if (webUrl) rows.push([
    { text: '📋 VER FICHA', url: webUrl },
    { text: '📤 COMPARTIR', url: shareOfferUrl(offer) },
  ]);
  return rows.length ? { inline_keyboard: rows } : undefined;
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
  if (/(?:^|\s)(?:[úu]ltimos?|nuevos?|oferta|preciazo|chollazo|latest|new|official|oficial)(?:\s|$)/iu.test(before)) return '';
  return before.replace(/[,.·|]+$/u, '').trim();
}

/**
 * Reduces catalogue-style titles to a short, factual headline.  It only uses
 * words already present in the supplier's title, and falls back safely when a
 * product does not match one of the common deal types.
 */
export function improveOfferTitle(value = '') {
  let original = compact(value)
    .replace(/^(?:🔥|✨|💥|⚡|🛍️|\s)+/gu, '')
    .replace(/^(?:(?:super\s+)?ofert(?:a|ón)|chollo|precio\s+incre[ií]ble)\s*[:!·|—-]*\s*/iu, '')
    .replace(/^(?:preciazo|chollazo|[úu]ltimos?|nuevos?)\b\s*[:!·|—-]*\s*/iu, '')
    .replace(/\s+(?:[úu]ltimos?|nuevos?)\s*$/iu, '')
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

  if (/estrella galicia/.test(text)) {
    const pack=original.match(/\b(\d+)\s*(botellas?|latas?)\b/iu);
    const size=original.match(/\b(\d+(?:[.,]\d+)?)\s*cl\b/iu);
    return `Estrella Galicia${/especial/.test(text)?' Especial':''}${pack?` · ${pack[1]} ${pack[2].toLowerCase()}`:''}${pack&&size?` de ${size[1]} cl`:''}`;
  }

  if (/realme 16 pro plus/.test(text)) return 'realme 16 Pro+ 5G · AMOLED 144 Hz · cámara de 200 MP';
  if (/aspirador de colchones/.test(text) && /taurus/.test(text)) return 'Aspirador de colchones Taurus Textile Care con luz UV-C';
  if (/xiaomi compact hair dryer h101/.test(text)) return 'Secador plegable Xiaomi Compact Hair Dryer H101';
  if (/timex.*orologio.*expedition/.test(text)) return 'Reloj Timex Expedition';
  if (/tostadora/.test(text) && /2 ranuras/.test(text)) return 'Tostadora de 2 ranuras anchas con 9 niveles de dorado';
  if (/unigardia.*bancal/.test(text)) return 'Bancal elevado modular UNIGARDIA 9 en 1 · 240×60×43 cm';
  if (/colgate.*advanced white/.test(text)) return 'Pasta de dientes Colgate Advanced White · pack de 12';
  if (/carpa de camping/.test(text)) return 'Carpa de camping impermeable para 3–4 personas';
  if (/ezviz.*camara/.test(text)) return 'Cámara de vigilancia solar EZVIZ 6 MP con batería';
  if (/vexilar c9.*aspir/.test(text)) return 'Aspiradora con cable Vexilar C9 · 70 kPa';
  if (/ferplast.*cama para perro/.test(text)) return 'Cama cojín Ferplast para perros · tejido resistente';
  if (/gipp.*paellera/.test(text)) return 'Paellera Gipp de aluminio de 36 cm con revestimiento cerámico';
  if (/jack.*jones.*jpstbowie/.test(text)) return 'Pantalón corto JACK & JONES JPSTBOWIE';
  if (/nelko p21.*etiquetadora/.test(text)) return 'Etiquetadora térmica adhesiva Nelko P21';
  if (/relaxty.*suelo gimnasio/.test(text)) return 'Suelo protector de gimnasio RELAXTY · 18 piezas';
  if (/braun series 6.*afeitadora/.test(text)) return 'Afeitadora eléctrica Braun Series 6';
  if (/songmics.*silla de oficina/.test(text)) return 'Silla de oficina SONGMICS OBN043BH02';
  if (/bascula de bano.*grasa corporal/.test(text)) return 'Báscula inteligente de baño con análisis corporal y app';
  if (/nyx.*brow glue/.test(text)) return 'Gel fijador de cejas NYX The Brow Glue';

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
    return brand ? trimAtWord(`Auriculares${wireless} ${brand}`) : trimAtWord(original,94);
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

export function offerEditorialHook({ title = '', price = 0, discount = 0 } = {}) {
  const identity = normalized(title);
  const variants = Number(discount) >= 50
    ? ['Superoferta', 'Chollo irresistible']
    : Number(discount) >= 30
      ? ['Chollo destacado', 'Gran oferta']
      : Number(price) > 0 && Number(price) <= 15
        ? ['Ofertita', 'Pequeño chollo']
        : Number(discount) >= 15
          ? ['Buena oferta', 'Chollo del día']
          : ['Para tener en el radar', 'Un hallazgo para tu lista'];
  const score = Array.from(identity).reduce((total, character) => total + character.codePointAt(0), 0);
  return variants[score % variants.length];
}

export function telegramOfferOpening({title='',store='',coupon='',discount=0}={}) {
  const identity=normalized(title);
  const general=['💚 ¿Lo tenías en mente? Aquí tienes un chollo.','👀 Ese capricho merece una segunda mirada.','🛍️ Una compra pendiente, un chollo por comparar.','📌 De «algún día lo miro» a echarle un vistazo.'];
  const mobile=/smartphone|telefono|movil|iphone|galaxy|poco |realme/.test(identity);
  const storage=[...new Set([...identity.matchAll(/\b(\d+)\s*gb\b/g)].map(match=>Number(match[1])).filter(size=>size>=64))];
  const battery=[...new Set([...identity.matchAll(/\b(\d{4,5})\s*mah\b/g)].map(match=>match[1]))];
  const pack=identity.match(/\bpack\s*(?:de\s*)?(\d+)\b/) || identity.match(/\b(\d+)\s*(?:botellas?|latas?|unidades)\b/);
  const themed=/auriculares|headphones|earbuds|altavoz/.test(identity)
    ? /cancelacion.*ruido|noise.cancell/.test(identity)
      ? ['🎧 Menos ruido. Más de tu música.','🎧 Tu música en primer plano.','🎧 Dale al play. El ruido de fondo, en segundo plano.']
      : ['🎧 La banda sonora la eliges tú.','🎵 Tu próxima pausa empieza con darle al play.','🎧 Un chollo para ponerle música al día.']
    : mobile && storage.length===1
      ? [`📱 ${storage[0]} GB para tu próximo cambio de móvil.`,`📲 ¿Tu móvil pide relevo? Este viene con ${storage[0]} GB.`,`📱 ${storage[0]} GB: un dato para comparar antes de cambiar.`]
    : mobile && battery.length===1
      ? [`🔋 ${battery[0]} mAh: la batería tiene protagonismo.`,`📱 Un candidato con batería de ${battery[0]} mAh.`,`🔋 ¿Buscas batería? Aquí hay ${battery[0]} mAh.`]
    : mobile
      ? ['📱 ¿Tu móvil ya pide relevo?','📲 Cambiar de móvil empieza por comparar bien.','📱 Tu próximo móvil podría estar en esta oferta.']
    : /robot.*aspira|aspira.*robot/.test(identity)
      ? ['🧹 Menos escoba. Más sofá.','🏡 Que la limpieza no se lleve toda la tarde.','🧹 Un fichaje para jubilar unas cuantas pasadas de escoba.']
    : /cafetera/.test(identity)
      ? ['☕ Tu próxima cafetería puede estar en casa.','☕ El primer café del día se merece su rincón.','☕ Un chollo para empezar la mañana a tu manera.']
    : /freidora/.test(identity)
      ? ['🍟 Tu cocina tiene un nuevo candidato.','🍽️ Un fichaje para darle otra vuelta al menú.','🍟 La próxima cena empieza con una idea.']
    : /ventilador/.test(identity)
      ? ['🌬️ Que el calor no te marque el día.','🌬️ Un poco de aire para tu rincón de casa.','🏡 Ponle aire nuevo a esa habitación.']
    : pack && /coca.cola|cafe|galletas|leche|chocolate|mayonesa|cerveza|estrella galicia|atun/.test(identity)
      ? [`🛒 Un pack de ${pack[1]} para tu próxima compra.`,`📦 Pack de ${pack[1]}: hoy miramos la despensa.`,`🛍️ La lista de la compra también tiene sus chollos: pack de ${pack[1]}.`]
    : /jamon|coca.cola|cafe|galletas|leche|chocolate|mayonesa|cerveza|estrella galicia|aceite de oliva/.test(identity)
      ? ['🛒 La despensa también tiene sus chollos.','🍽️ Hoy el chollo se sienta a la mesa.','🛍️ Un fichaje para la próxima lista de la compra.']
    : /monitor|teclado|raton|pantalla/.test(identity)
      ? ['🖥️ Tu setup también merece una puesta a punto.','⌨️ Un nuevo candidato para tu escritorio.','🖥️ Dale otra vuelta a tu rincón de trabajo.']
    : [];
  // Prefer the actual product/use case over a generic coupon or hype label.
  const choices=themed.length ? themed : couponOptions(coupon).codes.length
    ? ['🎟️ El detalle está en el código: lo tienes abajo.','✂️ Antes de pagar, pasa por el cupón.','🎟️ Un chollo con código propio.'] : general;
  // Stable by product, not random on every retry or preview regeneration.
  let seed=2166136261;
  for(const char of `${identity}|${normalized(store)}`) seed=Math.imul(seed^char.codePointAt(0),16777619)>>>0;
  return choices[seed%choices.length];
}

export function editorialOfferHeadline({ title = '', store = '', price = '', discount = 0, coupon = '' } = {}) {
  const product = improveOfferTitle(title);
  const priceLabel = compact(price);
  const percentage = Math.round(Number(discount) || 0);
  if (coupon) return `${product}${priceLabel ? ` por ${priceLabel}` : ''} con cupón en ${store}`;
  if (percentage >= 15) return `${product}${priceLabel ? ` por ${priceLabel}` : ''} · −${percentage}% en ${store}`;
  return `${product}${priceLabel ? ` por ${priceLabel}` : ''} en ${store}`;
}

function offerDescription({ title, discount, description = '' } = {}) {
  const supplied = compact(description);
  const product = improveOfferTitle(title);
  const sameAsTitle = normalized(supplied) === normalized(product)
    || normalized(supplied) === normalized(title)
    || (normalized(product).length > 28 && normalized(supplied).startsWith(normalized(product).replace(/…$/u, '')))
    || (normalized(supplied).length > 28 && normalized(title).startsWith(normalized(supplied)));
  const usableDescription = supplied
    && !sameAsTitle
    && !/oferta publicada en chollos al dia/i.test(normalized(supplied))
    && !/oferta reenviada/i.test(normalized(supplied))
    ? supplied
    : '';

  if (usableDescription) return trimAtWord(usableDescription, 210);
  const titleText = normalized(title);
  if (/ventilador/.test(titleText)) {
    const facts = [
      /3\s+velocidades/.test(titleText) && '3 velocidades',
      /aspas.*aluminio/.test(titleText) && 'aspas de aluminio',
      /silencios/.test(titleText) && 'funcionamiento silencioso',
    ].filter(Boolean);
    if (facts.length > 1) return `${facts.slice(0,-1).join(', ')} y ${facts.at(-1)}.`;
  }
  if (/baliza\s+v16/.test(titleText)) {
    const facts = [/360\s*°/.test(titleText) && 'Visibilidad 360°', /dgt\s*3[.,]0/.test(titleText) && 'conexión DGT 3.0', /imantad/.test(titleText) && 'base imantada'].filter(Boolean);
    if (facts.length) return `${facts.join(' · ')}.`;
  }
  if (Number(discount) > 0) {
    return '';
  }
  return '';
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
  couponDiscount = 0,
  couponMinimumSpend = 0,
  description = '',
} = {}) {
  const options = couponOptions(coupon);
  // Never shorten a code: that would turn it into a different, invalid coupon.
  const codes = options.codes.filter(code => escapeHtml(code).length <= 50).slice(0, 3);
  const couponLines = codes.map((code, index) => `${index ? '↳ Alternativa' : '🎟️ Cupón'}: <code>${escapeHtml(code)}</code>`).join('\n');
  const cashbackLine = options.cashback.length ? 'ℹ️ Cashback aparte: no lo descontamos del precio de compra.' : '';
  const storeTag = storeHashtag(store);
  const percentage = Math.round(Number(discount));
  const discountLabel = percentage > 0 && percentage < 100 ? ` · <b>−${percentage}%</b>` : '';
  const couponCondition = Number(couponDiscount) > 0 && Number(couponMinimumSpend) > 0
    ? ` · descuenta ${escapeHtml(new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(couponDiscount)))} desde ${escapeHtml(new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(couponMinimumSpend)))}`
    : '';
  const actionLine = codes.length
    ? `${couponLines}${couponCondition}\n${codes.length > 1 ? 'Usa solo uno de estos códigos. ' : ''}📲 Cópialo y aplícalo al pagar. Comprueba el total en la cesta y si el descuento ya está aplicado.${cashbackLine ? `\n${cashbackLine}` : ''}`
    : highlight
      ? `🔻 ${escapeCaptionField(highlight, 140)}`
      : cashbackLine;
  const linkLine = `🛒 <b>Ver en ${escapeCaptionField(store || 'la tienda', 40)}</b>\n👇 Toca el botón para elegir tu variante y comprar`;
  const kicker = telegramOfferOpening({title,store,coupon:codes.join(' / '),discount});
  const headline = `<b>${escapeHtml(kicker)}</b>\n\n<b>${escapeCaptionField(trimAtWord(improveOfferTitle(title), 130), 220)}</b>\n#${escapeCaptionField(storeTag, 40)}${discountLabel}`;
  const priceBlock = [
    `💶 <b>PRECIO OFERTA: ${escapeCaptionField(price, 60)}</b>`,
    previousPrice ? `↘️ Antes: <s>${escapeCaptionField(previousPrice, 60)}</s>` : '',
    savings ? `💰 <b>Te ahorras ${escapeCaptionField(savings, 60)}</b>` : '',
  ].filter(Boolean).join('\n');

  const details = offerDescription({ title, discount, description });
  const render = (withDescription = true, withOptionalNote = true) => [
    headline,
    withDescription && details ? `✨ ${escapeHtml(trimAtWord(details, 150))}` : '',
    priceBlock,
    codes.length || withOptionalNote ? actionLine : '',
    withOptionalNote && codes.length && highlight ? `📌 ${escapeCaptionField(highlight,120)}` : '',
    linkLine,
    `🔔 Sigue @aldiachollos · #Publi`,
  ].filter(Boolean).join('\n\n');
  // Budget complete blocks, never slice HTML tags or entities in a caption.
  return render().length <= 1000 ? render() : render(false).length <= 1000 ? render(false) : render(false, false);
}

export function formatWebsiteDealText({ title, store, price, previousPrice = '', savings = '', discount = 0, coupon = '', description = '' } = {}) {
  const before = previousPrice ? `Antes: ${previousPrice}  →  ` : '';
  const saving = savings ? `\nAhorras: ${savings}` : '';
  const percentage = Number(discount) > 0 ? ` · −${Math.round(Number(discount))}%` : '';
  return [
    `CHOLLO EN ${compact(store).toUpperCase()}`,
    improveOfferTitle(title),
    description ? compact(description) : '',
    `${before}Ahora: ${price}${percentage}${saving}`,
    coupon ? `Cupón: ${compact(coupon).slice(0, 40)}` : '',
  ].filter(Boolean).join('\n');
}
