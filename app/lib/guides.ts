import { PublishedDeal } from "./deals";

export const guides = {
  "ofertas-amazon": {
    title: "Como encontrar ofertas reales en Amazon",
    seoTitle: "Ofertas Amazon: como encontrar chollos reales",
    description: "Guia para comprobar ofertas de Amazon: compara precios, variantes, envio y condiciones antes de comprar. Incluye chollos activos seleccionados.",
    eyebrow: "GUIA AMAZON",
    intro: "Una etiqueta de descuento no garantiza por si sola una buena compra. Esta guia sirve para revisar una oferta de Amazon con rapidez y decidir con datos, no con prisa.",
    sections: [
      { title: "Empieza por el producto exacto", body: "Confirma el modelo, la capacidad, el color, el tamano o la cantidad. En Amazon una misma ficha puede agrupar variantes con precios muy distintos; el descuento solo es util si corresponde exactamente a la variante que vas a comprar." },
      { title: "Compara el precio, no solo el porcentaje", body: "Mira el precio final que aparece en la ficha y, si se muestra, el precio anterior. Un porcentaje alto no sustituye a una comparacion razonable: piensa si ese importe final encaja con el valor del producto y con lo que necesitas." },
      { title: "Revisa envio, stock y condiciones", body: "Antes de pagar, comprueba la fecha de entrega, los gastos, la disponibilidad y la politica de devolucion. Un chollo que llega tarde o requiere gastos inesperados puede dejar de serlo." },
    ],
    checklist: ["La variante elegida coincide con la oferta publicada.", "El precio final y la entrega siguen siendo adecuados.", "Has revisado valoraciones recientes y la politica de devolucion."],
    faqs: [
      ["Por que cambia el precio de Amazon?", "El precio, el stock y las promociones pueden variar rapidamente. Por eso conviene comprobar la ficha justo antes de terminar la compra."],
      ["Una oferta de Amazon necesita cupon?", "No siempre. Algunas tienen precio directo y otras aplican un cupon o descuento en la propia ficha. Revisa el precio final mostrado por Amazon."],
      ["Que muestra Chollos al Dia?", "Mostramos el precio registrado al publicar, el ahorro cuando es comprobable y el enlace a la oferta. La ficha de Amazon es la referencia final."],
    ],
    relatedHref: "/ofertas/amazon/",
    relatedLabel: "Ver ofertas activas de Amazon",
    matches: (deal: PublishedDeal) => deal.store === "Amazon",
  },
  "cupones-aliexpress": {
    title: "Cupones AliExpress: como aprovecharlos sin errores",
    seoTitle: "Cupones AliExpress y ofertas: guia para ahorrar",
    description: "Aprende a usar cupones de AliExpress, comprobar el precio final y elegir ofertas con descuento real antes de hacer un pedido.",
    eyebrow: "GUIA ALIEXPRESS",
    intro: "Los cupones pueden reducir mucho el precio final, pero solo si se aplican a la variante, importe minimo y envio que esperabas. Sigue estos pasos antes de confirmar un pedido en AliExpress.",
    sections: [
      { title: "Lee la condicion del cupon", body: "Comprueba si existe importe minimo, fecha limite, limite de usos o productos excluidos. Un codigo anunciado no siempre se aplica a todos los vendedores ni a todas las variantes." },
      { title: "Anade la variante correcta al carrito", body: "Talla, color, capacidad y pack pueden cambiar el precio. Selecciona primero la variante que quieres y despues verifica que el descuento y el cupon se mantienen en el carrito." },
      { title: "Valida el total antes de pagar", body: "El precio relevante es el total de la pantalla final: producto, cupones, envio e impuestos cuando correspondan. Tambien revisa el plazo de entrega y las valoraciones del vendedor." },
    ],
    checklist: ["El cupon aplica al importe y al vendedor elegidos.", "El total del carrito coincide con tu presupuesto.", "La variante, la entrega y las valoraciones son correctas."],
    faqs: [
      ["Donde se aplica un cupon de AliExpress?", "Normalmente se activa en la ficha, el carrito o la pantalla de pago. La tienda confirma el descuento final antes de completar el pedido."],
      ["Puedo usar varios cupones?", "Depende de las condiciones de cada promocion. Comprueba el resumen final del pedido porque no todos los cupones son acumulables."],
      ["Por que un cupon no funciona?", "Puede no alcanzar el minimo, haber caducado, no ser valido para esa tienda o no aplicarse a la variante seleccionada."],
    ],
    relatedHref: "/ofertas/aliexpress/",
    relatedLabel: "Ver ofertas activas de AliExpress",
    matches: (deal: PublishedDeal) => deal.store === "AliExpress",
  },
  "detectar-chollos-reales": {
    title: "Como saber si un chollo es real antes de comprar",
    seoTitle: "Como detectar chollos reales y evitar falsas ofertas",
    description: "Guia practica para reconocer ofertas reales: compara el precio final, identifica condiciones, revisa el producto y evita descuentos engañosos.",
    eyebrow: "METODO DE AHORRO",
    intro: "Una buena oferta combina un producto que necesitas, un precio final convincente y condiciones claras. Esta guia te ayuda a separar una oportunidad real de un descuento que solo parece grande.",
    sections: [
      { title: "Fijate en el ahorro demostrable", body: "El precio anterior, un cupon aplicable o una promocion clara dan contexto al precio actual. Si no se puede explicar el ahorro, no conviene comprar solo por una etiqueta llamativa." },
      { title: "No compres una ficha generica", body: "El producto debe tener titulo identificable, imagen, variante y enlace directo a la tienda. Si falta informacion basica, es mejor esperar a una oferta que se pueda comprobar." },
      { title: "Decide con una lista corta", body: "Antes de pagar, revisa precio final, envio, devolucion, variante y necesidad real. Son cinco comprobaciones que evitan compras impulsivas y errores frecuentes." },
    ],
    checklist: ["Entiendes de donde sale el descuento.", "El producto y la variante estan identificados.", "El precio final incluye las condiciones que te importan.", "Comprarias el producto incluso sin urgencia artificial."],
    faqs: [
      ["Un descuento alto siempre es un chollo?", "No. El precio final, las condiciones y la utilidad del producto son mas importantes que un porcentaje aislado."],
      ["Por que algunas ofertas desaparecen de la web?", "Retiramos las ofertas que caducan, se quedan sin stock o dejan de cumplir los criterios de precio, enlace y producto identificable."],
      ["Las ofertas de Chollos al Dia cuestan mas?", "No. Algunos enlaces pueden generar una comision de afiliacion, pero no cambian el precio para quien compra."],
    ],
    relatedHref: "/#ofertas",
    relatedLabel: "Ver todos los chollos de hoy",
    matches: () => true,
  },
  "chollos-electronica": {
    title: "Chollos de electrónica: cómo comparar una oferta",
    seoTitle: "Chollos de electrónica: guía para comparar ofertas",
    description: "Aprende a comparar chollos de electrónica, móviles e informática: modelo, capacidad, vendedor, garantía y precio final antes de comprar.",
    eyebrow: "GUÍA DE ELECTRÓNICA",
    intro: "Dos productos con un nombre parecido pueden tener distinta memoria, generación o garantía. Esta guía te ayuda a comparar exactamente el modelo ofertado y a saber si el precio final merece la pena.",
    sections: [
      { title: "Identifica modelo, generación y capacidad", body: "Anota la referencia completa antes de comparar. En móviles, ordenadores, televisores y almacenamiento, una diferencia de generación, memoria o tamaño puede explicar gran parte del supuesto descuento." },
      { title: "Comprueba qué incluye el precio", body: "Revisa si el producto incluye cargador, batería, mando, cables o accesorios. También confirma los gastos de envío y si existe un cupón que deba activarse para obtener el precio publicado." },
      { title: "Valora vendedor, garantía y devolución", body: "Comprueba quién vende y envía el producto, el plazo de entrega y la garantía aplicable en España. En productos reacondicionados, revisa además el estado, la batería y las condiciones de devolución." },
      { title: "Compara el precio de la misma referencia", body: "No compares una versión básica con otra superior. Usa la referencia, capacidad y color exactos; después valora el ahorro en euros y si el producto cubre una necesidad real." },
    ],
    checklist: ["La referencia y la generación coinciden.", "La capacidad, el tamaño y el color son los ofertados.", "Sabes quién vende y qué garantía ofrece.", "El precio final incluye envío, cupón y accesorios necesarios."],
    faqs: [
      ["Qué debo mirar primero en una oferta de electrónica?", "El modelo exacto y su referencia. Después compara capacidad, accesorios, vendedor, garantía y precio final."],
      ["Un producto reacondicionado puede ser un chollo?", "Puede serlo si su estado, garantía, batería y devolución están claros y el ahorro compensa frente al producto nuevo."],
      ["Por qué cambia tanto el precio entre variantes?", "La memoria, la capacidad, el tamaño, el color o la generación pueden tener precios diferentes dentro de una misma ficha."],
    ],
    relatedHref: "/chollos/tecnologia/",
    relatedLabel: "Ver chollos de tecnología de hoy",
    matches: (deal: PublishedDeal) => deal.category === "Tecnología",
  },
  "ofertas-cocina": {
    title: "Ofertas de cocina: cómo elegir y ahorrar de verdad",
    seoTitle: "Ofertas de cocina: guía para encontrar chollos",
    description: "Guía para comparar ofertas de cocina, cafeteras, freidoras de aire y menaje según capacidad, potencia, medidas, accesorios y precio final.",
    eyebrow: "GUÍA DE COCINA",
    intro: "En cocina no basta con encontrar el porcentaje más alto. La capacidad, las medidas, la potencia y los accesorios determinan si una cafetera, freidora de aire o robot de cocina encaja realmente en tu casa.",
    sections: [
      { title: "Elige primero la capacidad adecuada", body: "Calcula para cuántas personas vas a cocinar y cuánto espacio tienes. Una capacidad mayor no siempre es mejor: puede ocupar más, consumir más y resultar incómoda para el uso diario." },
      { title: "Revisa potencia, funciones y consumo", body: "Compara la potencia con la capacidad y las funciones que vas a utilizar. Evita pagar de más por programas que no necesitas y comprueba si las piezas principales son fáciles de limpiar." },
      { title: "Mira accesorios y recambios", body: "Confirma qué bandejas, filtros, jarras, cuchillas o recipientes incluye el precio. Comprueba también si existen recambios y cuánto cuestan, especialmente en cafeteras y robots de cocina." },
      { title: "Comprueba medidas y precio final", body: "Mide el espacio disponible y revisa el coste con envío y cupones. Compara siempre el mismo modelo y número de unidades para evitar descuentos que parecen mayores por tratarse de otro formato." },
    ],
    checklist: ["La capacidad encaja con el número de personas.", "Las medidas caben en el espacio disponible.", "Conoces la potencia y las funciones útiles.", "El precio incluye los accesorios y el envío indicados."],
    faqs: [
      ["Qué capacidad necesito en una freidora de aire?", "Depende del número de personas y del tipo de recetas. Comprueba la capacidad útil de la cesta, no solo el volumen anunciado."],
      ["Más potencia significa que un aparato es mejor?", "No necesariamente. La potencia debe ser adecuada para la capacidad y el uso; también importan el control de temperatura, la limpieza y la garantía."],
      ["Cómo comparo una oferta de menaje?", "Compara material, medidas, número de piezas, compatibilidad con tu cocina y condiciones de lavado, además del precio final."],
    ],
    relatedHref: "/chollos/cocina/",
    relatedLabel: "Ver chollos de cocina de hoy",
    matches: (deal: PublishedDeal) => deal.category === "Cocina",
  },
} as const;

export type GuideSlug = keyof typeof guides;
export function getGuide(slug: string) { return guides[slug as GuideSlug]; }
