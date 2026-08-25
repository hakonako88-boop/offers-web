"use client";

import { useEffect, useMemo, useState } from "react";

type SearchOffer = { id: string; title: string; store: string; category: string; price: number; imageUrl: string; href: string };
type SearchProduct = { name: string; category: string; price?: number; store?: string; imageUrl: string; href: string };
type SearchGuide = { title: string; description: string; href: string };

function normalise(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("es-ES"); }

export default function GlobalSearch({ offers, products, guides }: { offers: SearchOffer[]; products: SearchProduct[]; guides: SearchGuide[] }) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q") || "";
    if (initial) queueMicrotask(() => setQuery(initial));
  }, []);
  const needle = normalise(query.trim());
  const result = useMemo(() => ({
    offers: needle ? offers.filter((item) => normalise(`${item.title} ${item.store} ${item.category}`).includes(needle)).slice(0, 12) : [],
    products: needle ? products.filter((item) => normalise(`${item.name} ${item.store || ""} ${item.category}`).includes(needle)).slice(0, 12) : [],
    guides: needle ? guides.filter((item) => normalise(`${item.title} ${item.description}`).includes(needle)).slice(0, 8) : [],
  }), [needle, offers, products, guides]);
  const total = result.offers.length + result.products.length + result.guides.length;
  function submit(event: React.FormEvent) { event.preventDefault(); const url = new URL(window.location.href); if (query.trim()) url.searchParams.set("q", query.trim()); else url.searchParams.delete("q"); history.replaceState({}, "", url); window.gtag?.("event", "search", { search_term: query.trim() }); setQuery(query.trim()); }
  return <><form className="globalSearchForm" onSubmit={submit}><label htmlFor="site-search">Buscar producto, marca, categoría, tienda o guía</label><div><input id="site-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ejemplo: PS5, auriculares, cafetera…" /><button>Buscar</button></div></form>
    {!needle ? <div className="searchEmpty"><b>¿Qué quieres encontrar?</b><p>Busca ofertas activas, páginas de producto y guías de compra desde un solo lugar.</p></div> : <><p className="searchCount">{total ? `${total} resultados visibles para “${query}”` : `No encontramos resultados para “${query}”`}</p>
      {result.offers.length > 0 && <section className="searchSection"><h2>Ofertas</h2><div className="searchGrid">{result.offers.map((item) => <a href={item.href} key={item.id}><img src={item.imageUrl} alt="" width={180} height={140} /><div><span>{item.store} · {item.category}</span><b>{item.title}</b><strong>{item.price.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong></div></a>)}</div></section>}
      {result.products.length > 0 && <section className="searchSection"><h2>Productos</h2><div className="searchGrid">{result.products.map((item) => <a href={item.href} key={item.href}><img src={item.imageUrl} alt="" width={180} height={140} /><div><span>{item.category}</span><b>{item.name}</b><strong>{item.price ? `Desde ${item.price.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}${item.store ? ` · ${item.store}` : ""}` : "Sin oferta activa"}</strong></div></a>)}</div></section>}
      {result.guides.length > 0 && <section className="searchSection"><h2>Guías</h2><div className="searchGuides">{result.guides.map((item) => <a href={item.href} key={item.href}><span>GUÍA DE COMPRA</span><b>{item.title}</b><p>{item.description}</p></a>)}</div></section>}
    </>}
  </>;
}
