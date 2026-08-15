"use client";

import { useMemo, useState } from "react";
import rawOffers from "../../data/offers.json";
import AdSlot from "./AdSlot";
import { adsenseHomeSlot } from "../lib/adsense";
import { publishedDeals } from "../lib/deals";

export type Deal = {
  id: string;
  title: string;
  store: "Amazon" | "AliExpress" | "Miravia" | "Otra";
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
  const original = String(value ?? "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/^(OFERT[ÓO]N\s+(AMAZON|ALIEXPRESS|MIRAVIA)\s*[-–—:]?\s*)/i, "")
    .replace(/🔥|🚨|🛒|📺|🍃|🛢️/gu, "")
    .replace(/\b(\d+)\s*[xX×]\s*(\d+)\s*Cm\b/gu, "$1×$2 cm")
    .trim();
  const text = normalise(original);
  if (!original) return "Oferta destacada";
  if (/relleno\s+de\s+cojin/.test(text)) {
    const brand = original.match(/(?:^|\s)([\p{L}\p{N}-]{2,})\s+Relleno\s+de\s+Coj[ií]n/iu)?.[1]
      || original.match(/Relleno\s+de\s+Coj[ií]n\s+([\p{L}\p{N}-]{2,})/iu)?.[1]
      || "";
    const size = original.match(/\b(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)\b/i);
    return `Relleno de cojín${brand ? ` ${brand}` : ""}${size ? ` ${size[1]}×${size[2]} ${size[3].toLowerCase()}` : ""}${/siliconad/.test(text) ? " de fibra siliconada" : ""}`;
  }
  if (/sandalia/.test(text)) {
    const brand = original.match(/\b[A-Z]{3,}\b/)?.[0] || "";
    return `Sandalias de fiesta para mujer${brand ? ` ${brand}` : ""}`;
  }
  if (/bolso/.test(text) && /mujer|women/.test(text)) return "Bolso de mujer para ocasiones especiales";
  if (/mantel|table cloth/.test(text)) return "Mantel impermeable y fácil de limpiar";
  if (/cuaderno|notebook/.test(text)) return "Cuaderno con accesorios";
  if (/robot/.test(text) && /nino|educacion|ai/.test(text)) return "Robot educativo interactivo para niños";
  if (/alfombrilla.*(?:raton|mouse)|mousepad/.test(text)) return `Alfombrilla gaming${/charizard/.test(text) ? " Charizard" : ""}${/xxl/.test(text) ? " XXL" : ""}`;
  if (/freidora.*aire/.test(text) && /silicona/.test(text)) return "Molde de silicona para freidora de aire";
  if (/cuerda.*deform/.test(text)) return /nino|juguete/.test(text) ? "Cuerda deformable antiestrés para niños" : "Cuerda deformable antiestrés";
  return original;
}

function categoryFor(offer: LegacyOffer) {
  const directCategory = String(offer.category ?? "").trim();
  const text = normalise(`${directCategory} ${offer.title ?? ""} ${offer.text ?? ""}`);
  if (/gaming|gamer|consola|videojuego/.test(text)) return "Videojuegos";
  if (/electron|informat|telefono|mobile|data|memory|software/.test(text)) return "Tecnología";
  if (/cafe|capsula|freidora|aceite|cocina|taper/.test(text)) return "Cocina";
  if (/hogar|vileda|piscina|jardin|mueble|limpieza|bedding|bath|pillow/.test(text)) return "Hogar";
  if (/herramienta|bricolaje|diy|taladro/.test(text)) return "Bricolaje";
  if (/juguete|tamagotchi|muneco|nino|toy|baby/.test(text)) return "Juguetes";
  if (/reloj|moda|barba|gillette|fashion|ropa|calzado|bolso|bag/.test(text)) return "Moda";
  if (/stationery|paper|notebook|cuaderno/.test(text)) return "Papelería";
  return directCategory && !["Otros", "Todas"].includes(directCategory) && directCategory.length <= 28 ? directCategory : "Ofertas";
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

const importedDeals: Deal[] = (rawOffers as LegacyOffer[]).flatMap((offer) => {
  const price = parsePrice(offer.price);
  const extractedPrevious = offer.text?.match(/(?:PRECIO ANTERIOR|ANTES):\s*([\d.,]+)\s*(?:€|EUR)/i)?.[1];
  const previous = parsePrice(offer.previousPrice || extractedPrevious);
  const title = cleanTitle(offer.title);
  if (!price || !title || !offer.url || !offer.image) return [];
  const store: Deal["store"] = offer.store === "Amazon" || offer.store === "AliExpress" || offer.store === "Miravia" ? offer.store : "Otra";
  const date = formatDate(offer.date);
  return [{
    id: String(offer.chollometroId || offer.message_id || offer.url),
    title,
    store,
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

// The browser view uses exactly the same curated list as the sitemap and the
// individual offer pages. The legacy conversion remains only as a safe empty
// state during a broken local import.
const curatedDeals: Deal[] = publishedDeals.map((deal) => ({
  ...deal,
  store: deal.store as Deal["store"],
}));
const initialDeals = curatedDeals.length ? curatedDeals : importedDeals;

function displayDate(deals: Deal[]) {
  const dates = deals.flatMap((deal) => (deal.verifiedDate ? [new Date(deal.verifiedDate)] : []));
  const latest = dates.sort((a, b) => b.getTime() - a.getTime())[0];
  return latest ? latest.toLocaleDateString("es-ES", { day: "numeric", month: "long" }) : "hoy";
}

function shortTitle(title: string, maximum = 92) {
  if (title.length <= maximum) return title;
  const shortened = title.slice(0, maximum + 1).replace(/\s+\S*$/, "").trim();
  return `${shortened || title.slice(0, maximum)}…`;
}

function dealDetailsUrl(deal: Pick<Deal, "id">) {
  return `/oferta/${encodeURIComponent(deal.id)}`;
}

function offerCountLabel(total: number) {
  return `${total} ${total === 1 ? "oferta" : "ofertas"}`;
}

export function DealExplorer() {
  const [deals] = useState<Deal[]>(initialDeals);
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q")?.slice(0, 80) ?? "";
  });
  const [copied, setCopied] = useState<string | null>(null);

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(deals.map((deal) => deal.category))).sort((a, b) => a.localeCompare(b, "es"))],
    [deals],
  );

  const visibleDeals = useMemo(() => {
    const needle = normalise(query.trim());
    return deals.filter((deal) => (
      (category === "Todos" || deal.category === category)
      && (!needle || normalise(deal.title).includes(needle))
    ));
  }, [deals, category, query]);

  const averageDiscount = useMemo(() => {
    const discounted = deals.filter((deal) => deal.oldPrice > deal.price);
    if (!discounted.length) return 0;
    return Math.round(discounted.reduce((total, deal) => total + (1 - deal.price / deal.oldPrice) * 100, 0) / discounted.length);
  }, [deals]);
  const storeTotals = useMemo(() => ({
    Amazon: deals.filter((deal) => deal.store === "Amazon").length,
    AliExpress: deals.filter((deal) => deal.store === "AliExpress").length,
    Miravia: deals.filter((deal) => deal.store === "Miravia").length,
  }), [deals]);
  const sectionCovers = useMemo(() => ({
    amazon: deals.find((deal) => deal.store === "Amazon"),
    aliexpress: deals.find((deal) => deal.store === "AliExpress"),
    miravia: deals.find((deal) => deal.store === "Miravia"),
    tecnologia: deals.find((deal) => deal.category === "Tecnología"),
    videojuegos: deals.find((deal) => deal.category === "Videojuegos"),
    hogar: deals.find((deal) => deal.category === "Hogar"),
  }), [deals]);

  const featuredDeal = visibleDeals[0];
  // The highlighted deal is repeated in the chronological grid on purpose:
  // otherwise the newest Telegram publication looks missing to visitors who
  // go straight to “Chollos de hoy”.
  const gridDeals = visibleDeals;

  function copyCoupon(code: string) {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <main className="dealHome" id="inicio">
      <div className="announcement" role="status">
        <div className="shell announcementInner">
          <span><b>Actualizado a diario</b> · precios y enlaces comprobados</span>
          <a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Alertas en Telegram <span aria-hidden="true">↗</span></a>
        </div>
      </div>

      <header className="siteHeader">
        <div className="shell headerInner">
          <a className="brand" href="#inicio" aria-label="Chollos al Día, inicio">
            <span className="brandMark" aria-hidden="true">€</span>
            <span>Chollos <span>al</span>Día</span>
          </a>
          <nav aria-label="Navegación principal">
            <a href="#ofertas">Ofertas de hoy</a>
            <a href="#como-funciona">Cómo seleccionamos</a>
            <a className="telegramLink" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Telegram <span aria-hidden="true">↗</span></a>
          </nav>
        </div>
      </header>

      <section className="hero shell" aria-labelledby="hero-title">
        <div className="heroCopy">
          <p className="eyebrow"><span aria-hidden="true" />OFERTAS NUEVAS DURANTE TODO EL DÍA</p>
          <h1 id="hero-title">Ofertas reales.<br /><em>Ahorro sin vueltas.</em></h1>
          <p className="heroLead">Descubre chollos seleccionados de Amazon, AliExpress y Miravia. Precio visible, descuento claro y acceso directo a cada oferta.</p>
          <div className="heroActions">
            <a className="primaryButton" href="#ofertas">Ver ofertas ahora <span aria-hidden="true">↓</span></a>
            <a className="quietLink" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Recibir alertas gratis <span aria-hidden="true">↗</span></a>
          </div>
          <ul className="trustList" aria-label="Compromisos de Chollos al Día">
            <li>Precios a la vista</li>
            <li>Ofertas revisadas</li>
            <li>Alertas gratis</li>
          </ul>
        </div>
        {featuredDeal ? (
          <aside className="featuredPanel" aria-label="Oferta destacada">
            <a className="featuredImage featuredOfferLink" href={dealDetailsUrl(featuredDeal)}><img src={featuredDeal.imageUrl} alt={featuredDeal.title} width={720} height={560} /><span>DESTACADA</span></a>
            <div className="featuredBody"><p className="featuredMeta"><span className="liveDot" /> OFERTA ACTIVA · {featuredDeal.store}</p><h2><a href={dealDetailsUrl(featuredDeal)}>{shortTitle(featuredDeal.title, 72)}</a></h2><div className="featuredPrice"><strong>{money.format(featuredDeal.price)}</strong>{featuredDeal.oldPrice > featuredDeal.price && <span>Antes <s>{money.format(featuredDeal.oldPrice)}</s> · −{Math.round((1 - featuredDeal.price / featuredDeal.oldPrice) * 100)}%</span>}</div><a href={dealDetailsUrl(featuredDeal)}>Ver análisis de la oferta <span aria-hidden="true">→</span></a><p className="featuredFoot"><b>{deals.length}</b> ofertas activas · descuento medio −{averageDiscount}% · revisión {displayDate(deals)}</p></div>
          </aside>
        ) : <aside className="savingsPanel" aria-label="Resumen de las ofertas publicadas"><div className="panelTop"><span className="liveDot" /> EN DIRECTO</div><p>Descuento medio de las ofertas activas</p><strong>−{averageDiscount}%</strong></aside>}
      </section>

      <section className="storeRail shell" aria-label="Explorar ofertas por tienda">
        <div className="storeRailLead"><span className="liveDot" aria-hidden="true" /><div><b>{deals.length} ofertas activas</b><small>Actualizadas durante el día</small></div></div>
        <a className="storeQuick storeQuickAmazon" href="/ofertas/amazon"><span>a</span><div><b>Amazon</b><small>{offerCountLabel(storeTotals.Amazon)}</small></div><i aria-hidden="true">→</i></a>
        <a className="storeQuick storeQuickAli" href="/ofertas/aliexpress"><span>AE</span><div><b>AliExpress</b><small>{offerCountLabel(storeTotals.AliExpress)}</small></div><i aria-hidden="true">→</i></a>
        <a className="storeQuick storeQuickMiravia" href="/ofertas/miravia"><span>M</span><div><b>Miravia</b><small>{offerCountLabel(storeTotals.Miravia)}</small></div><i aria-hidden="true">→</i></a>
      </section>

      {adsenseHomeSlot && <div className="shell adSection">
        <AdSlot slot={adsenseHomeSlot} />
      </div>}

      <section className="offersSection" id="ofertas" aria-labelledby="offers-title">
        <div className="shell">
          <div className="sectionIntro">
            <div>
              <p className="eyebrow"><span aria-hidden="true" />RECIÉN PUBLICADOS</p>
              <h2 id="offers-title">Últimos chollos</h2>
            </div>
            <p>Precios válidos en el momento de la publicación. Pueden cambiar o agotarse.</p>
          </div>

          <div className="controls">
            <div className="filters" role="group" aria-label="Filtrar ofertas por categoría">
              {categories.map((item) => (
                <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
              ))}
            </div>
            <label className="search">
              <span aria-hidden="true">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar una oferta" aria-label="Buscar ofertas" />
            </label>
          </div>

          <p className="resultsSummary" aria-live="polite"><b>{visibleDeals.length}</b> {visibleDeals.length === 1 ? "oferta encontrada" : "ofertas encontradas"}</p>
          <div className="dealGrid">
            {gridDeals.map((deal) => {
              const discount = Math.max(0, Math.round((1 - deal.price / deal.oldPrice) * 100));
              return (
                <article className="dealCard" data-store={deal.store} key={deal.id}>
                  <a className="imageWrap dealPreviewLink" href={dealDetailsUrl(deal)} aria-label={`Ver análisis de ${deal.title}`}>
                    <img src={deal.imageUrl} alt={deal.title} loading="lazy" decoding="async" width={720} height={560} />
                    {discount > 0 && <span className="discountBadge">−{discount}%</span>}
                    <span className="storeBadge">{deal.store}</span>
                  </a>
                  <div className="dealBody">
                    <p className="categoryLabel">{deal.category}</p>
                    <h3 title={deal.title}><a href={dealDetailsUrl(deal)}>{shortTitle(deal.title)}</a></h3>
                    <div className="priceRow">
                      <strong>{money.format(deal.price)}</strong>
                      {discount > 0 && <span>Antes <s>{money.format(deal.oldPrice)}</s></span>}
                    </div>
                    {discount > 0 && <p className="saving">Ahorras {money.format(deal.oldPrice - deal.price)}</p>}
                    {deal.coupon ? (
                      <button className="coupon" onClick={() => copyCoupon(deal.coupon!)} aria-label={`Copiar cupón ${deal.coupon}`}>
                        <span>Cupón</span><b>{copied === deal.coupon ? "¡Copiado!" : deal.coupon}</b><i aria-hidden="true">□</i>
                      </button>
                    ) : <p className="noCoupon">Precio directo, sin cupón extra</p>}
                    <a className="dealButton" href={dealDetailsUrl(deal)}>Ver el chollo <span aria-hidden="true">→</span></a>
                    <p className="verified"><span aria-hidden="true" />Oferta activa · {deal.verifiedDate ? <time dateTime={deal.verifiedDate}>{deal.verifiedAt}</time> : deal.verifiedAt}</p>
                  </div>
                </article>
              );
            })}
          </div>
          {!visibleDeals.length && <div className="empty"><b>No hemos encontrado ofertas con esa búsqueda.</b><span>Prueba con otra palabra o vuelve a “Todos”.</span></div>}
        </div>
      </section>

      <section className="savingGuides shell" aria-labelledby="guides-title">
        <div className="guidesIntro">
          <p className="eyebrow"><span aria-hidden="true" />COMPRA MEJOR, SIN BUSCAR MÁS</p>
          <h2 id="guides-title">Guías rápidas<br />para <em>ahorrar mejor.</em></h2>
        </div>
        <div className="guideGrid">
          <a href="/guias/ofertas-amazon" className="guideCard guideAmazon"><span>AMAZON</span><h3>Como encontrar ofertas de Amazon que merecen la pena</h3><p>Una lista sencilla para comprobar precio, variante y condiciones antes de comprar.</p><b>Leer guia <i aria-hidden="true">→</i></b></a>
          <a href="/guias/cupones-aliexpress" className="guideCard guideAli"><span>ALIEXPRESS</span><h3>Cupones y precios finales de AliExpress</h3><p>Aprende a revisar condiciones y a aplicar el descuento antes de pagar.</p><b>Leer guia <i aria-hidden="true">→</i></b></a>
          <a href="/guias/detectar-chollos-reales" className="guideCard guideHow"><span>MÉTODO</span><h3>Como saber si una oferta es realmente buena</h3><p>Consulta el precio anterior, las condiciones y la ficha antes de comprar.</p><b>Ver el metodo <i aria-hidden="true">→</i></b></a>
        </div>
      </section>

      <section className="storeDirectory shell" aria-labelledby="stores-title">
        <div><p className="eyebrow"><span aria-hidden="true" />EXPLORA POR TIENDA</p><h2 id="stores-title">Encuentra chollos donde prefieres comprar.</h2></div>
        <div className="storeDirectoryGrid">
          <a className="sectionCover storeAmazon" href="/ofertas/amazon">{sectionCovers.amazon && <img src={sectionCovers.amazon.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><span>Amazon</span><b>Ofertas con precio y ahorro visible <i aria-hidden="true">→</i></b></a>
          <a className="sectionCover storeAliExpress" href="/ofertas/aliexpress">{sectionCovers.aliexpress && <img src={sectionCovers.aliexpress.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><span>AliExpress</span><b>Chollos y cupones publicados <i aria-hidden="true">→</i></b></a>
          <a className="sectionCover storeMiravia" href="/ofertas/miravia">{sectionCovers.miravia && <img src={sectionCovers.miravia.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><span>Miravia</span><b>Productos seleccionados de Miravia <i aria-hidden="true">→</i></b></a>
        </div>
      </section>

      <section className="categoryDirectory shell" aria-labelledby="categories-title">
        <div><p className="eyebrow"><span aria-hidden="true" />CHOLLOS POR CATEGORIA</p><h2 id="categories-title">Ve directo a lo que buscas.</h2></div>
        <div className="categoryDirectoryGrid">
          <a className="sectionCover categoryTech" href="/chollos/tecnologia">{sectionCovers.tecnologia && <img src={sectionCovers.tecnologia.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><span>Tecnología</span><b>Electrónica, informática y accesorios <i aria-hidden="true">→</i></b></a>
          <a className="sectionCover categoryGaming" href="/chollos/videojuegos">{sectionCovers.videojuegos && <img src={sectionCovers.videojuegos.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><span>Videojuegos</span><b>Gaming y accesorios para jugar <i aria-hidden="true">→</i></b></a>
          <a className="sectionCover categoryHome" href="/chollos/hogar">{sectionCovers.hogar && <img src={sectionCovers.hogar.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><span>Hogar</span><b>Selección útil para casa y cocina <i aria-hidden="true">→</i></b></a>
        </div>
      </section>

      <section className="process shell" id="como-funciona" aria-labelledby="process-title">
        <div className="processHeading">
          <p className="eyebrow"><span aria-hidden="true" />UN RADAR PARA COMPRAR MEJOR</p>
          <h2 id="process-title">Menos vueltas.<br /><em>Más ahorro.</em></h2>
        </div>
        <ol>
          <li><b>01</b><div><strong>Detectamos</strong><p>Buscamos ofertas en tiendas y programas de afiliación con productos que tienen movimiento real.</p></div></li>
          <li><b>02</b><div><strong>Comprobamos</strong><p>Publicamos el precio, el descuento y el enlace de compra de forma clara, sin inventar condiciones.</p></div></li>
          <li><b>03</b><div><strong>Te avisamos</strong><p>La oferta llega a la web y al canal de Telegram para que puedas verla antes de que se agote.</p></div></li>
        </ol>
      </section>

      <section className="telegramCta" aria-labelledby="telegram-title">
        <div className="shell telegramInner">
          <div><p className="eyebrow"><span aria-hidden="true" />NO LLEGUES TARDE</p><h2 id="telegram-title">Las alertas llegan<br />antes de que se agoten.</h2></div>
          <div><p>Entra gratis al canal para recibir nuevos chollos de Amazon, AliExpress y Miravia directamente en Telegram.</p><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Recibir alertas gratis <span aria-hidden="true">↗</span></a><small>No necesitas dejar tu correo ni crear otra cuenta.</small></div>
        </div>
      </section>

      <section className="faq shell" aria-labelledby="faq-title">
        <p className="eyebrow"><span aria-hidden="true" />TRANSPARENCIA ANTE TODO</p>
        <h2 id="faq-title">Preguntas frecuentes</h2>
        <details><summary>¿Cómo seleccionáis las ofertas?<span aria-hidden="true">+</span></summary><p>Priorizamos descuentos visibles, precios comparados, productos con actividad y enlaces de compra que se puedan comprobar.</p></details>
        <details><summary>¿El precio final puede cambiar?<span aria-hidden="true">+</span></summary><p>Sí. Las tiendas pueden modificar el precio, el stock o las condiciones sin previo aviso. Mostramos el dato disponible cuando se publica la oferta.</p></details>
        <details><summary>¿Comprar desde estos enlaces cuesta más?<span aria-hidden="true">+</span></summary><p>No. Algunos enlaces son de afiliación y pueden generar una comisión para Chollos al Día, sin aumentar el precio para ti.</p></details>
      </section>

      <footer>
        <div className="shell footerGrid">
          <div className="footerBrand"><a className="brand" href="#inicio"><span className="brandMark" aria-hidden="true">€</span><span>Chollos <span>al</span>Día</span></a><p>Ofertas verificadas para comprar mejor cada día.</p></div>
          <div><strong>Explora</strong><a href="#ofertas">Ofertas de hoy</a><a href="/guias/detectar-chollos-reales">Guias para ahorrar</a><a href="#como-funciona">Cómo funciona</a><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Canal de Telegram</a></div>
          <div><strong>Información</strong><a href="/contacto">Contacto</a><a href="/como-verificamos-ofertas">Cómo verificamos las ofertas</a><a href="mailto:chollosaldia@gmail.com">chollosaldia@gmail.com</a><a href="/aviso-legal">Aviso legal</a><a href="/privacidad">Privacidad</a><a href="/afiliacion">Política de afiliación</a></div>
        </div>
        <div className="shell footnote"><span>© {new Date().getFullYear()} Chollos al Día</span><p>Como afiliado, Chollos al Día puede recibir una comisión por compras que cumplen los requisitos. El precio para ti no cambia.</p></div>
      </footer>
      <a className="telegramDock" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer" aria-label="Recibir alertas de ofertas en Telegram"><span aria-hidden="true">✦</span> Alertas de chollos <b>Gratis ↗</b></a>
    </main>
  );
}
