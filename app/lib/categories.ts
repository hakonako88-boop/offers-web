import { PublishedDeal } from "./deals";

export const categoryPages = {
  tecnologia: {
    name: "Tecnología",
    shortName: "Tecnología",
    eyebrow: "TECNOLOGÍA Y ELECTRÓNICA",
    title: "Chollos de tecnología para comprar mejor.",
    seoTitle: "Chollos de tecnología hoy: ofertas y descuentos",
    description: "Chollos de tecnología, electrónica y accesorios con precio registrado, descuento visible y enlace directo a la tienda.",
    guidance: "En tecnología, confirma la compatibilidad, la capacidad, el modelo exacto y la garantía antes de comprar.",
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
  cocina: {
    name: "Cocina",
    shortName: "Cocina",
    eyebrow: "COCINA Y PEQUEÑO ELECTRODOMÉSTICO",
    title: "Chollos de cocina para ahorrar cada día.",
    seoTitle: "Chollos de cocina hoy: ofertas y descuentos",
    description: "Ofertas de cocina, cafeteras, freidoras de aire, menaje y pequeños electrodomésticos con precios claros y ahorro visible.",
    guidance: "Comprueba la capacidad, las medidas, la potencia, los accesorios incluidos y la garantía antes de comprar.",
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
  bricolaje: {
    name: "Bricolaje",
    shortName: "Bricolaje",
    eyebrow: "HERRAMIENTAS Y BRICOLAJE",
    title: "Chollos de bricolaje que ayudan a ahorrar.",
    seoTitle: "Chollos de bricolaje hoy: herramientas en oferta",
    description: "Ofertas de herramientas, accesorios y productos de bricolaje con precio publicado, descuento calculado y enlace directo.",
    guidance: "Revisa el voltaje, la batería, los accesorios, las medidas y la compatibilidad con tus herramientas actuales.",
  },
  juguetes: {
    name: "Juguetes",
    shortName: "Juguetes",
    eyebrow: "JUGUETES Y PRODUCTOS INFANTILES",
    title: "Ofertas de juguetes para regalar pagando menos.",
    seoTitle: "Chollos de juguetes hoy: ofertas para niños",
    description: "Chollos de juguetes, juegos y productos infantiles seleccionados por precio, descuento y disponibilidad al publicar.",
    guidance: "Comprueba la edad recomendada, las medidas, el idioma, las pilas necesarias y las advertencias de seguridad.",
  },
  moda: {
    name: "Moda",
    shortName: "Moda",
    eyebrow: "MODA, CALZADO Y ACCESORIOS",
    title: "Chollos de moda con el precio bien visible.",
    seoTitle: "Chollos de moda hoy: ropa y calzado en oferta",
    description: "Ofertas de moda, ropa, calzado y accesorios con descuento visible y enlace para comprobar tallas, colores y stock.",
    guidance: "Comprueba la guía de tallas, la composición, el color elegido y las condiciones de cambio o devolución.",
  },
  deporte: {
    name: "Deporte",
    shortName: "Deporte",
    eyebrow: "DEPORTE Y AIRE LIBRE",
    title: "Ofertas de deporte para equiparte por menos.",
    seoTitle: "Chollos de deporte hoy: material deportivo en oferta",
    description: "Chollos de deporte, fitness y aire libre con precios registrados y descuentos para comparar antes de comprar.",
    guidance: "Revisa la talla, el peso, las medidas, el uso recomendado y qué accesorios incluye el producto.",
  },
  belleza: {
    name: "Belleza",
    shortName: "Belleza",
    eyebrow: "BELLEZA Y CUIDADO PERSONAL",
    title: "Chollos de belleza y cuidado personal.",
    seoTitle: "Chollos de belleza hoy: perfumería y cuidado",
    description: "Ofertas de belleza, perfumería, afeitado y cuidado personal con precio claro y enlace directo a la tienda.",
    guidance: "Comprueba el tamaño, la cantidad, el modelo, los ingredientes y que el vendedor sea adecuado antes de pagar.",
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

export function categorySlugForName(name: string) {
  return (Object.entries(categoryPages).find(([, category]) => category.name === name)?.[0] as CategorySlug | undefined);
}
