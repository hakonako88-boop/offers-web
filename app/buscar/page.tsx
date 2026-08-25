import type { Metadata } from "next";
import Link from "next/link";
import GlobalSearch from "../components/GlobalSearch";
import { dealHref, publishedDeals } from "../lib/deals";
import { guides } from "../lib/guides";
import { productHref, publishedProducts } from "../lib/products";

export const metadata: Metadata = { title: "Buscar ofertas, productos y guías", description: "Busca chollos, productos, tiendas, categorías y guías de compra en Chollos al Día.", alternates: { canonical: "/buscar/" }, robots: { index: false, follow: true } };

export default function SearchPage() {
  const offers = publishedDeals.map((deal) => ({ id: deal.id, title: deal.title, store: deal.store, category: deal.category, price: deal.price, imageUrl: deal.imageUrl, href: dealHref(deal.id) }));
  const products = publishedProducts.map((product) => ({ name: product.name, category: product.category, price: product.bestOffer?.price, store: product.bestOffer?.store, imageUrl: product.imageUrl, href: productHref(product) }));
  const guideItems = Object.entries(guides).map(([slug, guide]) => ({ title: guide.title, description: guide.description, href: `/guias/${slug}/` }));
  return <main className="searchPage"><header className="productHeader"><Link className="brand" href="/"><span className="brandMark">€</span><span>Chollos <span>al</span>Día</span></Link><Link href="/#ofertas">Ofertas de hoy</Link></header><article className="searchShell"><p className="eyebrow"><span />BÚSQUEDA GLOBAL</p><h1>Encuentra la oferta, el producto o la guía que necesitas.</h1><p className="searchLead">Los resultados se separan para que puedas distinguir un precio puntual, una página de producto y un consejo editorial.</p><GlobalSearch offers={offers} products={products} guides={guideItems} /></article></main>;
}
