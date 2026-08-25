export const canonicalCategories = [
  "Tecnología", "Informática", "Telefonía", "Gaming", "Hogar", "Electrodomésticos",
  "Belleza y cuidado personal", "Moda", "Deporte", "Motor", "Juguetes", "Alimentación",
  "Bebés", "Viajes", "Servicios", "Otros / Sin clasificar",
] as const;

export type CanonicalCategory = (typeof canonicalCategories)[number];

export type CategoryClassification = {
  category: CanonicalCategory;
  subcategory?: string;
  confidence: number;
  reason: string;
};

type Rule = { category: CanonicalCategory; subcategory?: string; pattern: RegExp; weight: number };

const rules: Rule[] = [
  { category: "Telefonía", subcategory: "Smartphones", pattern: /\b(?:smartphone|tel[eé]fono|m[oó]vil|iphone|galaxy\s+s\d|pixel\s+\d|redmi|poco\s+[a-zxmf]?\d|nothing\s+phone|oneplus|realme)\b/iu, weight: 1 },
  { category: "Telefonía", subcategory: "Accesorios", pattern: /\b(?:funda\s+(?:para\s+)?(?:iphone|m[oó]vil)|protector\s+de\s+pantalla|powerbank|cargador\s+(?:usb|magsafe|para\s+m[oó]vil))\b/iu, weight: .9 },
  { category: "Informática", subcategory: "Ordenadores", pattern: /\b(?:port[aá]til|laptop|notebook\s+pc|chromebook|macbook|mini\s*pc|ordenador|desktop)\b/iu, weight: 1 },
  { category: "Informática", subcategory: "Monitores", pattern: /\b(?:monitor|pantalla\s+(?:gaming|pc)|displayport)\b/iu, weight: .95 },
  { category: "Informática", subcategory: "Componentes y periféricos", pattern: /\b(?:ssd|disco\s+duro|memoria\s+ram|tarjeta\s+gr[aá]fica|gpu|router|impresora|teclado|rat[oó]n|mouse|webcam)\b/iu, weight: .9 },
  { category: "Gaming", subcategory: "Consolas y juegos", pattern: /\b(?:gaming|videojuego|playstation|ps[345](?:\s|$)|xbox|nintendo|switch|steam\s*deck|consola|hotas|control\s+de\s+vuelo|mando\s+(?:pro|inal[aá]mbrico)|gran\s+turismo|battlefield)\b/iu, weight: 1 },
  { category: "Tecnología", subcategory: "Audio", pattern: /\b(?:auricular|headphone|earbud|altavoz|soundbar|barra\s+de\s+sonido|micr[oó]fono)\b/iu, weight: .9 },
  { category: "Tecnología", subcategory: "Smart Home", pattern: /\b(?:dom[oó]tica|smart\s*home|bombilla\s+inteligente|c[aá]mara\s+(?:wifi|ip|de\s+seguridad)|videoportero)\b/iu, weight: .9 },
  { category: "Tecnología", subcategory: "Wearables", pattern: /\b(?:smartwatch|reloj\s+inteligente|pulsera\s+de\s+actividad|wearable)\b/iu, weight: .95 },
  { category: "Electrodomésticos", subcategory: "Cocina", pattern: /\b(?:freidora\s+de\s+aire|air\s*fryer|cafetera|microondas|lavavajillas|frigor[ií]fico|batidora|tostadora|horno|placa\s+de\s+inducci[oó]n|hot\s+water\s+dispenser|dispensador\s+de\s+agua)\b/iu, weight: 1 },
  { category: "Electrodomésticos", subcategory: "Limpieza", pattern: /\b(?:robot\s+aspirador|aspirador|lavadora|secadora|limpiador\s+de\s+vapor)\b/iu, weight: .95 },
  { category: "Belleza y cuidado personal", subcategory: "Perfumería", pattern: /\b(?:perfume|parfum|eau\s+de|colonia)\b/iu, weight: 1 },
  { category: "Belleza y cuidado personal", subcategory: "Cuidado personal", pattern: /\b(?:cosm[eé]tic|maquillaje|crema\s+(?:facial|corporal)|champ[uú]|afeitadora|cortapelo|depiladora|gillette|protector\s+solar|spf\s*\d+|anthelios|la\s+roche\s+posay)\b/iu, weight: 1 },
  { category: "Bebés", pattern: /\b(?:beb[eé]|pa[nñ]al|cuna|carrito\s+de\s+beb[eé]|trona|biber[oó]n)\b/iu, weight: 1 },
  { category: "Juguetes", pattern: /\b(?:juguete|mu[nñ]ec[oa]|lego|playmobil|puzzle|juego\s+de\s+mesa|tamagotchi|figura\s+de\s+acci[oó]n)\b/iu, weight: .95 },
  { category: "Alimentación", pattern: /\b(?:caf[eé]\s+(?:en\s+grano|molido)|chocolate|galleta|aceite\s+de\s+oliva|conserva|bebida|snack|alimentaci[oó]n)\b/iu, weight: .9 },
  { category: "Motor", pattern: /\b(?:coche|moto|autom[oó]vil|neum[aá]tico|arrancador\s+de\s+bater[ií]a|obd|casco\s+de\s+moto)\b/iu, weight: .9 },
  { category: "Deporte", pattern: /\b(?:fitness|deporte|running|senderismo|bicicleta|p[aá]del|f[uú]tbol|mancuerna|gimnasio|caminadora|cinta\s+de\s+correr)\b/iu, weight: .9 },
  { category: "Moda", pattern: /\b(?:camiseta|pantal[oó]n|vestido|chaqueta|zapatilla|zapato|sandalia|bolso|mochila|moda|ropa|calzado)\b/iu, weight: .85 },
  { category: "Hogar", pattern: /\b(?:hogar|mueble|colch[oó]n|almohada|coj[ií]n|s[aá]bana|toalla|limpieza|jard[ií]n|piscina|l[aá]mpara|ventilador\s+de\s+techo)\b/iu, weight: .82 },
  { category: "Viajes", pattern: /\b(?:hotel|vuelo|escapada|viaje|maleta|apartamento\s+tur[ií]stico)\b/iu, weight: .9 },
  { category: "Servicios", pattern: /\b(?:suscripci[oó]n|vpn|tarifa|fibra|software|curso\s+online|seguro)\b/iu, weight: .85 },
];

