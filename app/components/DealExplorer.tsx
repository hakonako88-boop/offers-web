"use client";

/* The site is statically exported to GitHub Pages, so native links and the
 * already-optimized merchant images are intentional in this client view. */
/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import AdSlot from "./AdSlot";
import { adsenseHomeSlot } from "../lib/adsense";
import { postHref } from "../lib/posts";
import type { PublishedPost } from "../lib/posts";
import { offerEditorialLabel } from "../lib/offer-label";
import { editorialCardTitle } from "../lib/display-title";
import StoreLogo from "./StoreLogo";

export type Deal = {
  id: string;
  title: string;
  store: "Amazon" | "AliExpress" | "Miravia" | "Xiaomi" | "El Corte Inglés" | "PcComponentes" | "MediaMarkt" | "Otra";
  category: string;
  subcategory?: string;
  categoryConfidence: number;
  price: number;
  oldPrice: number;
  coupon?: string;
  imageUrl: string;
  affiliateUrl: string;
  verifiedAt: string;
  verifiedDate?: string;
};

export type DealSummary = {
  total: number;
  averageDiscount: number;
  stores: Record<"Amazon" | "AliExpress" | "Miravia" | "Xiaomi" | "PcComponentes" | "ElCorteIngles" | "MediaMarkt", number>;
};

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function normalise(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-ES");
}

function shortTitle(title: string, maximum = 92) {
  if (title.length <= maximum) return title;
  const shortened = title.slice(0, maximum + 1).replace(/\s+\S*$/, "").trim();
  return `${shortened || title.slice(0, maximum)}…`;
}

function dealDetailsUrl(deal: Pick<Deal, "id">) {
  return `/oferta/${encodeURIComponent(deal.id)}/`;
}

function offerCountLabel(total: number) {
  return `${total} ${total === 1 ? "oferta" : "ofertas"}`;
}

