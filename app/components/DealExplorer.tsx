"use client";

import { useMemo, useState } from "react";
import rawOffers from "../../data/offers.json";
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
  const storeCount = useMemo(() => new Set(deals.map((deal) => deal.store)).size, [deals]);
  const bestDiscount = useMemo(
    () => Math.max(0, ...deals.map((deal) => Math.round((1 - deal.price / deal.oldPrice) * 100))),
    [deals],
  );

  const featuredDeal = visibleDeals[0];
  const gridDeals = visibleDeals.slice(1);

  function copyCoupon(code: string) {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <main id="inicio">
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
          <p className="eyebrow"><span aria-hidden="true" />RADAR DE CHOLLOS · AMAZON · ALIEXPRESS · MIRAVIA</p>
          <h1 id="hero-title">Chollos de hoy<br />que <em>sí merece</em> la pena abrir.</h1>
          <p className="heroLead">Una selección diaria de ofertas con precio claro, ahorro calculado y acceso directo a la tienda. Menos ruido, mejores decisiones de compra.</p>
          <div className="heroActions">
            <a className="primaryButton" href="#ofertas">Explorar chollos de hoy <span aria-hidden="true">↓</span></a>
            <a className="quietLink" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Recibir alertas gratis <span aria-hidden="true">↗</span></a>
          </div>
          <ul className="trustList" aria-label="Compromisos de Chollos al Día">
            <li>Descuento claro</li>
            <li>Enlace de afiliado identificado</li>
            <li>Sin coste adicional para ti</li>
          </ul>
        </div>
        {featuredDeal ? (
          <aside className="featuredPanel" aria-label="Oferta destacada">
            <a className="featuredImage featuredOfferLink" href={dealDetailsUrl(featuredDeal)}><img src={featuredDeal.imageUrl} alt={featuredDeal.title} width={720} height={560} /><span>DESTACADA</span></a>
            <div className="featuredBody"><p className="featuredMeta"><span className="liveDot" /> OFERTA ACTIVA · {featuredDeal.store}</p><h2><a href={dealDetailsUrl(featuredDeal)}>{shortTitle(featuredDeal.title, 72)}</a></h2><div className="featuredPrice"><strong>{money.format(featuredDeal.price)}</strong>{featuredDeal.oldPrice > featuredDeal.price && <span>Antes <s>{money.format(featuredDeal.oldPrice)}</s> · −{Math.round((1 - featuredDeal.price / featuredDeal.oldPrice) * 100)}%</span>}</div><a href={dealDetailsUrl(featuredDeal)}>Ver análisis de la oferta <span aria-hidden="true">→</span></a><p className="featuredFoot"><b>{deals.length}</b> ofertas activas · descuento medio −{averageDiscount}% · revisión {displayDate(deals)}</p></div>
          </aside>
        ) : <aside className="savingsPanel" aria-label="Resumen de las ofertas publicadas"><div className="panelTop"><span className="liveDot" /> EN DIRECTO</div><p>Descuento medio de las ofertas activas</p><strong>−{averageDiscount}%</strong></aside>}
      </section>

      <section className="editorialStrip" aria-label="Criterios de selección">
        <div className="shell editorialStripInner">
          <p><b>Selección editorial</b><span>Solo se publican productos identificables, con enlace válido y precio registrado.</span></p>
          <div className="editorialMetrics" aria-label="Resumen de ofertas">
            <span><b>{deals.length}</b> chollos</span>
            <span><b>{storeCount}</b> tiendas</span>
            <span><b>−{averageDiscount}%</b> ahorro medio</span>
          </div>
        </div>
      </section>

      <section className="benefitBand" aria-label="Ventajas de Chollos al Día">
        <div className="shell benefitGrid">
          <article><span aria-hidden="true">01</span><h2>Precio a la vista</h2><p>Ves el importe actual, el precio anterior y el ahorro antes de salir de la web.</p></article>
          <article><span aria-hidden="true">02</span><h2>Compra sin rodeos</h2><p>Cada chollo lleva a su ficha con contexto y un enlace directo a la tienda.</p></article>
          <article><span aria-hidden="true">03</span><h2>Alertas cuando importan</h2><p>Las oportunidades nuevas también llegan al canal de Telegram para no llegar tarde.</p></article>
        </div>
      </section>

      <section className="dealPulse" aria-label="Resumen de las ofertas activas">
        <div className="shell dealPulseInner">
          <div className="pulseIntro"><span className="liveDot" aria-hidden="true" /><div><b>RADAR CHOLLOS AL DÍA</b><p>Selección en movimiento</p></div></div>
          <div className="pulseStat"><strong>{deals.length}</strong><span>ofertas activas</span></div>
          <div className="pulseStat"><strong>−{averageDiscount}%</strong><span>descuento medio</span></div>
          <div className="pulseStat"><strong>−{bestDiscount}%</strong><span>mejor descuento</span></div>
          <div className="pulseStat"><strong>{storeCount}</strong><span>tiendas revisadas</span></div>
        </div>
      </section>

      <section className="offersSection" id="ofertas" aria-labelledby="offers-title">
        <div className="shell">
          <div className="sectionIntro">
            <div>
              <p className="eyebrow"><span aria-hidden="true" />LO ÚLTIMO QUE MERECE LA PENA</p>
              <h2 id="offers-title">Chollos de hoy</h2>
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
                <article className="dealCard" key={deal.id}>
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
                    <a className="dealButton" href={dealDetailsUrl(deal)}>Ver oferta y análisis <span aria-hidden="true">→</span></a>
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
          <a href="#ofertas" className="guideCard guideAmazon"><span>AMAZON</span><h3>Ofertas de Amazon que merece la pena vigilar</h3><p>Productos con descuento visible y datos de precio para decidir con rapidez.</p><b>Ver ofertas <i aria-hidden="true">→</i></b></a>
          <a href="#ofertas" className="guideCard guideAli"><span>ALIEXPRESS</span><h3>Cupones y precios directos de AliExpress</h3><p>Encuentra oportunidades y códigos que reducen el precio final de compra.</p><b>Explorar chollos <i aria-hidden="true">→</i></b></a>
          <a href="#como-funciona" className="guideCard guideHow"><span>MÉTODO</span><h3>Cómo saber si una oferta es realmente buena</h3><p>Consulta el precio anterior, las condiciones y la ficha antes de comprar.</p><b>Conocer el proceso <i aria-hidden="true">→</i></b></a>
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
          <div><p className="eyebrow"><span aria-hidden="true" />NO LLEGUES TARDE</p><h2 id="telegram-title">Los mejores precios<br />no esperan.</h2></div>
          <div><p>Únete al canal y recibe los nuevos chollos en Telegram.</p><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Unirme gratis <span aria-hidden="true">↗</span></a></div>
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
          <div><strong>Explora</strong><a href="#ofertas">Ofertas de hoy</a><a href="#como-funciona">Cómo funciona</a><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Canal de Telegram</a></div>
          <div><strong>Información</strong><a href="/contacto">Contacto</a><a href="/aviso-legal">Aviso legal</a><a href="/privacidad">Privacidad</a><a href="/afiliacion">Política de afiliación</a></div>
        </div>
        <div className="shell footnote"><span>© {new Date().getFullYear()} Chollos al Día</span><p>Como afiliado, Chollos al Día puede recibir una comisión por compras que cumplen los requisitos. El precio para ti no cambia.</p></div>
      </footer>
    </main>
  );
}
