import rawOffers from "../../data/offers.json";

export type PublishedDeal = {
  id: string;
  title: string;
  store: string;
  category: string;
  price: number;
  oldPrice: number;
  coupon?: string;
  imageUrl: string;
  affiliateUrl: string;
  verifiedAt: string;
  verifiedDate?: string;
};

type LegacyOffer = {
  message_id?: number;
  chollometroId?: string;
  source_product_id?: string;
  title?: string;
  text?: string;
  image?: string;
  url?: string;
  price?: string;
  previousPrice?: string;
  coupon?: string;
  store?: string;
  category?: string;
  date?: number;
  source?: string;
};

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function parsePrice(value?: string) {
  const normalized = String(value ?? "")
    .replace(/[^\d,.]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalise(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-ES");
}

function cleanTitle(value?: string) {
  const original = String(value ?? "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/^(OFERT[ÓO]N\s+(AMAZON|ALIEXPRESS|MIRAVIA)\s*[-–—:]?\s*)/i, "")
    .replace(/\s*[|·-]?\s*#(?:Amazon|AliExpress|Miravia|Publicidad|Publi|OfertaFlash)\b/giu, "")
    .replace(/\s*\[(?:en\s+stock|disponible|oferta)\]\s*$/iu, "")
    .replace(/\b(\d+)\s*[xX×]\s*(\d+)\s*Cm\b/gu, "$1×$2 cm")
    .trim();
  const text = normalise(original);
  if (!original) return "Oferta destacada";
  if (/maison alhambra jean lowe fantasme/.test(text)) return "Maison Alhambra Jean Lowe Fantasme Eau de Parfum 100 ml";
  if (/playstation gran turismo 7/.test(text)) return "Gran Turismo 7 Standard Edition para PS4 · edición física PAL España";
  if (/13 sentinels aegis rim/.test(text)) return "13 Sentinels: Aegis Rim para PS4 · edición física PAL España";
  if (/battlefield 2042.*ps4/.test(text)) return "Battlefield 2042 para PS4 · edición física";
  if (/relleno\s+de\s+cojin/.test(text)) {
    const brand = original.match(/(?:^|\s)([\p{L}\p{N}-]{2,})\s+Relleno\s+de\s+Coj[ií]n/iu)?.[1]
      || original.match(/Relleno\s+de\s+Coj[ií]n\s+([\p{L}\p{N}-]{2,})/iu)?.[1]
      || "";
    const size = original.match(/\b(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)\b/i);
    return `Relleno de cojín${brand ? ` ${brand}` : ""}${size ? ` ${size[1]}×${size[2]} ${size[3].toLowerCase()}` : ""}${/siliconad/.test(text) ? " de fibra siliconada" : ""}`;
  }
  if (/sandalia/.test(text)) {
    const brand = original.match(/\b[A-Z]{3,}\b/)?.[0] || "";
    return `Sandalias de fiesta para mujer${brand ? ` ${brand}` : ""}`;
  }
  if (/bolso/.test(text) && /mujer|women/.test(text)) return "Bolso de mujer para ocasiones especiales";
  if (/mantel|table cloth/.test(text)) return "Mantel impermeable y fácil de limpiar";
  if (/cuaderno|notebook/.test(text)) return "Cuaderno con accesorios";
  if (/robot/.test(text) && /nino|educacion|ai/.test(text)) return "Robot educativo interactivo para niños";
  if (/alfombrilla.*(?:raton|mouse)|mousepad/.test(text)) return `Alfombrilla gaming${/charizard/.test(text) ? " Charizard" : ""}${/xxl/.test(text) ? " XXL" : ""}`;
  if (/freidora.*aire/.test(text) && /silicona/.test(text)) return "Molde de silicona para freidora de aire";
  return original;
}

function categoryFor(offer: LegacyOffer) {
  // A few recent Miravia records arrive with the generic feed department
  // “Tecnología” even though the identified products are console games.
  // Their Telegram message id is stable and avoids guessing from a future,
  // unrelated product that happens to contain a gaming word.
  if ([4488, 4486, 4481, 4478].includes(Number(offer.message_id))) return "Videojuegos";
  const directCategory = String(offer.category ?? "").trim();
  const text = normalise(`${directCategory} ${offer.title ?? ""} ${offer.text ?? ""}`);
  if (/tecnolog|electron|informat|mobile|telefono|data|memory|software/.test(text)) return "Tecnología";
  if (/gaming|consola|videojuego|playstation|\bps[345]\b|nintendo|switch|xbox|battlefield|gran turismo|13 sentinels/.test(text)) return "Videojuegos";
  if (/cafe|capsula|freidora|aceite|cocina|taper/.test(text)) return "Cocina";
  if (/hogar|vileda|piscina|jardin|mueble|limpieza|bedding|bath|pillow/.test(text)) return "Hogar";
  if (/herramienta|bricolaje|diy|taladro/.test(text)) return "Bricolaje";
  if (/juguete|tamagotchi|muneco|nino|toy|baby/.test(text)) return "Juguetes";
  if (/reloj|moda|barba|gillette|fashion|ropa|calzado|bolso|bag/.test(text)) return "Moda";
  if (/belleza|beauty|salud|health/.test(text)) return "Belleza";
  if (/deporte|sport/.test(text)) return "Deporte";
  return directCategory && directCategory.length <= 30 ? directCategory : "Ofertas";
}

function couponFor(text?: string) {
  return text?.match(/CUP[ÓO]N(?:ES|\s+DESCUENTO)?\s*:?\s*([A-Z0-9-]{3,24})/i)?.[1];
}

function formatDate(timestamp?: number) {
  if (!timestamp) return { label: "Revisado recientemente", dateTime: undefined };
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return { label: "Revisado recientemente", dateTime: undefined };
  return {
    label: `Revisado el ${date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`,
    dateTime: date.toISOString(),
  };
}

function sourceId(offer: LegacyOffer) {
  return String(offer.chollometroId || offer.message_id || offer.url || "");
}

function isUsefulTitle(title: string) {
  const compact = title.trim();
  if (compact.length < 8 || /^https?:\/\//i.test(compact)) return false;
  if (/^(?:precio|oferta)\s*\d+(?:[,.]\d{1,2})?\s*(?:€|eur)?$/i.test(compact)) return false;
  if (compact.split(/\s+/).length > 22) return false;
  if (/\b(?:malla|relleno|mantel|servilleta|brida|pegatina|recambio|repuesto|funda|protector|barra de mantequilla|cuerda deformable)\b/i.test(compact)) return false;
  return /\p{L}/u.test(compact);
}

function isValidManualTitle(title: string) {
  const compact = title.trim();
  if (compact.length < 8 || /^https?:\/\//i.test(compact) || !/\p{L}/u.test(compact)) return false;
  // These are placeholders produced by blocked or incomplete shop pages. A
  // price and a photo are not enough if visitors cannot identify the item.
  if (/^(?:auriculares|producto|art[ií]culo|oferta|amazon|aliexpress|miravia)$/iu.test(compact)) return false;
  if (/\b(?:en stock|loading|undefined|null)\b/iu.test(compact)) return false;
  return true;
}

function conciseTitle(title: string, maximumWords = 18) {
  const words = title.trim().split(/\s+/);
  if (words.length <= maximumWords) return title.trim();
  return `${words.slice(0, maximumWords).join(" ").replace(/[,.·;:]+$/, "")}…`;
}

function isSupportedAffiliateUrl(value: string, store: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (/[%]22|["']|t\.href|%3c|%3e/i.test(value)) return false;
    if (store === "Amazon") return /(^|\.)amazon\./.test(host) || host === "amzn.to";
    if (store === "AliExpress") return host === "s.click.aliexpress.com" || host === "a.aliexpress.com" || host.endsWith(".aliexpress.com");
    if (store === "Miravia") return host === "www.awin1.com" || host === "awin1.com" || host.endsWith(".miravia.es");
    return false;
  } catch {
    return false;
  }
}

function isRecent(timestamp?: number) {
  if (!timestamp) return false;
  const publishedAt = Number(timestamp) * 1000;
  const maximumAge = 14 * 24 * 60 * 60 * 1000;
  return Number.isFinite(publishedAt) && publishedAt <= Date.now() + 60_000 && (Date.now() - publishedAt) <= maximumAge;
}

/** Legacy Miravia imports contained a run of low-intent catalogue products.
 * Keep the storefront selective without deleting the historical source data
 * or blocking an offer explicitly sent by the owner through Telegram. */
function isWebworthyMiraviaOffer(offer: LegacyOffer, title: string, price: number) {
  if (offer.store !== "Miravia" || /^telegram-/i.test(String(offer.source || "")) || /^manual-/i.test(String(offer.source_product_id || ""))) return true;
  const text = normalise(`${offer.category ?? ""} ${title}`);
  const usefulDepartments = /tecnolog|electron|informat|mobile|telefono|data|memory|software|gaming|consola|videojuego|cocina|cafe|freidora|beauty|belleza|salud|health|deporte|sport|juguete|toy|baby|herramienta|bricolaje|diy/.test(text);
  const catalogueTerms = /\b(?:correa|cuerda|malla|relleno|mantel|bolso|cardigan|sandalia|botin|gafas|cuaderno|papeleria|funda|recambio|repuesto)\b/.test(text);
  return usefulDepartments && !catalogueTerms && price >= 12;
}

const candidates: PublishedDeal[] = (rawOffers as LegacyOffer[]).flatMap((offer) => {
  // Retired channel posts remain in the audit data but must never be exposed
  // by the website, sitemap or feed while we keep a trace for de-duplication.
  if (offer.source === "removed") return [];
  const id = sourceId(offer);
  const price = parsePrice(offer.price);
  const previous = parsePrice(offer.previousPrice);
  const store = offer.store === "Amazon" || offer.store === "AliExpress" || offer.store === "Miravia" ? offer.store : "";
  const coupon = String(offer.coupon || couponFor(offer.text) || '').trim() || undefined;
  const hasDemonstrableSaving = previous > price || Boolean(coupon);
  // Offers received from the owner's authorised Telegram chat may contain a
  // current price but no reliable previous-price comparison. They are still
  // useful for the website when all of the product essentials are present.
  // Imported/automatic offers keep the stricter savings-or-coupon rule.
  // Every record written by the Telegram processors has already passed the
  // exact product, price, image and affiliate-link checks.  Source-channel
  // publications often do not expose a trustworthy previous price, so accept
  // their verified current price just as we do for the owner's inbox.
  const isVerifiedTelegramOffer = /^telegram-/i.test(String(offer.source || ""))
    || /^(?:manual-|aliexpress:)/i.test(String(offer.source_product_id || ""));
  const title = conciseTitle(cleanTitle(offer.title), isVerifiedTelegramOffer ? 18 : 22);
  const hasPublishablePrice = hasDemonstrableSaving || isVerifiedTelegramOffer;
  const hasValidTitle = isVerifiedTelegramOffer ? isValidManualTitle(title) : isUsefulTitle(title);
  if (!id || !price || !hasPublishablePrice || !hasValidTitle || !isWebworthyMiraviaOffer(offer, title, price) || !offer.url || !offer.image || !store || !isRecent(offer.date) || !isSupportedAffiliateUrl(offer.url, store)) return [];
  const date = formatDate(offer.date);
  return [{
    id,
    title,
    store,
    category: categoryFor(offer),
    price,
    oldPrice: previous > price ? previous : price,
    coupon,
    imageUrl: offer.image,
    affiliateUrl: offer.url,
    verifiedAt: date.label,
    verifiedDate: date.dateTime,
  }];
});

/** Homepage, sitemap and offer pages share this editorial list. */
function affiliateIdentity(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host === "awin1.com" || host === "www.awin1.com") {
      // Awin uses the same /cread.php or /pclick.php path for every product.
      // The destination/product query value is therefore part of its identity;
      // dropping the complete query collapses unrelated Miravia products.
      const destination = url.searchParams.get("ued");
      if (destination) return `awin-destination:${destination.toLowerCase().replace(/[?#].*$/, "")}`;
      const product = url.searchParams.get("p");
      if (product) return `awin-product:${product.toLowerCase()}`;
    }
    return `${url.origin}${url.pathname}`.toLowerCase().replace(/\/$/, "");
  } catch {
    return value.replace(/\?.*$/, "").toLowerCase();
  }
}

const seenAffiliateUrls = new Set<string>();
export const publishedDeals: PublishedDeal[] = candidates
  .sort((left, right) => Date.parse(right.verifiedDate || "") - Date.parse(left.verifiedDate || ""))
  .filter((deal) => {
    const key = affiliateIdentity(deal.affiliateUrl);
    if (seenAffiliateUrls.has(key)) return false;
    seenAffiliateUrls.add(key);
    return true;
  });

export function dealHref(id: string) {
  return `/oferta/${encodeURIComponent(id)}`;
}

export function getDealById(id: string) {
  return publishedDeals.find((deal) => deal.id === id);
}

export function dealDiscount(deal: Pick<PublishedDeal, "price" | "oldPrice">) {
  return deal.oldPrice > deal.price ? Math.round((1 - deal.price / deal.oldPrice) * 100) : 0;
}

export function dealSavings(deal: Pick<PublishedDeal, "price" | "oldPrice">) {
  return Math.max(0, deal.oldPrice - deal.price);
}

export function dealDescription(deal: PublishedDeal) {
  const savings = dealSavings(deal);
  const discount = dealDiscount(deal);
  const savingText = savings > 0 ? ` Ahorras ${money.format(savings)}${discount ? ` (${discount}% de descuento)` : ""}.` : "";
  return `${deal.title} es una oferta localizada en ${deal.store}. Su precio registrado al publicarla es ${money.format(deal.price)}.${savingText}`;
}
