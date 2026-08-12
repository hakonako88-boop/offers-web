import type { Metadata } from "next";
import Link from "next/link";
import "../legal.css";

const title = "Cómo verificamos las ofertas";
const description = "Conoce el método de Chollos al Día para seleccionar ofertas de Amazon, AliExpress y Miravia antes de publicarlas.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/como-verificamos-ofertas" },
  openGraph: { title: `${title} | Chollos al Día`, description, url: "/como-verificamos-ofertas" },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  inLanguage: "es-ES",
  mainEntityOfPage: "https://chollosaldia.com/como-verificamos-ofertas",
  author: { "@type": "Organization", name: "Chollos al Día", url: "https://chollosaldia.com" },
  publisher: { "@type": "Organization", name: "Chollos al Día" },
  datePublished: "2026-08-12",
  dateModified: "2026-08-12",
};

export default function VerificationMethodPage() {
  return (
    <main className="legalPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <header className="legalHead shell">
        <Link className="brand" href="/" aria-label="Chollos al Día, inicio"><span className="brandMark" aria-hidden="true">€</span><span>Chollos <span>al</span>Día</span></Link>
      </header>
      <article className="legalBody shell">
        <p className="eyebrow"><span aria-hidden="true" />NUESTRO MÉTODO</p>
        <h1>Cómo verificamos las ofertas</h1>
        <p>Chollos al Día no pretende mostrar miles de enlaces. Priorizamos oportunidades que se puedan entender de un vistazo: producto identificable, precio claro, ahorro comprobable y enlace directo a la tienda.</p>

        <h2>1. Comprobamos que el producto y el enlace tengan sentido</h2>
        <p>Antes de publicar, revisamos que el enlace lleve al producto correcto y que el título, la imagen y la tienda permitan saber qué se está comprando. Las publicaciones incompletas, duplicadas o confusas no entran en la selección.</p>

        <h2>2. Publicamos el precio final disponible</h2>
        <p>Indicamos el precio visto al preparar la oferta y, cuando existe, el precio anterior, el porcentaje de descuento o el cupón. Si hay una condición especial, como aplicar un código o seleccionar una variante, se explica en la ficha.</p>

        <h2>3. Filtramos el ruido</h2>
        <p>Priorizamos productos reconocibles y descuentos que aportan una ventaja clara. Evitamos repetir la misma oferta y descartamos publicaciones automáticas que no tienen suficiente información para ayudarte a decidir.</p>

        <h2>4. Cada oferta tiene su propia ficha</h2>
        <p>Al abrir una oferta verás el precio de publicación, el ahorro calculado, una explicación breve, puntos a favor y aspectos a tener en cuenta. Así puedes valorar el chollo antes de salir a Amazon, AliExpress o Miravia.</p>

        <div className="notice"><strong>Importante:</strong> el stock, el precio, los cupones y las condiciones los decide cada tienda y pueden cambiar o agotarse. Comprueba siempre el importe final en la página de compra antes de pagar.</div>

        <h2>¿Cómo puedes ayudar?</h2>
        <p>Si ves que una oferta ha cambiado, se ha agotado o tiene un dato mejorable, puedes avisarnos. Las correcciones ayudan a que el radar sea más útil para todos.</p>
        <p><a className="primaryButton" href="mailto:chollosaldia@gmail.com?subject=Aviso%20sobre%20una%20oferta">Avisar de un cambio <span aria-hidden="true">→</span></a></p>
        <p><Link href="/">← Ver las ofertas activas</Link></p>
      </article>
    </main>
  );
}