export function DealExplorer({ initialDeals, posts, summary }: { initialDeals: Deal[]; posts: PublishedPost[]; summary: DealSummary }) {
  const newestOfferDate = Date.parse(initialDeals[0]?.verifiedDate || "");
  const featuredPost = posts.find((post) => /^mejores-productos-(?:dia|semana)-/u.test(post.id)
    && Number.isFinite(newestOfferDate) && newestOfferDate - Date.parse(post.publishedAt) < 7 * 24 * 60 * 60 * 1000);
  const [deals] = useState<Deal[]>(initialDeals);
  const [blackFridayVisible, setBlackFridayVisible] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(18);
  const [category, setCategory] = useState("Todos");
  const [store, setStore] = useState("Todas");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [minimumDiscount, setMinimumDiscount] = useState(0);
  const [dateRange, setDateRange] = useState("all");
  const [couponOnly, setCouponOnly] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q")?.slice(0, 80) ?? "";
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedReady, setSavedReady] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const filtersReady = useRef(false);

  useEffect(() => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    setBlackFridayVisible(today >= "2026-10-27" && today <= "2026-11-30");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem("chollosaldia:saved-offers") || "[]");
        if (Array.isArray(stored)) setSavedIds(stored.filter((id): id is string => typeof id === "string").slice(0, 100));
      } catch { /* Storage may be disabled. The feature still works for this visit. */ }
      setSavedReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!savedReady) return;
    try { window.localStorage.setItem("chollosaldia:saved-offers", JSON.stringify(savedIds)); } catch { /* Private browsing can block storage. */ }
  }, [savedIds, savedReady]);

  useEffect(() => {
    if (!filtersReady.current) { filtersReady.current = true; return; }
    window.gtag?.("event", "filter_used", { category, store, minimum_discount: minimumDiscount, date_range: dateRange, coupon_only: couponOnly, sort_by: sortBy });
  }, [category, store, minimumDiscount, dateRange, couponOnly, sortBy]);

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(deals.map((deal) => deal.category))).sort((a, b) => a.localeCompare(b, "es"))],
    [deals],
  );
  const stores = useMemo(() => ["Todas", ...Array.from(new Set(deals.map((deal) => deal.store))).sort((a, b) => a.localeCompare(b, "es"))], [deals]);

  const visibleDeals = useMemo(() => {
    const needle = normalise(query.trim());
    const min = Number.parseFloat(minimumPrice.replace(",", "."));
    const max = Number.parseFloat(maximumPrice.replace(",", "."));
    const newestTimestamp = deals.reduce((latest, deal) => Math.max(latest, Date.parse(deal.verifiedDate || "") || 0), 0);
    const maximumAge = dateRange === "today" ? 24 * 60 * 60 * 1000 : dateRange === "3d" ? 3 * 24 * 60 * 60 * 1000 : dateRange === "7d" ? 7 * 24 * 60 * 60 * 1000 : Infinity;
    const filtered = deals.filter((deal) => (
      (category === "Todos" || deal.category === category)
      && (store === "Todas" || deal.store === store)
      && (!needle || normalise(`${deal.title} ${deal.category} ${deal.subcategory || ""} ${deal.store}`).includes(needle))
      && (!Number.isFinite(min) || deal.price >= min)
      && (!Number.isFinite(max) || deal.price <= max)
      && (deal.oldPrice > deal.price ? Math.round((1 - deal.price / deal.oldPrice) * 100) : 0) >= minimumDiscount
      && (!couponOnly || Boolean(deal.coupon))
      && (!savedOnly || savedIds.includes(deal.id))
      && (!Number.isFinite(maximumAge) || Boolean(deal.verifiedDate && newestTimestamp - Date.parse(deal.verifiedDate) <= maximumAge))
    ));
    return filtered.sort((left, right) => {
      if (sortBy === "discount") return ((1 - right.price / right.oldPrice) || 0) - ((1 - left.price / left.oldPrice) || 0);
      if (sortBy === "saving") return (right.oldPrice - right.price) - (left.oldPrice - left.price);
      if (sortBy === "price") return left.price - right.price;
      return Date.parse(right.verifiedDate || "") - Date.parse(left.verifiedDate || "");
    });
  }, [deals, category, store, query, minimumPrice, maximumPrice, minimumDiscount, dateRange, couponOnly, savedOnly, savedIds, sortBy]);

  const filtersActive = category !== "Todos" || store !== "Todas" || query.trim() !== "" || minimumPrice !== "" || maximumPrice !== "" || minimumDiscount > 0 || dateRange !== "all" || couponOnly || savedOnly || sortBy !== "recent";

  function clearFilters() {
    setCategory("Todos"); setStore("Todas"); setQuery(""); setMinimumPrice(""); setMaximumPrice("");
    setMinimumDiscount(0); setDateRange("all"); setCouponOnly(false); setSavedOnly(false); setSortBy("recent");
  }

  const storeTotals = summary.stores;
  const sectionCovers = useMemo(() => ({
    amazon: deals.find((deal) => deal.store === "Amazon"),
    aliexpress: deals.find((deal) => deal.store === "AliExpress"),
    miravia: deals.find((deal) => deal.store === "Miravia"),
    xiaomi: deals.find((deal) => deal.store === "Xiaomi"),
    pccomponentes: deals.find((deal) => deal.store === "PcComponentes"),
    elCorteIngles: deals.find((deal) => deal.store === "El Corte Inglés"),
    mediamarkt: deals.find((deal) => deal.store === "MediaMarkt"),
    tecnologia: deals.find((deal) => deal.category === "Tecnología"),
    videojuegos: deals.find((deal) => deal.category === "Gaming"),
    hogar: deals.find((deal) => deal.category === "Hogar"),
  }), [deals]);

  const gridDeals = visibleDeals.slice(0, visibleLimit);
  const heroDeal = deals[0];
  const visibleInsights = useMemo(() => {
    const discounted = visibleDeals.filter((deal) => deal.oldPrice > deal.price);
    const totalSaving = discounted.reduce((total, deal) => total + (deal.oldPrice - deal.price), 0);
    return {
      coupons: visibleDeals.filter((deal) => Boolean(deal.coupon)).length,
      averageSaving: discounted.length ? totalSaving / discounted.length : 0,
      bestDiscount: discounted.reduce((best, deal) => Math.max(best, Math.round((1 - deal.price / deal.oldPrice) * 100)), 0),
    };
  }, [visibleDeals]);

  function copyCoupon(code: string) {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(null), 1600);
  }

  function toggleSaved(id: string) {
    setSavedIds((current) => current.includes(id) ? current.filter((saved) => saved !== id) : [...current, id].slice(-100));
  }

  async function shareDeal(deal: Deal) {
    const url = new URL(dealDetailsUrl(deal), window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: deal.title, url });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); setSharedId(deal.id); window.setTimeout(() => setSharedId(null), 2000); }
    } catch { /* The visitor can cancel the native share sheet. */ }
  }

  return (
    <main className="dealHome" id="inicio">
      <div className="announcement" role="status">
        <div className="shell announcementInner">
          <span><b>Ofertas recientes</b> · confirma precio y disponibilidad en la tienda</span>
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
            <a href="/buscar/">Buscar</a>
            <a href="/blog/">Blog</a>
            <a href="/black-friday-2026/">Black Friday</a>
            {posts.length > 0 && <a href="#novedades">Novedades</a>}
            <a href="#como-funciona">Cómo seleccionamos</a>
            <a className="telegramLink" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Telegram <span aria-hidden="true">↗</span></a>
          </nav>
          <details className="mobileNav">
            <summary aria-label="Abrir menú de navegación"><span aria-hidden="true">☰</span> Menú</summary>
            <div className="mobileNavMenu">
              <a href="#ofertas">🔥 Ofertas de hoy</a>
              <a href="/buscar/">⌕ Buscar ofertas</a>
              <a href="/blog/">⭐ Mejores productos</a>
              <a href="/black-friday-2026/">Black Friday 2026</a>
              <a href="/chollos/tecnologia/">📱 Tecnología</a>
              <a href="/chollos/hogar/">🏠 Hogar y cocina</a>
              {posts.length > 0 && <a href="#novedades">📰 Guías y novedades</a>}
              <a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">✈️ Canal de Telegram ↗</a>
            </div>
          </details>
        </div>
      </header>

      {blackFridayVisible && <aside className="shell blackFridayHome" aria-label="Especial Black Friday 2026">
        <div><span>ESPECIAL · 27–30 NOVIEMBRE</span><h2>Black Friday 2026, sin descuentos de humo.</h2><p>Guía, cupones y ofertas verificadas de varias tiendas. Consulta las ofertas recientes y comprueba las condiciones de cada promoción.</p></div>
        <a href="/black-friday-2026/">Ver el especial <b aria-hidden="true">↗</b></a>
      </aside>}

      <section className="hero shell" aria-labelledby="hero-title">
        <div className="heroCopy">
          <p className="eyebrow"><span aria-hidden="true" />EL RADAR DE CHOLLOS AL DÍA · EDICIÓN DIARIA</p>
          <h1 id="hero-title">Chollos de hoy.<br /> <em>Elegidos con criterio.</em></h1>
          <p className="heroLead">Ofertas recientes de Amazon, AliExpress y otras tiendas. Producto reconocible, precio a la vista y condiciones claras para decidir mejor.</p>
          <form className="heroSearch" role="search" onSubmit={(event) => { event.preventDefault(); document.getElementById("ofertas")?.scrollIntoView({ behavior: "smooth" }); }}>
            <label htmlFor="home-offer-search">¿Qué estás buscando?</label>
            <div className="heroSearchBox"><span aria-hidden="true">⌕</span><input id="home-offer-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Móvil, cafetera, cupón…" /><button type="submit">Buscar ofertas</button></div>
            <div className="heroSearchShortcuts" aria-label="Búsquedas rápidas">
              <span>Explora:</span>
              <button type="button" onClick={() => { setCategory("Tecnología"); document.getElementById("ofertas")?.scrollIntoView({ behavior: "smooth" }); }}>Tecnología</button>
              <button type="button" onClick={() => { setCategory("Hogar"); document.getElementById("ofertas")?.scrollIntoView({ behavior: "smooth" }); }}>Hogar</button>
              <button type="button" onClick={() => { setCouponOnly(true); document.getElementById("ofertas")?.scrollIntoView({ behavior: "smooth" }); }}>Con cupón</button>
            </div>
          </form>
          <div className="heroActions">
            <a className="primaryButton" href="#ofertas">Explorar chollos <span aria-hidden="true">↓</span></a>
            <a className="quietLink" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Recibir alertas gratis <span aria-hidden="true">↗</span></a>
          </div>
          <ul className="trustList" aria-label="Qué muestra cada oferta">
            <li>Precio publicado</li>
            <li>Foto del producto</li>
            <li>Cupón cuando existe</li>
          </ul>
        </div>
        {heroDeal && <aside className="heroFeature" aria-label="Oferta destacada ahora">
          <a className="heroFeatureImage" href={dealDetailsUrl(heroDeal)}><img src={heroDeal.imageUrl} alt={heroDeal.title} width={620} height={500} fetchPriority="high" /></a>
          <div className="heroFeatureDetails"><span>EN PORTADA · {heroDeal.store}</span><h2><a href={dealDetailsUrl(heroDeal)}>{shortTitle(heroDeal.title, 82)}</a></h2><div><strong>{money.format(heroDeal.price)}</strong>{heroDeal.oldPrice - heroDeal.price >= 1 && <s>{money.format(heroDeal.oldPrice)}</s>}</div><a className="heroFeatureButton" href={dealDetailsUrl(heroDeal)}>Analizar esta oferta <b aria-hidden="true">↗</b></a></div>
        </aside>}
      </section>

      <section className="offersSection" id="ofertas" aria-labelledby="offers-title">
        <div className="shell">
          <div className="sectionIntro">
            <div>
              <p className="eyebrow"><span aria-hidden="true" />RECIÉN PUBLICADOS</p>
              <h2 id="offers-title">El radar de hoy</h2>
            </div>
            <p>Precios válidos en el momento de la publicación. Pueden cambiar o agotarse.</p>
          </div>

          <div className="offerToolbar"><p>Explora a tu ritmo</p><button type="button" className={savedOnly ? "savedFilter active" : "savedFilter"} onClick={() => setSavedOnly((active) => !active)} aria-pressed={savedOnly}>♥ Guardadas <span>{savedIds.length}</span></button></div>
          <div className="controls">
            <details className="advancedFilters"><summary>Filtros <span>{filtersActive ? "activos" : ""}</span></summary><div className="filterGrid">
              <label>Categoría<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Tienda<select value={store} onChange={(event) => setStore(event.target.value)}>{stores.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Precio desde<input inputMode="decimal" value={minimumPrice} onChange={(event) => setMinimumPrice(event.target.value)} placeholder="0 €" /></label>
              <label>Precio hasta<input inputMode="decimal" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)} placeholder="Sin límite" /></label>
              <label>Descuento mínimo<select value={minimumDiscount} onChange={(event) => setMinimumDiscount(Number(event.target.value))}><option value="0">Cualquiera</option><option value="10">10 %</option><option value="20">20 %</option><option value="30">30 %</option><option value="40">40 %</option><option value="50">50 %+</option></select></label>
              <label>Fecha<select value={dateRange} onChange={(event) => setDateRange(event.target.value)}><option value="all">Últimas 2 semanas</option><option value="today">Últimas 24 horas</option><option value="3d">Últimos 3 días</option><option value="7d">Última semana</option></select></label>
              <label>Ordenar<select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="recent">Más recientes</option><option value="discount">Mayor descuento</option><option value="saving">Mayor ahorro en €</option><option value="price">Precio más bajo</option></select></label>
              <label className="couponFilter"><input type="checkbox" checked={couponOnly} onChange={(event) => setCouponOnly(event.target.checked)} /> Solo con cupón</label>
            </div>{filtersActive && <button className="clearFilters" onClick={clearFilters}>Quitar todos los filtros</button>}</details>
          </div>

          <p className="resultsSummary" aria-live="polite"><b>{summary.total}</b> ofertas recientes · <b>{visibleDeals.length}</b> {visibleDeals.length === 1 ? "coincide" : "coinciden"} con tus filtros · mostrando {Math.min(gridDeals.length, visibleDeals.length)}</p>
          {visibleDeals.length > 0 && <div className="resultsInsights" aria-label="Resumen de las ofertas mostradas">
            <span><b>{visibleInsights.bestDiscount}%</b><small>mayor descuento</small></span>
            <span><b>{visibleInsights.averageSaving ? money.format(visibleInsights.averageSaving) : "—"}</b><small>ahorro medio</small></span>
            <span><b>{visibleInsights.coupons}</b><small>{visibleInsights.coupons === 1 ? "oferta con cupón" : "ofertas con cupón"}</small></span>
          </div>}
          <div className="dealGrid">
            {gridDeals.map((deal, index) => {
              const discount = Math.max(0, Math.round((1 - deal.price / deal.oldPrice) * 100));
              const meaningfulSaving = discount >= 5 && deal.oldPrice - deal.price >= 1;
              return (
                <article className="dealCard" data-store={deal.store} key={deal.id}>
                  <a className="imageWrap dealPreviewLink" href={dealDetailsUrl(deal)} aria-label={`Ver análisis de ${deal.title}`}>
                    <img src={deal.imageUrl} alt={deal.title} loading="lazy" decoding="async" width={720} height={560} />
                    {meaningfulSaving && <span className="discountBadge">AHORRA {discount}%</span>}
                    <span className="storeBadge"><StoreLogo store={deal.store} /></span>
                    {index === 0 && !filtersActive && <span className="topDealBadge">⭐ DESTACADA</span>}
                  </a>
                  <button className={savedIds.includes(deal.id) ? "saveDealButton active" : "saveDealButton"} type="button" onClick={() => toggleSaved(deal.id)} aria-pressed={savedIds.includes(deal.id)} aria-label={`${savedIds.includes(deal.id) ? "Quitar de guardadas" : "Guardar oferta"}: ${deal.title}`}>{savedIds.includes(deal.id) ? "♥ Guardada" : "♡ Guardar"}</button>
                  <div className="dealBody">
                    <p className="categoryLabel"><b>{offerEditorialLabel({ id: deal.id, price: deal.price, discount })}</b> en {deal.category}</p>
                    <h3 title={deal.title}><a href={dealDetailsUrl(deal)}>{editorialCardTitle({ title: deal.title, store: deal.store, price: deal.price, discount, coupon: deal.coupon })}</a></h3>
                    <div className="priceRow">
                      <span className="priceCurrent"><small>PRECIO AHORA</small><strong>{money.format(deal.price)}</strong></span>
                      {meaningfulSaving && <span className="priceWas"><small>ANTES</small><s>{money.format(deal.oldPrice)}</s></span>}
                      {meaningfulSaving && <span className="saving">AHORRAS <b>{money.format(deal.oldPrice - deal.price)}</b></span>}
                    </div>
                    {deal.coupon ? (
                      <button className="coupon" onClick={() => copyCoupon(deal.coupon!)} aria-label={`Copiar cupón ${deal.coupon}`}>
                        <span>Cupón necesario</span><b>{copied === deal.coupon ? "¡Copiado!" : deal.coupon}</b><i aria-hidden="true">COPIAR</i>
                      </button>
                    ) : <p className="noCoupon"><span aria-hidden="true">✓</span> Precio directo · sin código</p>}
                    <div className="dealActions"><a className="dealButton" href={dealDetailsUrl(deal)} onClick={() => window.gtag?.("event", "offer_card_open", { offer_id: deal.id, store: deal.store, price: deal.price })}>Ver ficha <span aria-hidden="true">↗</span></a>
                    <button className="shareDealButton" type="button" onClick={() => void shareDeal(deal)} aria-label="Compartir oferta">{sharedId === deal.id ? "Copiado ✓" : "Compartir ↗"}</button></div>
                    <p className="verified"><span aria-hidden="true" />{deal.verifiedDate ? <time dateTime={deal.verifiedDate}>{deal.verifiedAt}</time> : deal.verifiedAt} · confirma precio y stock</p>
                  </div>
                </article>
              );
            })}
          </div>
          {gridDeals.length < visibleDeals.length && <div className="loadMoreWrap"><button className="loadMoreButton" onClick={() => setVisibleLimit((current) => current + 18)}>Ver 18 ofertas más <span aria-hidden="true">↓</span></button><p>También puedes filtrar por tienda, categoría o cupón para dar con lo que buscas.</p></div>}
          {!visibleDeals.length && <div className="empty"><b>{savedOnly && savedIds.length === 0 ? "Aún no has guardado ofertas." : "No hemos encontrado ofertas con esos filtros."}</b><span>{savedOnly && savedIds.length === 0 ? "Pulsa «Guardar» en una oferta para verla aquí más tarde, en este navegador." : "Prueba con otra palabra o quita alguno de los filtros."}</span></div>}
        </div>
      </section>

      {featuredPost && <section className="editorialSpotlight shell" aria-labelledby="spotlight-title">
        <div className="editorialSpotlightCopy"><p>EN EL BLOG · {featuredPost.publishedLabel}</p><h2 id="spotlight-title">{featuredPost.title}</h2><span>Una selección de productos con fotos, precios publicados y fichas para consultar antes de comprar.</span><a href={postHref(featuredPost.id)}>Ver selección <b aria-hidden="true">↗</b></a></div>
        <a className="editorialSpotlightArtwork" href={postHref(featuredPost.id)} aria-label={`Leer ${featuredPost.title}`}><img src={featuredPost.imageUrl} alt={featuredPost.title} width="720" height="480" loading="lazy" /></a>
      </section>}

      <section className="storeRail shell" aria-label="Explorar ofertas por tienda">
        <div className="storeRailLead"><span className="liveDot" aria-hidden="true" /><div><b>{summary.total} ofertas recientes</b><small>Explora por tienda</small></div></div>
        <a className="storeQuick storeQuickAmazon" href="/ofertas/amazon"><StoreLogo store="Amazon" /><div><b>Amazon</b><small>{offerCountLabel(storeTotals.Amazon)}</small></div><i aria-hidden="true">→</i></a>
        <a className="storeQuick storeQuickAli" href="/ofertas/aliexpress"><StoreLogo store="AliExpress" /><div><b>AliExpress</b><small>{offerCountLabel(storeTotals.AliExpress)}</small></div><i aria-hidden="true">→</i></a>
        {storeTotals.Miravia > 0 && <a className="storeQuick storeQuickMiravia" href="/ofertas/miravia"><StoreLogo store="Miravia" /><div><b>Miravia</b><small>{offerCountLabel(storeTotals.Miravia)}</small></div><i aria-hidden="true">→</i></a>}
        <a className="storeQuick" href="/ofertas/pccomponentes"><StoreLogo store="PcComponentes" /><div><b>PcComponentes</b><small>{offerCountLabel(storeTotals.PcComponentes)}</small></div><i aria-hidden="true">→</i></a>
      </section>

      {adsenseHomeSlot && <div className="shell adSection"><AdSlot slot={adsenseHomeSlot} /></div>}

      <aside className="gtaGuideTeaser shell" aria-label="Guía destacada de GTA VI">
        <a className="gtaGuideImage" href="/gta-vi-mas-barato-ps5/"><img src="/images/gta-vi-official.jpg" alt="Arte promocional oficial de Grand Theft Auto VI" width="1200" height="630" loading="lazy" /><span>GUÍA GAMING</span></a>
        <div><p>GUÍA DESTACADA · ACTUALIZADA</p><h2><a href="/gta-vi-mas-barato-ps5/">GTA 6: precio, reserva y cómo ahorrar</a></h2><span>Consulta la información y las opciones para PS5 en una guía independiente.</span></div>
        <a className="gtaGuideLink" href="/gta-vi-mas-barato-ps5/">Ver guía <b aria-hidden="true">→</b></a>
      </aside>

      {posts.length > 0 && <section className="editorialPosts shell" id="novedades" aria-labelledby="posts-title">
        <div className="sectionIntro"><div><p className="eyebrow"><span aria-hidden="true" />GUÍAS Y AVISOS</p><h2 id="posts-title">Novedades para ahorrar mejor</h2></div><p>Campañas, noticias y contenidos añadidos directamente por Chollos al Día.</p></div>
        <div className="postGrid">{posts.map((post) => <article className="postCard" key={post.id}>
          <a className="postCardImage" href={postHref(post.id)}><img src={post.imageUrl} alt={post.title} loading="lazy" decoding="async" width={720} height={480} /></a>
          <div><time dateTime={post.publishedAt}>{post.publishedLabel}</time><h3><a href={postHref(post.id)}>{post.title}</a></h3><p>{shortTitle(post.body.replace(/\s+/gu, " "), 150)}</p><a className="postRead" href={postHref(post.id)}>Leer publicación <span aria-hidden="true">→</span></a></div>
        </article>)}</div>
      </section>}

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
          <a className="sectionCover storeAmazon" href="/ofertas/amazon">{sectionCovers.amazon && <img src={sectionCovers.amazon.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><div className="sectionStoreIdentity"><StoreLogo store="Amazon" /><span>Amazon</span></div><b>Ofertas con precio y ahorro visible <i aria-hidden="true">→</i></b></a>
          <a className="sectionCover storeAliExpress" href="/ofertas/aliexpress">{sectionCovers.aliexpress && <img src={sectionCovers.aliexpress.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><div className="sectionStoreIdentity"><StoreLogo store="AliExpress" /><span>AliExpress</span></div><b>Chollos y cupones publicados <i aria-hidden="true">→</i></b></a>
          {sectionCovers.miravia && <a className="sectionCover storeMiravia" href="/ofertas/miravia"><img src={sectionCovers.miravia.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} /><span className="coverShade" aria-hidden="true" /><div className="sectionStoreIdentity"><StoreLogo store="Miravia" /><span>Miravia</span></div><b>Productos seleccionados de Miravia <i aria-hidden="true">→</i></b></a>}
          <a className="sectionCover storeXiaomi" href="/ofertas/xiaomi">{sectionCovers.xiaomi && <img src={sectionCovers.xiaomi.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><div className="sectionStoreIdentity"><StoreLogo store="Xiaomi" /><span>Xiaomi</span></div><b>Tecnología oficial con ahorro real <i aria-hidden="true">→</i></b></a>
          <a className="sectionCover storePcComponentes" href="/ofertas/pccomponentes">{sectionCovers.pccomponentes && <img src={sectionCovers.pccomponentes.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><div className="sectionStoreIdentity"><StoreLogo store="PcComponentes" /><span>PcComponentes</span></div><b>Informática, gaming y electrónica <i aria-hidden="true">→</i></b></a>
          <a className="sectionCover storeElCorteIngles" href="/ofertas/el-corte-ingles">{sectionCovers.elCorteIngles && <img src={sectionCovers.elCorteIngles.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><div className="sectionStoreIdentity"><StoreLogo store="El Corte Inglés" /><span>El Corte Inglés</span></div><b>Selección de descuentos destacados <i aria-hidden="true">→</i></b></a>
          <a className="sectionCover storeMediaMarkt" href="/ofertas/mediamarkt">{sectionCovers.mediamarkt && <img src={sectionCovers.mediamarkt.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><div className="sectionStoreIdentity"><StoreLogo store="MediaMarkt" /><span>MediaMarkt</span></div><b>Electrónica y electrodomésticos en oferta <i aria-hidden="true">→</i></b></a>
        </div>
      </section>

      <section className="categoryDirectory shell" aria-labelledby="categories-title">
        <div><p className="eyebrow"><span aria-hidden="true" />CHOLLOS POR CATEGORIA</p><h2 id="categories-title">Ve directo a lo que buscas.</h2></div>
        <div className="categoryDirectoryGrid">
          <a className="sectionCover categoryTech" href="/chollos/tecnologia/">{sectionCovers.tecnologia && <img src={sectionCovers.tecnologia.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><span>Tecnología</span><b>Chollos de electrónica e informática <i aria-hidden="true">→</i></b></a>
          <a className="sectionCover categoryGaming" href="/chollos/videojuegos/">{sectionCovers.videojuegos && <img src={sectionCovers.videojuegos.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><span>Gaming</span><b>Videojuegos, consolas y accesorios <i aria-hidden="true">→</i></b></a>
          <a className="sectionCover categoryHome" href="/chollos/hogar/">{sectionCovers.hogar && <img src={sectionCovers.hogar.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><span>Hogar</span><b>Chollos para casa y cocina <i aria-hidden="true">→</i></b></a>
        </div>
        <nav className="seoCategoryLinks" aria-label="Todas las categorías de chollos">
          <a href="/chollos/tecnologia/">Chollos de tecnología</a><a href="/chollos/informatica/">Ofertas de informática</a><a href="/chollos/telefonia/">Chollos de telefonía</a><a href="/chollos/videojuegos/">Ofertas gaming</a><a href="/chollos/electrodomesticos/">Electrodomésticos baratos</a><a href="/chollos/hogar/">Chollos para el hogar</a><a href="/chollos/cocina/">Ofertas de cocina</a><a href="/chollos/bricolaje/">Chollos de bricolaje</a><a href="/chollos/juguetes/">Ofertas de juguetes</a><a href="/chollos/moda/">Chollos de moda</a><a href="/chollos/deporte/">Ofertas de deporte</a><a href="/chollos/belleza/">Chollos de belleza</a>
        </nav>
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
          <div><p>Entra gratis al canal para recibir chollos de las principales tiendas directamente en Telegram.</p><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Recibir alertas gratis <span aria-hidden="true">↗</span></a><small>No necesitas dejar tu correo ni crear otra cuenta.</small></div>
        </div>
      </section>

      <section className="faq shell" aria-labelledby="faq-title">
        <p className="eyebrow"><span aria-hidden="true" />TRANSPARENCIA ANTE TODO</p>
        <h2 id="faq-title">Preguntas frecuentes</h2>
        <details><summary>¿Dónde encontrar ofertas y chollos de hoy?<span aria-hidden="true">+</span></summary><p>Reunimos ofertas recientes con producto identificable, precio publicado y enlace directo. Puedes filtrar por tienda, categoría, descuento o cupón y recibir alertas gratuitas en Telegram. Confirma el precio y el stock en la tienda antes de pagar.</p></details>
        <details><summary>¿Cómo seleccionáis las ofertas?<span aria-hidden="true">+</span></summary><p>Priorizamos descuentos visibles, precios comparados, productos con actividad y enlaces de compra que se puedan comprobar.</p></details>
        <details><summary>¿El precio final puede cambiar?<span aria-hidden="true">+</span></summary><p>Sí. Las tiendas pueden modificar el precio, el stock o las condiciones sin previo aviso. Mostramos el dato disponible cuando se publica la oferta.</p></details>
        <details><summary>¿Comprar desde estos enlaces cuesta más?<span aria-hidden="true">+</span></summary><p>No. Algunos enlaces son de afiliación y pueden generar una comisión para Chollos al Día, sin aumentar el precio para ti.</p></details>
      </section>

      <footer>
        <div className="shell footerGrid">
          <div className="footerBrand"><a className="brand" href="#inicio"><span className="brandMark" aria-hidden="true">€</span><span>Chollos <span>al</span>Día</span></a><p>Ofertas verificadas para comprar mejor cada día.</p></div>
          <div><strong>Explora</strong><a href="#ofertas">Ofertas de hoy</a><a href="/buscar/">Buscar productos</a><a href="/blog/">Blog de chollos</a><a href="/guias/detectar-chollos-reales/">Guias para ahorrar</a><a href="/guias/chollos-electronica/">Guía de electrónica</a><a href="/guias/ofertas-cocina/">Guía de cocina</a><a href="/telegram/">Canal de chollos en Telegram</a></div>
          <div><strong>Información</strong><a href="/contacto">Contacto</a><a href="/como-verificamos-ofertas">Cómo verificamos las ofertas</a><a href="mailto:chollosaldia@gmail.com">chollosaldia@gmail.com</a><a href="/aviso-legal">Aviso legal</a><a href="/terminos">Términos de uso</a><a href="/privacidad">Privacidad</a><a href="/afiliacion">Política de afiliación</a></div>
        </div>
        <div className="shell footnote"><span>© {new Date().getFullYear()} Chollos al Día</span><p>Como afiliado, Chollos al Día puede recibir una comisión por compras que cumplen los requisitos. El precio para ti no cambia.</p></div>
      </footer>
      <a className="telegramDock" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer" aria-label="Recibir alertas de ofertas en Telegram"><span aria-hidden="true">✦</span> Alertas de chollos <b>Gratis ↗</b></a>
    </main>
  );
}