function normalise(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("es-ES");
}

const directAliases: Record<string, CanonicalCategory> = {
  tecnologia: "Tecnología", electronica: "Tecnología", informatica: "Informática", telefonia: "Telefonía",
  videojuegos: "Gaming", gaming: "Gaming", hogar: "Hogar", cocina: "Electrodomésticos", electrodomesticos: "Electrodomésticos",
  belleza: "Belleza y cuidado personal", "belleza y cuidado personal": "Belleza y cuidado personal", moda: "Moda",
  deporte: "Deporte", motor: "Motor", juguetes: "Juguetes", alimentacion: "Alimentación", bebes: "Bebés",
  viajes: "Viajes", servicios: "Servicios",
};

export function classifyProduct(title: string, suppliedCategory = ""): CategoryClassification {
  const titleText = normalise(title);
  const supplied = directAliases[normalise(suppliedCategory).trim()];
  const matches = rules.filter((rule) => rule.pattern.test(titleText)).sort((a, b) => b.weight - a.weight);
  const strongest = matches[0];
  if (strongest) {
    const corroborated = matches.some((match) => match !== strongest && match.category === strongest.category);
    const confidence = Math.min(1, strongest.weight + (corroborated ? .05 : 0));
    return { category: strongest.category, subcategory: strongest.subcategory, confidence, reason: "título del producto" };
  }
  if (supplied) return { category: supplied, confidence: .62, reason: "categoría proporcionada sin confirmación en el título" };
  return { category: "Otros / Sin clasificar", confidence: .25, reason: "sin señales suficientes" };
}
