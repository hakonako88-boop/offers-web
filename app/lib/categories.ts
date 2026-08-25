import { PublishedDeal } from "./deals";

export const categoryPages = {
  tecnologia: {
    name: "Tecnología",
    shortName: "Tecnología",
    eyebrow: "TECNOLOGÍA Y ELECTRÓNICA",
    title: "Chollos de tecnología para comprar mejor.",
    seoTitle: "Chollos de tecnología hoy: ofertas y descuentos",
    description: "Chollos de tecnología, electrónica y accesorios con precio registrado, descuento visible y enlace directo a la tienda.",
    searchIntro: "Reunimos ofertas de electrónica, móviles, informática y accesorios cuando el modelo y el ahorro se pueden identificar. No mezclamos capacidades o versiones distintas para presentar un descuento mayor del real.",
    checks: ["Modelo y capacidad exactos", "Compatibilidad, garantía y vendedor", "Precio final con envío o cupón"],
    guidance: "En tecnología, confirma la compatibilidad, la capacidad, el modelo exacto y la garantía antes de comprar.",
  },
  videojuegos: {
    name: "Videojuegos",
    shortName: "Videojuegos",
    eyebrow: "GAMING Y VIDEOJUEGOS",
    title: "Ofertas gaming que merecen una segunda mirada.",
    seoTitle: "Chollos de videojuegos hoy: ofertas gaming",
    description: "Ofertas de videojuegos y accesorios gaming con precio publicado, ahorro calculado y ficha para revisar antes de comprar.",
    searchIntro: "Seleccionamos juegos, consolas, mandos y accesorios gaming dejando clara la plataforma y la edición. Así puedes comparar la misma versión del producto y no una alternativa de menor valor.",
    checks: ["Plataforma y edición", "Formato físico o digital", "Compatibilidad y contenido incluido"],
    guidance: "Revisa la plataforma, la edicion, la compatibilidad y los gastos de envio antes de finalizar el pedido.",
  },
  cocina: {
    name: "Cocina",
    shortName: "Cocina",
    eyebrow: "COCINA Y PEQUEÑO ELECTRODOMÉSTICO",
    title: "Chollos de cocina para ahorrar cada día.",
    seoTitle: "Chollos de cocina hoy: ofertas y descuentos",
    description: "Ofertas de cocina, cafeteras, freidoras de aire, menaje y pequeños electrodomésticos con precios claros y ahorro visible.",
    searchIntro: "Buscamos chollos en pequeños electrodomésticos y menaje que resulten útiles por capacidad, potencia y precio final. Damos prioridad a fichas que permiten comprobar medidas y accesorios antes de decidir.",
    checks: ["Capacidad y medidas reales", "Potencia y consumo", "Accesorios, recambios y garantía"],
    guidance: "Comprueba la capacidad, las medidas, la potencia, los accesorios incluidos y la garantía antes de comprar.",
  },
  hogar: {
    name: "Hogar",
    shortName: "Hogar",
    eyebrow: "HOGAR Y COCINA",
    title: "Ofertas para el hogar con ahorro a la vista.",
    seoTitle: "Chollos para el hogar hoy: ofertas y descuentos",
    description: "Chollos para el hogar con precio registrado y un enlace directo para comprobar el producto, sus medidas y condiciones.",
    searchIntro: "Agrupamos ofertas para organizar, limpiar y equipar la casa con datos suficientes para comparar. Revisamos especialmente las variantes, porque un tamaño o material diferente puede cambiar por completo el precio.",
    checks: ["Medidas, material y color", "Unidades incluidas", "Envío, montaje y devolución"],
    guidance: "Confirma las medidas, los materiales, las variantes y las condiciones de envio antes de hacer el pedido.",
  },
  bricolaje: {
    name: "Bricolaje",
    shortName: "Bricolaje",
    eyebrow: "HERRAMIENTAS Y BRICOLAJE",
    title: "Chollos de bricolaje que ayudan a ahorrar.",
    seoTitle: "Chollos de bricolaje hoy: herramientas en oferta",
    description: "Ofertas de herramientas, accesorios y productos de bricolaje con precio publicado, descuento calculado y enlace directo.",
    searchIntro: "Destacamos herramientas y consumibles cuando la referencia y el equipamiento incluido están claros. Una máquina sin batería o con accesorios distintos no se compara como si fuera el mismo lote.",
    checks: ["Voltaje, potencia y referencia", "Batería y cargador incluidos", "Brocas, discos y accesorios compatibles"],
    guidance: "Revisa el voltaje, la batería, los accesorios, las medidas y la compatibilidad con tus herramientas actuales.",
  },
  juguetes: {
    name: "Juguetes",
    shortName: "Juguetes",
    eyebrow: "JUGUETES Y PRODUCTOS INFANTILES",
    title: "Ofertas de juguetes para regalar pagando menos.",
    seoTitle: "Chollos de juguetes hoy: ofertas para niños",
    description: "Chollos de juguetes, juegos y productos infantiles seleccionados por precio, descuento y disponibilidad al publicar.",
    searchIntro: "Elegimos juguetes y juegos identificando la versión, el idioma y la edad recomendada. Además del ahorro, importa que el producto sea adecuado y que incluya las piezas anunciadas.",
    checks: ["Edad recomendada y seguridad", "Idioma y número de jugadores", "Pilas, piezas y medidas"],
    guidance: "Comprueba la edad recomendada, las medidas, el idioma, las pilas necesarias y las advertencias de seguridad.",
  },
  moda: {
    name: "Moda",
    shortName: "Moda",
    eyebrow: "MODA, CALZADO Y ACCESORIOS",
    title: "Chollos de moda con el precio bien visible.",
    seoTitle: "Chollos de moda hoy: ropa y calzado en oferta",
    description: "Ofertas de moda, ropa, calzado y accesorios con descuento visible y enlace para comprobar tallas, colores y stock.",
    searchIntro: "Seleccionamos ropa, calzado y accesorios cuando la talla ofertada y el precio final se pueden verificar. Evitamos presentar como general un descuento que solo se aplica a una variante aislada.",
    checks: ["Talla disponible y guía de medidas", "Composición y color", "Cambios, devolución y vendedor"],
    guidance: "Comprueba la guía de tallas, la composición, el color elegido y las condiciones de cambio o devolución.",
  },
  deporte: {
    name: "Deporte",
    shortName: "Deporte",
    eyebrow: "DEPORTE Y AIRE LIBRE",
    title: "Ofertas de deporte para equiparte por menos.",
    seoTitle: "Chollos de deporte hoy: material deportivo en oferta",
    description: "Chollos de deporte, fitness y aire libre con precios registrados y descuentos para comparar antes de comprar.",
    searchIntro: "Reunimos material de fitness, deporte y aire libre indicando el uso y la variante a la que corresponde el precio. El objetivo es que puedas valorar si el ahorro encaja con el equipo que realmente necesitas.",
    checks: ["Talla, peso y medidas", "Nivel y uso recomendado", "Accesorios y montaje incluidos"],
    guidance: "Revisa la talla, el peso, las medidas, el uso recomendado y qué accesorios incluye el producto.",
  },
  belleza: {
    name: "Belleza",
    shortName: "Belleza",
    eyebrow: "BELLEZA Y CUIDADO PERSONAL",
    title: "Chollos de belleza y cuidado personal.",
    seoTitle: "Chollos de belleza hoy: perfumería y cuidado",
    description: "Ofertas de belleza, perfumería, afeitado y cuidado personal con precio claro y enlace directo a la tienda.",
    searchIntro: "Comparamos perfumería y cuidado personal atendiendo al formato, la cantidad y el vendedor. Un precio atractivo solo es comparable cuando corresponde al mismo tamaño y presentación.",
    checks: ["Cantidad, formato y unidades", "Ingredientes o modelo exacto", "Vendedor, precinto y devolución"],
    guidance: "Comprueba el tamaño, la cantidad, el modelo, los ingredientes y que el vendedor sea adecuado antes de pagar.",
  },
  informatica: { name: "Informática", shortName: "Informática", eyebrow: "ORDENADORES Y PERIFÉRICOS", title: "Chollos de informática con el modelo bien identificado.", seoTitle: "Chollos de informática hoy: ordenadores y periféricos", description: "Ofertas de ordenadores, monitores, componentes y periféricos clasificadas por el producto real.", searchIntro: "Separamos informática de la electrónica general para que puedas comparar equipos, componentes y periféricos equivalentes.", checks: ["Modelo, procesador y memoria", "Compatibilidad y conexiones", "Garantía y vendedor"], guidance: "Comprueba la referencia, configuración, compatibilidad y garantía." },
  telefonia: { name: "Telefonía", shortName: "Telefonía", eyebrow: "MÓVILES Y ACCESORIOS", title: "Ofertas de telefonía sin mezclarlas con juguetes.", seoTitle: "Chollos de móviles hoy: ofertas de telefonía", description: "Ofertas de smartphones y accesorios con modelo, capacidad y precio claramente identificados.", searchIntro: "El título del producto prevalece sobre una categoría incorrecta recibida de la tienda.", checks: ["Modelo, memoria y versión", "Garantía y vendedor", "Compatibilidad y cargador"], guidance: "Revisa versión, memoria, garantía y compatibilidad de red." },
  electrodomesticos: { name: "Electrodomésticos", shortName: "Electrodomésticos", eyebrow: "ELECTRODOMÉSTICOS", title: "Electrodomésticos en oferta con datos comparables.", seoTitle: "Electrodomésticos en oferta hoy", description: "Descuentos en cocina, limpieza y equipamiento del hogar con precio y modelo visibles.", searchIntro: "Agrupamos aparatos de cocina y limpieza sin confundirlos con menaje o decoración.", checks: ["Capacidad y potencia", "Consumo y medidas", "Garantía y accesorios"], guidance: "Comprueba medidas, potencia, consumo, accesorios y garantía." },
  motor: { name: "Motor", shortName: "Motor", eyebrow: "COCHE Y MOTO", title: "Ofertas de motor y accesorios.", seoTitle: "Chollos de motor hoy: coche y moto", description: "Ofertas para coche y moto con compatibilidad y condiciones comprobables.", searchIntro: "La compatibilidad exacta es más importante que un porcentaje llamativo.", checks: ["Modelo compatible", "Homologación", "Instalación y garantía"], guidance: "Verifica compatibilidad y homologación antes de comprar." },
  alimentacion: { name: "Alimentación", shortName: "Alimentación", eyebrow: "ALIMENTACIÓN", title: "Ofertas de alimentación con precio por unidad claro.", seoTitle: "Ofertas de alimentación hoy", description: "Descuentos de alimentación seleccionados con formato y unidades identificables.", searchIntro: "Comparamos la misma cantidad y presentación para no inflar el ahorro.", checks: ["Cantidad y unidades", "Precio por kilo o litro", "Caducidad y conservación"], guidance: "Compara cantidad, formato y precio por unidad." },
  bebes: { name: "Bebés", shortName: "Bebés", eyebrow: "BEBÉS", title: "Ofertas para bebés clasificadas con cuidado.", seoTitle: "Chollos para bebés hoy", description: "Productos para bebés con edad, formato y condiciones visibles.", searchIntro: "Los productos de bebé se separan de juguetes cuando su uso principal es cuidado, alimentación o transporte.", checks: ["Edad y peso", "Seguridad", "Unidades y medidas"], guidance: "Comprueba edad, medidas y advertencias de seguridad." },
  viajes: { name: "Viajes", shortName: "Viajes", eyebrow: "VIAJES", title: "Ofertas de viajes con condiciones a la vista.", seoTitle: "Ofertas de viajes y escapadas", description: "Promociones de viajes cuando fechas, condiciones y precio se pueden comprobar.", searchIntro: "No mostramos urgencia ni disponibilidad que el proveedor no haya confirmado.", checks: ["Fechas y ocupación", "Cancelación", "Tasas y coste final"], guidance: "Revisa fechas, tasas y cancelación." },
  servicios: { name: "Servicios", shortName: "Servicios", eyebrow: "SERVICIOS Y SUSCRIPCIONES", title: "Promociones de servicios explicadas.", seoTitle: "Ofertas de servicios y suscripciones", description: "Promociones de software, tarifas y suscripciones con renovación y condiciones visibles.", searchIntro: "El precio inicial no se presenta como ahorro permanente si existe renovación.", checks: ["Duración", "Renovación", "Cancelación"], guidance: "Comprueba permanencia, renovación y cancelación." },
  otros: { name: "Otros / Sin clasificar", shortName: "Otros", eyebrow: "PENDIENTE DE CLASIFICACIÓN", title: "Ofertas pendientes de una categoría fiable.", seoTitle: "Otras ofertas verificadas", description: "Productos con precio y enlace comprobados cuya categoría todavía no tiene suficiente confianza.", searchIntro: "Preferimos una categoría genérica a colocar un producto en una sección absurda.", checks: ["Producto exacto", "Variante", "Precio final"], guidance: "Comprueba el producto y la variante exacta." },
} as const;

export type CategorySlug = keyof typeof categoryPages;

export function getCategoryPage(slug: string) {
  return categoryPages[slug as CategorySlug];
}

export function categoryDeals(slug: string, deals: PublishedDeal[]) {
  const category = getCategoryPage(slug);
  const aliases: Partial<Record<CategorySlug, string[]>> = { videojuegos: ["Gaming"], cocina: ["Electrodomésticos"], bricolaje: ["Hogar"], belleza: ["Belleza y cuidado personal"] };
  const accepted = category ? aliases[slug as CategorySlug] || [category.name] : [];
  return category ? deals.filter((deal) => accepted.includes(deal.category)) : [];
}

/** A category needs enough current inventory before it is useful to index. */
export function categoryIsIndexable(slug: string, deals: PublishedDeal[]) {
  return categoryDeals(slug, deals).length >= 3;
}

export function categorySlugForName(name: string) {
  const aliases: Record<string, CategorySlug> = { Gaming: "videojuegos", Electrodomésticos: "electrodomesticos", "Belleza y cuidado personal": "belleza", "Otros / Sin clasificar": "otros" };
  return aliases[name] || (Object.entries(categoryPages).find(([, category]) => category.name === name)?.[0] as CategorySlug | undefined);
}
