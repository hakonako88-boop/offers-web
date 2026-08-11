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
  title?: string;
  text?: string;
  image?: string;
  url?: string;
  price?: string;
  previousPrice?: string;
  store?: string;
  category?: string;
  date?: number;
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
  return String(value ?? "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/^(OFERT[ÓO]N\s+(AMAZON|ALIEXPRESS|MIRAVIA)\s*[-–—:]?\s*)/i, "")
    .replace(/\b(\d+)\s*[xX×]\s*(\d+)\s*Cm\b/gu, "$1×$2 cm")
    .trim();
}

function categoryFor(offer: LegacyOffer) {
  const directCategory = String(offer.category ?? "").trim();
  const text = normalise(`${directCategory} ${offer.title ?? ""} ${offer.text ?? ""}`);
  if (/tecnolog|electron|informat|mobile|telefono|data|memory|software/.test(text)) return "Tecnología";
  if (/gaming|consola|videojuego/.test(text)) return "Videojuegos";
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

export const publishedDeals: PublishedDeal[] = (rawOffers as LegacyOffer[]).flatMap((offer) => {
  const id = sourceId(offer);
  const price = parsePrice(offer.price);
  const previous = parsePrice(offer.previousPrice);
  const title = cleanTitle(offer.title);
  if (!id || !price || !title || !offer.url || !offer.image) return [];
  const date = formatDate(offer.date);
  return [{
    id,
    title,
    store: offer.store === "Amazon" || offer.store === "AliExpress" || offer.store === "Miravia" ? offer.store : "Tienda online",
    category: categoryFor(offer),
    price,
    oldPrice: previous > price ? previous : price,
    coupon: couponFor(offer.text),
    imageUrl: offer.image,
    affiliateUrl: offer.url,
    verifiedAt: date.label,
    verifiedDate: date.dateTime,
  }];
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
