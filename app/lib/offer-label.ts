type OfferLabelInput = {
  id?: string;
  price?: number;
  discount?: number;
};

function stableChoice(id: string, choices: readonly string[]) {
  const score = Array.from(id).reduce((total, character) => total + character.codePointAt(0)!, 0);
  return choices[score % choices.length];
}

/** An editorial label, kept outside the product name to avoid SEO keyword stuffing. */
export function offerEditorialLabel({ id = "", price = 0, discount = 0 }: OfferLabelInput) {
  if (discount >= 50) return stableChoice(id, ["Superoferta", "Chollo irresistible"]);
  if (discount >= 30) return stableChoice(id, ["Chollo destacado", "Gran oferta"]);
  if (price > 0 && price <= 15) return stableChoice(id, ["Ofertita", "Pequeño chollo"]);
  if (discount >= 15) return stableChoice(id, ["Buena oferta", "Chollo del día"]);
  return stableChoice(id, ["Oferta seleccionada", "Precio interesante"]);
}
