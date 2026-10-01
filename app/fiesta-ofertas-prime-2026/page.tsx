import type { Metadata } from "next";
import { dealDiscount, dealHref, dealSavings, publishedDeals } from "../lib/deals";

const pageTitle = "Prime Day octubre 2026: Fiesta de Ofertas Prime Amazon";
const pageDescription = "Prime Day de otoño en Amazon España: la Fiesta de Ofertas Prime es el 6 y 7 de octubre de 2026. Sigue ofertas recientes, precios, cupones y consejos para revisar cada compra.";
const eventUrl = "https://chollosaldia.com/fiesta-ofertas-prime-2026/";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/fiesta-ofertas-prime-2026/" },
  openGraph: {
    type: "website",
    locale: "es_ES",
    title: `${pageTitle} | Chollos al Día`,
    description: pageDescription,
    url: eventUrl,
    images: [{ url: "/og-chollosaldia-v2.png", width: 1731, height: 909, alt: "Chollos al Día: seguimiento de la Fiesta de Ofertas Prime" }],
  },
  twitter: { card: "summary_large_image", title: pageTitle, description: pageDescription, images: ["/og-chollosaldia-v2.png"] },
};

const amazonOffers = publishedDeals
  .filter((deal) => deal.store === "Amazon" && (deal.price < deal.oldPrice || deal.coupon))
  .map((deal) => ({ deal, discount: dealDiscount(deal), savings: dealSavings(deal) }))
  .filter(({ discount, savings, deal }) => discount >= 10 || savings >= 5 || Boolean(deal.coupon))
  .sort((left, right) => Number(Boolean(right.deal.coupon)) - Number(Boolean(left.deal.coupon))
    || right.discount - left.discount || right.savings - left.savings
    || Date.parse(right.deal.verifiedDate || "") - Date.parse(left.deal.verifiedDate || ""))
  .slice(0, 8);

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const campaignSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${eventUrl}#campaign`,
  name: pageTitle,
  description: pageDescription,
  inLanguage: "es-ES",
  dateModified: new Date().toISOString(),
  isPartOf: { "@id": "https://chollosaldia.com/#website" },
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: amazonOffers.length,
    itemListElement: amazonOffers.map(({ deal }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://chollosaldia.com${dealHref(deal.id)}`,
      name: deal.title,
    })),
  },
};

