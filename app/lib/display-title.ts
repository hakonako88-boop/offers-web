function compact(value: string) {
  return value.replace(/\s+/gu, " ").replace(/\s+,/gu, ",").trim();
}

function normalized(value: string) {
  return compact(value).toLocaleLowerCase("es").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function trimAtWord(value: string, maximum = 82) {
  const text = compact(value);
  if (text.length <= maximum) return text;
  const cut = text.slice(0, maximum + 1).lastIndexOf(" ");
  return `${text.slice(0, cut > 46 ? cut : maximum).replace(/[,:;|·-]+$/u, "").trim()}…`;
}

/** Short factual headline for cards; the complete supplier title remains in the offer page. */
export function offerDisplayTitle(value: string) {
  const original = compact(value)
    .replace(/^(?:🔥|✨|💥|⭐️?|⚡|🛍️|\s)+/gu, "")
    .replace(/\s*\|\s*(?:Amazon|AliExpress|Miravia)\s*$/iu, "")
    .replace(/^Oficial\s*\|\s*/iu, "");
  const text = normalized(original);

  if (/realme 16 pro plus/.test(text)) return "realme 16 Pro+ 5G · AMOLED 144 Hz · cámara de 200 MP";
  if (/aspirador de colchones/.test(text) && /taurus/.test(text)) return "Aspirador de colchones Taurus Textile Care con luz UV-C";
  if (/xiaomi compact hair dryer h101/.test(text)) return "Secador plegable Xiaomi Compact Hair Dryer H101";
  if (/timex.*orologio.*expedition/.test(text)) return "Reloj Timex Expedition";
  if (/tostadora/.test(text) && /2 ranuras/.test(text)) return "Tostadora de 2 ranuras anchas con 9 niveles de dorado";
  if (/unigardia.*bancal/.test(text)) return "Bancal elevado modular UNIGARDIA 9 en 1 · 240×60×43 cm";
  if (/colgate.*advanced white/.test(text)) return "Pasta de dientes Colgate Advanced White · pack de 12";
  if (/carpa de camping/.test(text)) return "Carpa de camping impermeable para 3–4 personas";
  if (/ezviz.*camara/.test(text)) return "Cámara de vigilancia solar EZVIZ 6 MP con batería";
  if (/vexilar c9.*aspir/.test(text)) return "Aspiradora con cable Vexilar C9 · 70 kPa";
  if (/ferplast.*cama para perro/.test(text)) return "Cama cojín Ferplast para perros · tejido resistente";

  return trimAtWord(original.replace(/\s*[|_]\s*/gu, " · "));
}
