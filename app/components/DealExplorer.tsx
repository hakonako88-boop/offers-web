"use client";

import { useEffect, useMemo, useState } from "react";
import rawOffers from "../../data/offers.json";

export type Deal = {
  id: string;
  title: string;
  store: "Amazon" | "AliExpress" | "Otra";
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
  return String(value ?? "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/^(OFERT[ÓO]N\s+(AMAZON|ALIEXPRESS)\s*[-–—:]?\s*)/i, "")
    .replace(/🔥|🚨|🛒|📺|🍃|🛢️/gu, "")
    .trim();
}

function categoryFor(offer: LegacyOffer) {
  const directCategory = String(offer.category ?? "").trim();
  if (directCategory && !["Otros", "Todas"].includes(directCategory)) return directCategory;

  const text = normalise(`${offer.title ?? ""} ${offer.text ?? ""}`);
  if (/cafe|capsula|freidora|aceite|cocina|taper/.test(text)) return "Cocina";
  if (/hogar|vileda|piscina|jardin|mueble|limpieza/.test(text)) return "Hogar";
  if (/herramienta|bricolaje|diy|taladro/.test(text)) return "Bricolaje";
  if (/gamer|gaming|raton|teclado|consola/.test(text)) return "Videojuegos";
  if (/juguete|tamagotchi|muneco|nino/.test(text)) return "Juguetes";
  if (/reloj|moda|barba|gillette/.test(text)) return "Moda";
  return "Tecnología";
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
  const store: Deal["store"] = offer.store === "Amazon" || offer.store === "AliExpress" ? offer.store : "Otra";
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
  const [deals, setDeals] = useState<Deal[]>(importedDeals);
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q")?.slice(0, 80) ?? "";
  });
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/deals")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => {
        if (Array.isArray(payload.deals) && payload.deals.length) setDeals(payload.deals as Deal[]);
      })
      .catch(() => undefined);
  }, []);

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
          <p className="eyebrow"><span aria-hidden="true" />SELECCIÓN INTELIGENTE DE OFERTAS</p>
          <h1 id="hero-title">Ofertas reales<br />para <em>pagar menos.</em></h1>
          <p className="heroLead">Seleccionamos chollos con descuento visible, precio comparado y enlace directo. Tú decides; nosotros te ayudamos a encontrar el ahorro.</p>
          <div className="heroActions">
            <a className="primaryButton" href="#ofertas">Ver ofertas de hoy <span aria-hidden="true">↓</span></a>
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
          <div><strong>Información</strong><a href="/aviso-legal">Aviso legal</a><a href="/privacidad">Privacidad</a><a href="/afiliacion">Política de afiliación</a></div>
        </div>
        <div className="shell footnote"><span>© {new Date().getFullYear()} Chollos al Día</span><p>Como afiliado, Chollos al Día puede recibir una comisión por compras que cumplen los requisitos. El precio para ti no cambia.</p></div>
      </footer>
    </main>
  );
}