export default function FiestaOfertasPrime2026Page() {
  return (
    <main className="primePage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(campaignSchema) }} />
      <div className="announcement" role="status">
        <div className="shell announcementInner">
          <a href="/" aria-label="Volver a Chollos al Día">← Chollos al Día</a>
          <a href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Avisos de ofertas en Telegram <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <article className="shell primeArticle">
        <nav className="primeBreadcrumb" aria-label="Migas de pan">
          <a href="/">Inicio</a><span aria-hidden="true">/</span><a href="/ofertas/amazon/">Ofertas Amazon</a><span aria-hidden="true">/</span><b>Fiesta de Ofertas Prime 2026</b>
        </nav>

        <header className="primeHero">
          <div className="primeHeroGlow" aria-hidden="true" />
          <p className="primeEyebrow"><span aria-hidden="true" />AMAZON ESPAÑA · FECHAS OFICIALES</p>
          <h1>Fiesta de Ofertas Prime <em>2026</em></h1>
          <p className="primeDates">6 y 7 de octubre · 48 horas</p>
          <p className="primeHeroLead">Estamos preparando una selección de Amazon con precios, cupones y condiciones claros. Consulta las ofertas recientes aquí y vuelve durante el evento: añadiremos oportunidades cuando sus datos estén comprobados.</p>
          <div className="primeHeroActions">
            <a className="primePrimary" href="#ofertas-prime">Ver ofertas Amazon <span aria-hidden="true">↓</span></a>
            <a className="primeSecondary" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Recibir avisos en Telegram <span aria-hidden="true">↗</span></a>
            <a className="primeSecondary" href="https://www.amazon.es/fiestaprime?tag=chollos00a-21" target="_blank" rel="sponsored nofollow noreferrer">Explorar el evento en Amazon <span aria-hidden="true">↗</span></a>
          </div>
          <p className="primeMemberNote">Las ofertas exclusivas del evento requieren Prime. Comprobaremos las condiciones de cada producto antes de destacarlo.</p>
          <span className="primeOrb primeOrbOne" aria-hidden="true">€</span><span className="primeOrb primeOrbTwo" aria-hidden="true">✦</span>
        </header>

        <section className="primeFacts" aria-label="Datos del evento">
          <div><span>CUÁNDO</span><b>6–7 oct.</b><small>48 horas en España</small></div>
          <div><span>DÓNDE</span><b>Amazon.es</b><small>Ofertas del evento para Prime</small></div>
          <div><span>EN ESTA PÁGINA</span><b>{amazonOffers.length} {amazonOffers.length === 1 ? "oferta" : "ofertas"}</b><small>Ofertas recientes de Amazon</small></div>
        </section>

        <section className="primeDeals" id="ofertas-prime" aria-labelledby="prime-deals-title">
          <div className="primeSectionIntro">
            <div><p className="primeSectionKicker">SELECCIÓN ACTUALIZADA</p><h2 id="prime-deals-title">Ofertas recientes de Amazon para revisar</h2></div>
            <p>Son ofertas publicadas recientemente, no necesariamente promociones oficiales del evento. El precio y las condiciones pueden cambiar; revisa siempre la ficha y el carrito de Amazon.</p>
          </div>
          {amazonOffers.length ? <div className="primeDealGrid">
            {amazonOffers.map(({ deal, discount, savings }) => (
              <article className="primeDealCard" key={deal.id}>
                <a className="primeDealImage" href={dealHref(deal.id)} aria-label={`Ver oferta de ${deal.title}`}>
                  <img src={deal.imageUrl} alt={deal.title} loading="lazy" decoding="async" width={720} height={560} />
                  {discount > 0 && <span>−{discount}%</span>}
                </a>
                <div className="primeDealBody">
                  <p className="primeDealCategory">Amazon · {deal.category}</p>
                  <h3><a href={dealHref(deal.id)}>{deal.title}</a></h3>
                  <div className="primeDealPrice"><strong>{money.format(deal.price)}</strong>{deal.oldPrice > deal.price && <del>{money.format(deal.oldPrice)}</del>}</div>
                  {savings > 0 && <p className="primeDealSaving">Ahorro indicado: {money.format(savings)}</p>}
                  {deal.coupon && <p className="primeDealCoupon">Cupón: <b>{deal.coupon}</b></p>}
                  <a className="primeDealButton" href={dealHref(deal.id)}>Ver precio y condiciones <span aria-hidden="true">→</span></a>
                  <small>Revisada {deal.verifiedAt.toLocaleLowerCase("es-ES")}</small>
                </div>
              </article>
            ))}
          </div> : <div className="primeEmpty"><b>Estamos preparando la selección.</b><p>En cuanto tengamos ofertas Amazon completas y verificables, aparecerán aquí.</p></div>}
        </section>

        <section className="primeGuide" aria-labelledby="prime-guide-title">
          <div><p className="primeSectionKicker">ANTES DE COMPRAR</p><h2 id="prime-guide-title">Cómo encontrar un descuento que sí compense</h2></div>
          <ol>
            <li><b>Comprueba el modelo exacto.</b> Capacidad, color, tamaño y pack pueden cambiar el precio.</li>
            <li><b>Mira el precio final.</b> Activa el cupón si aparece y revisa el importe del carrito antes de pagar.</li>
            <li><b>Verifica si necesita Prime.</b> Algunas ofertas del evento son exclusivas para miembros; Amazon muestra esa condición en cada producto.</li>
            <li><b>Compara el ahorro.</b> Un porcentaje grande no basta: revisa el precio anterior y las condiciones de la oferta.</li>
          </ol>
        </section>

        <section className="primeFaq" aria-labelledby="prime-faq-title">
          <p className="primeSectionKicker">PREGUNTAS FRECUENTES</p><h2 id="prime-faq-title">Fiesta de Ofertas Prime 2026</h2>
          <details><summary>¿Qué días es la Fiesta de Ofertas Prime en España?<span aria-hidden="true">+</span></summary><p>Amazon España ha anunciado dos días de ofertas, el 6 y el 7 de octubre de 2026. Consulta la hora de inicio y las condiciones en Amazon antes de comprar.</p></details>
          <details><summary>¿Todas las ofertas de esta página son exclusivas para Prime?<span aria-hidden="true">+</span></summary><p>No. La selección mezcla ofertas Amazon activas con la información oficial del evento. Una oferta solo se marcará como exclusiva para Prime cuando esa condición esté confirmada en la ficha del producto.</p></details>
          <details><summary>¿Los precios y cupones pueden cambiar?<span aria-hidden="true">+</span></summary><p>Sí. Amazon puede cambiar el precio, el stock y los cupones. El importe final válido es el que aparezca en Amazon al tramitar el pedido.</p></details>
        </section>

        <aside className="primeSource">
          <p>Fechas del evento contrastadas con el anuncio de Amazon España, publicado el 15 de septiembre de 2026.</p>
          <a href="https://www.aboutamazon.es/noticias/noticias-de-la-compania/fiesta-ofertas-prime-6-7-octubre-ofertas-exclusivas" target="_blank" rel="noreferrer">Consultar el anuncio oficial <span aria-hidden="true">↗</span></a>
        </aside>
      </article>
      <footer className="primeFooter"><div className="shell"><a href="/">Chollos al Día</a><span>Algunos enlaces pueden ser de afiliación y generar una comisión sin coste adicional para ti.</span></div></footer>
    </main>
  );
}
