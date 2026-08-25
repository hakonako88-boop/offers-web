"use client";

/* The site is statically exported to GitHub Pages, so native links and the
 * already-optimized merchant images are intentional in this client view. */
/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */

import { useMemo, useState } from "react";
import AdSlot from "./AdSlot";
import { adsenseHomeSlot } from "../lib/adsense";
import { postHref } from "../lib/posts";
import type { PublishedPost } from "../lib/posts";

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
  const [deals] = useState<Deal[]>(initialDeals);
  const [visibleLimit, setVisibleLimit] = useState(36);
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
      && (!Number.isFinite(maximumAge) || Boolean(deal.verifiedDate && newestTimestamp - Date.parse(deal.verifiedDate) <= maximumAge))
    ));
    return filtered.sort((left, right) => {
      if (sortBy === "discount") return ((1 - right.price / right.oldPrice) || 0) - ((1 - left.price / left.oldPrice) || 0);
      if (sortBy === "saving") return (right.oldPrice - right.price) - (left.oldPrice - left.price);
      if (sortBy === "price") return left.price - right.price;
      return Date.parse(right.verifiedDate || "") - Date.parse(left.verifiedDate || "");
    });
  }, [deals, category, store, query, minimumPrice, maximumPrice, minimumDiscount, dateRange, couponOnly, sortBy]);

  const filtersActive = category !== "Todos" || store !== "Todas" || query.trim() !== "" || minimumPrice !== "" || maximumPrice !== "" || minimumDiscount > 0 || dateRange !== "all" || couponOnly || sortBy !== "recent";

  function clearFilters() {
    setCategory("Todos"); setStore("Todas"); setQuery(""); setMinimumPrice(""); setMaximumPrice("");
    setMinimumDiscount(0); setDateRange("all"); setCouponOnly(false); setSortBy("recent");
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
            {posts.length > 0 && <a href="#novedades">Novedades</a>}
            <a href="#como-funciona">Cómo seleccionamos</a>
            <a className="telegramLink" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Telegram <span aria-hidden="true">↗</span></a>
          </nav>
        </div>
      </header>

      <section className="hero shell" aria-labelledby="hero-title">
        <div className="heroCopy">
          <p className="eyebrow"><span aria-hidden="true" />CHOLLOS DIARIOS · OFERTAS NUEVAS DURANTE TODO EL DÍA</p>
          <h1 id="hero-title">Chollos de hoy.<br /><em>Ofertas del día que merecen la pena.</em></h1>
          <p className="heroLead">Consulta ofertas diarias seleccionadas de Amazon, AliExpress, Miravia, Xiaomi, PcComponentes, MediaMarkt y El Corte Inglés, con precio visible, descuento claro y enlace directo.</p>
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
        <aside className="featuredPanel gtaPinned" aria-label="Guía destacada de GTA VI">
          <a className="featuredImage" href="/gta-vi-mas-barato-ps5/"><img src="/images/gta-vi-official.jpg" alt="Arte promocional oficial de Grand Theft Auto VI" width={1200} height={630} /><span>GUÍA DESTACADA</span></a>
          <div className="featuredBody"><p className="featuredMeta"><span className="liveDot" /> CONTENIDO FIJADO · GAMING</p><h2><a href="/gta-vi-mas-barato-ps5/">GTA VI: 79,99 € en España frente a unos 54 €</a></h2><p className="gtaPinnedLead">Comparamos precios regionales, cambio de moneda, compatibilidad de códigos y requisitos de la cuenta antes de reservar.</p><a href="/gta-vi-mas-barato-ps5/">Leer la guía completa <span aria-hidden="true">→</span></a><p className="featuredFoot">Imagen promocional oficial © Rockstar Games · Información revisada el 25 de agosto de 2026.</p></div>
        </aside>
      </section>

      <section className="storeRail shell" aria-label="Explorar ofertas por tienda">
        <div className="storeRailLead"><span className="liveDot" aria-hidden="true" /><div><b>{summary.total} ofertas activas</b><small>Actualizadas durante el día</small></div></div>
        <a className="storeQuick storeQuickAmazon" href="/ofertas/amazon"><span>a</span><div><b>Amazon</b><small>{offerCountLabel(storeTotals.Amazon)}</small></div><i aria-hidden="true">→</i></a>
        <a className="storeQuick storeQuickAli" href="/ofertas/aliexpress"><span>AE</span><div><b>AliExpress</b><small>{offerCountLabel(storeTotals.AliExpress)}</small></div><i aria-hidden="true">→</i></a>
        <a className="storeQuick storeQuickMiravia" href="/ofertas/miravia"><span>M</span><div><b>Miravia</b><small>{offerCountLabel(storeTotals.Miravia)}</small></div><i aria-hidden="true">→</i></a>
        <a className="storeQuick" href="/ofertas/pccomponentes"><span>PC</span><div><b>PcComponentes</b><small>{offerCountLabel(storeTotals.PcComponentes)}</small></div><i aria-hidden="true">→</i></a>
      </section>

      {adsenseHomeSlot && <div className="shell adSection">
        <AdSlot slot={adsenseHomeSlot} />
      </div>}

      {posts.length > 0 && <section className="editorialPosts shell" id="novedades" aria-labelledby="posts-title">
        <div className="sectionIntro"><div><p className="eyebrow"><span aria-hidden="true" />PUBLICADO DESDE TELEGRAM</p><h2 id="posts-title">Novedades y avisos</h2></div><p>Campañas, noticias y contenidos añadidos directamente por Chollos al Día.</p></div>
        <div className="postGrid">{posts.map((post) => <article className="postCard" key={post.id}>
          <a className="postCardImage" href={postHref(post.id)}><img src={post.imageUrl} alt={post.title} loading="lazy" decoding="async" width={720} height={480} /></a>
          <div><time dateTime={post.publishedAt}>{post.publishedLabel}</time><h3><a href={postHref(post.id)}>{post.title}</a></h3><p>{shortTitle(post.body.replace(/\s+/gu, " "), 150)}</p><a className="postRead" href={postHref(post.id)}>Leer publicación <span aria-hidden="true">→</span></a></div>
        </article>)}</div>
      </section>}

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
            <label className="search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto, marca, categoría o tienda" aria-label="Buscar ofertas" /></label>
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

          <p className="resultsSummary" aria-live="polite"><b>{summary.total}</b> ofertas activas · <b>{visibleDeals.length}</b> {visibleDeals.length === 1 ? "coincide" : "coinciden"} con tus filtros · mostrando {Math.min(gridDeals.length, visibleDeals.length)}</p>
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
          {gridDeals.length < visibleDeals.length && <div className="loadMoreWrap"><button className="loadMoreButton" onClick={() => setVisibleLimit((current) => current + 36)}>Ver 36 ofertas más</button><p>También puedes entrar en una tienda o categoría para encontrar antes lo que buscas.</p></div>}
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
          <a className="sectionCover storeXiaomi" href="/ofertas/xiaomi">{sectionCovers.xiaomi && <img src={sectionCovers.xiaomi.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><span>Xiaomi</span><b>Tecnología oficial con ahorro real <i aria-hidden="true">→</i></b></a>
          <a className="sectionCover storePcComponentes" href="/ofertas/pccomponentes">{sectionCovers.pccomponentes && <img src={sectionCovers.pccomponentes.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><span>PcComponentes</span><b>Informática, gaming y electrónica <i aria-hidden="true">→</i></b></a>
          <a className="sectionCover storeElCorteIngles" href="/ofertas/el-corte-ingles">{sectionCovers.elCorteIngles && <img src={sectionCovers.elCorteIngles.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><span>El Corte Inglés</span><b>Selección de descuentos destacados <i aria-hidden="true">→</i></b></a>
          <a className="sectionCover storeMediaMarkt" href="/ofertas/mediamarkt">{sectionCovers.mediamarkt && <img src={sectionCovers.mediamarkt.imageUrl} alt="" loading="lazy" decoding="async" width={960} height={560} />}<span className="coverShade" aria-hidden="true" /><span>MediaMarkt</span><b>Electrónica y electrodomésticos en oferta <i aria-hidden="true">→</i></b></a>
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
        <details><summary>¿Cómo seleccionáis las ofertas?<span aria-hidden="true">+</span></summary><p>Priorizamos descuentos visibles, precios comparados, productos con actividad y enlaces de compra que se puedan comprobar.</p></details>
        <details><summary>¿El precio final puede cambiar?<span aria-hidden="true">+</span></summary><p>Sí. Las tiendas pueden modificar el precio, el stock o las condiciones sin previo aviso. Mostramos el dato disponible cuando se publica la oferta.</p></details>
        <details><summary>¿Comprar desde estos enlaces cuesta más?<span aria-hidden="true">+</span></summary><p>No. Algunos enlaces son de afiliación y pueden generar una comisión para Chollos al Día, sin aumentar el precio para ti.</p></details>
      </section>

      <footer>
        <div className="shell footerGrid">
          <div className="footerBrand"><a className="brand" href="#inicio"><span className="brandMark" aria-hidden="true">€</span><span>Chollos <span>al</span>Día</span></a><p>Ofertas verificadas para comprar mejor cada día.</p></div>
          <div><strong>Explora</strong><a href="#ofertas">Ofertas de hoy</a><a href="/blog/">Blog de chollos</a><a href="/guias/detectar-chollos-reales/">Guias para ahorrar</a><a href="/guias/chollos-electronica/">Guía de electrónica</a><a href="/guias/ofertas-cocina/">Guía de cocina</a><a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Canal de Telegram</a></div>
          <div><strong>Información</strong><a href="/contacto">Contacto</a><a href="/como-verificamos-ofertas">Cómo verificamos las ofertas</a><a href="mailto:chollosaldia@gmail.com">chollosaldia@gmail.com</a><a href="/aviso-legal">Aviso legal</a><a href="/privacidad">Privacidad</a><a href="/afiliacion">Política de afiliación</a></div>
        </div>
        <div className="shell footnote"><span>© {new Date().getFullYear()} Chollos al Día</span><p>Como afiliado, Chollos al Día puede recibir una comisión por compras que cumplen los requisitos. El precio para ti no cambia.</p></div>
      </footer>
      <a className="telegramDock" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer" aria-label="Recibir alertas de ofertas en Telegram"><span aria-hidden="true">✦</span> Alertas de chollos <b>Gratis ↗</b></a>
    </main>
  );
}
