import { allDeals, PublishedDeal } from "./deals";
import recommendedProductIds from "../../data/editor-recommendations.json";

export type ProductPricePoint = { price: number; checkedAt: string; store: string; availability: "available" | "expired" };
export type PublishedProduct = {
  id: string; slug: string; name: string; category: string; subcategory?: string; imageUrl: string;
  offers: PublishedDeal[]; activeOffers: PublishedDeal[]; bestOffer?: PublishedDeal;
  history: ProductPricePoint[]; historyReady: boolean; minimumPrice?: number; averagePrice?: number; maximumPrice?: number;
  editorRecommended: boolean;
};

function normalise(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("es-ES").replace(/[^a-z0-9]+/gu, " ").trim();
}

function hash(value: string) {
  let result = 2166136261;
  for (const character of value) { result ^= character.charCodeAt(0); result = Math.imul(result, 16777619); }
  return (result >>> 0).toString(16).padStart(8, "0");
}

function slugify(value: string) {
  return normalise(value).split(/\s+/u).slice(0, 10).join("-") || "producto";
}

/** Cross-store grouping is deliberately conservative. A recognisable model
 * token can join listings; otherwise the complete cleaned title stays unique. */
function productKey(deal: PublishedDeal) {
  const title = normalise(deal.title);
  const modelTokens = title.match(/\b(?=[a-z0-9-]{4,}\b)(?=[a-z0-9-]*[a-z])(?=[a-z0-9-]*\d)[a-z0-9-]+\b/gu) || [];
  const meaningfulModels = modelTokens.filter((token) => !/^\d+(?:gb|tb|w|ml|cm|mm|hz|mah|mp)$/u.test(token));
  const brand = title.split(" ").find((token) => token.length >= 3) || "producto";
  if (meaningfulModels.length) return `model:${brand}:${meaningfulModels.slice(0, 3).join(":")}`;
  if (deal.sourceProductId) return `store:${deal.store}:${deal.sourceProductId}`;
  return `title:${title}`;
}

const groups = new Map<string, PublishedDeal[]>();
for (const deal of allDeals) {
  const key = productKey(deal);
  groups.set(key, [...(groups.get(key) || []), deal]);
}

export const publishedProducts: PublishedProduct[] = [...groups.entries()].map(([key, offers]) => {
  const chronological = offers.slice().sort((a, b) => Date.parse(b.verifiedDate || "") - Date.parse(a.verifiedDate || ""));
  const activeByStore = new Map<string, PublishedDeal>();
  for (const offer of chronological.filter((entry) => entry.active)) if (!activeByStore.has(offer.store)) activeByStore.set(offer.store, offer);
  const activeOffers = [...activeByStore.values()].sort((a, b) => a.price - b.price);
  const history = chronological.flatMap((offer) => offer.verifiedDate ? [{ price: offer.price, checkedAt: offer.verifiedDate, store: offer.store, availability: offer.active ? "available" as const : "expired" as const }] : []);
  const distinctChecks = new Set(history.map((point) => point.checkedAt.slice(0, 10)));
  const prices = history.map((point) => point.price);
  const historyReady = history.length >= 3 && distinctChecks.size >= 2;
  const name = chronological[0].title;
  const id = hash(key);
  return {
    id, slug: `${slugify(name)}-${id}`, name, category: chronological[0].category, subcategory: chronological[0].subcategory,
    imageUrl: chronological[0].imageUrl, offers: chronological, activeOffers, bestOffer: activeOffers[0], history,
    historyReady,
    minimumPrice: historyReady ? Math.min(...prices) : undefined,
    averagePrice: historyReady ? prices.reduce((sum, price) => sum + price, 0) / prices.length : undefined,
    maximumPrice: historyReady ? Math.max(...prices) : undefined,
    // This flag is editorial, never inferred from price or affiliate value.
    editorRecommended: recommendedProductIds.includes(id),
  };
}).sort((a, b) => Number(Boolean(b.bestOffer)) - Number(Boolean(a.bestOffer)) || (a.bestOffer?.price || Infinity) - (b.bestOffer?.price || Infinity));

export function productHref(product: Pick<PublishedProduct, "slug">) { return `/producto/${product.slug}/`; }
export function getProductBySlug(slug: string) { return publishedProducts.find((product) => product.slug === slug); }
export function getProductForDeal(deal: PublishedDeal) { return publishedProducts.find((product) => product.offers.some((offer) => offer.id === deal.id)); }
