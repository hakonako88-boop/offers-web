import type { Metadata } from "next";
import Link from "next/link";
import "../legal.css";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Contacta con Chollos al Día para proponer una oferta o seguir las alertas de chollos.",
  alternates: { canonical: "/contacto" },
};

export default function ContactPage() {
  return (
    <main className="legalPage">
      <header className="legalHead shell">
        <Link className="brand" href="/" aria-label="Chollos al Día, inicio"><span className="brandMark" aria-hidden="true">€</span><span>Chollos <span>al</span>Día</span></Link>
      </header>
      <article className="legalBody shell">
        <p className="eyebrow"><span aria-hidden="true" />CONTACTO</p>
        <h1>¿Has visto un chollo?</h1>
        <p>La vía más rápida para seguir las alertas y contactar con Chollos al Día es nuestro canal de Telegram.</p>
        <div className="notice"><strong>Ofertas y avisos:</strong> entra en el canal para recibir las publicaciones nuevas y comprobar sus condiciones antes de comprar.</div>
        <p><a className="primaryButton" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Abrir canal de Telegram <span aria-hidden="true">↗</span></a></p>
        <h2>Antes de compartir una oferta</h2>
        <p>Incluye el enlace directo del producto, el precio final y, si existe, el cupón o el precio anterior. Así podremos comprobarla y evitar publicaciones repetidas o incompletas.</p>
        <p><Link href="/">← Volver a las ofertas activas</Link></p>
      </article>
    </main>
  );
}
