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
    matches: () => true,
  },
} as const;

export type GuideSlug = keyof typeof guides;
export function getGuide(slug: string) { return guides[slug as GuideSlug]; }
