import { PublishedDeal } from "./deals";

export const categoryPages = {
  tecnologia: {
    name: "Tecnología",
    shortName: "Tecnología",
    eyebrow: "TECNOLOGIA Y ELECTRONICA",
    title: "Chollos de tecnologia para comprar mejor.",
    seoTitle: "Chollos de tecnologia hoy: ofertas y descuentos",
    description: "Chollos de tecnologia, electronica y accesorios con precio registrado, descuento visible y enlace directo a la tienda.",
    guidance: "En tecnologia, confirma la compatibilidad, la capacidad, el modelo exacto y la garantia antes de comprar.",
  },
  videojuegos: {
    name: "Videojuegos",
    shortName: "Videojuegos",
    eyebrow: "GAMING Y VIDEOJUEGOS",
    title: "Ofertas gaming que merecen una segunda mirada.",
    seoTitle: "Chollos de videojuegos hoy: ofertas gaming",
    description: "Ofertas de videojuegos y accesorios gaming con precio publicado, ahorro calculado y ficha para revisar antes de comprar.",
    guidance: "Revisa la plataforma, la edicion, la compatibilidad y los gastos de envio antes de finalizar el pedido.",
  },
  hogar: {
    name: "Hogar",
    shortName: "Hogar",
    eyebrow: "HOGAR Y COCINA",
    title: "Ofertas para el hogar con ahorro a la vista.",
    seoTitle: "Chollos para el hogar hoy: ofertas y descuentos",
    description: "Chollos para el hogar con precio registrado y un enlace directo para comprobar el producto, sus medidas y condiciones.",
    guidance: "Confirma las medidas, los materiales, las variantes y las condiciones de envio antes de hacer el pedido.",
  },
} as const;

export type CategorySlug = keyof typeof categoryPages;

export function getCategoryPage(slug: string) {
  return categoryPages[slug as CategorySlug];
}

export function categoryDeals(slug: string, deals: PublishedDeal[]) {
  const category = getCategoryPage(slug);
  return category ? deals.filter((deal) => deal.category === category.name) : [];
}

/** A category needs enough current inventory before it is useful to index. */
export function categoryIsIndexable(slug: string, deals: PublishedDeal[]) {
  return categoryDeals(slug, deals).length >= 3;
}
