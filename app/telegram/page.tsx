import type { Metadata } from "next";
import Link from "next/link";

const joinUrl = "https://t.me/aldiachollos";
const title = "Canal de Telegram de chollos y ofertas";
const description = "Únete gratis al canal de Telegram de Chollos al Día y recibe ofertas seleccionadas de Amazon, AliExpress, Miravia, PcComponentes, MediaMarkt y más tiendas.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/telegram/" },
  openGraph: { title: `${title} | Chollos al Día`, description, url: "/telegram/", images: [{ url: "/og-chollosaldia-v2.png", width: 1731, height: 909, alt: "Canal de Telegram Chollos al Día" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og-chollosaldia-v2.png"] },
};

const faq = [
  ["¿Cuesta algo unirse?", "No. El canal es gratuito y puedes silenciarlo o salir cuando quieras."],
  ["¿Qué ofertas se publican?", "Chollos seleccionados de Amazon, AliExpress, Miravia, PcComponentes, MediaMarkt, Xiaomi y El Corte Inglés, cuando hay datos suficientes."],
  ["¿Se publican precios y cupones?", "Sí. Mostramos el precio disponible, el descuento y el cupón cuando se ha podido comprobar o aparece expresamente en la promoción."],
  ["¿Cuántos mensajes recibiré?", "Publicamos durante el día cuando aparece una oferta que supera los filtros. Evitamos repetir el mismo producto y descartamos artículos poco interesantes."],
];

const schema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
};

export default function TelegramPage() {
  return <main className="telegramLanding">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <header className="siteHeader"><div className="shell headerInner"><Link className="brand" href="/"><span className="brandMark">€</span><span>Chollos <span>al</span>Día</span></Link><nav><Link href="/">Ofertas de hoy</Link><a className="telegramLink" href={joinUrl} target="_blank" rel="noreferrer">Abrir Telegram ↗</a></nav></div></header>
    <section className="telegramLandingHero shell">
      <div><p className="eyebrow"><span />CANAL GRATUITO DE OFERTAS</p><h1>Los mejores chollos,<br /><em>directamente en Telegram.</em></h1><p>Recibe alertas claras con foto, precio, descuento, cupón cuando exista y acceso directo a la tienda. Sin tener que revisar siete webs distintas.</p><a className="primaryButton" href={joinUrl} target="_blank" rel="noreferrer">Unirme gratis a @aldiachollos <span>→</span></a><small>Telegram te mostrará una vista previa del canal antes de unirte.</small></div>
      <aside className="telegramPreview"><div className="telegramPreviewHead"><span>€</span><div><b>Chollos al Día</b><small>@aldiachollos</small></div></div><div className="telegramSample"><strong>🔥 Oferta seleccionada</strong><p>Producto destacado con descuento comprobado</p><s>59,99 €</s><b>24,99 €</b><em>🎟 Cupón cuando esté disponible</em><button>VER OFERTA</button></div><p>Alertas rápidas · Precios visibles · Sin coste</p></aside>
    </section>
    <section className="telegramBenefits shell"><article><b>01</b><h2>Selección antes que cantidad</h2><p>Filtros contra duplicados, descuentos poco creíbles y productos sin interés.</p></article><article><b>02</b><h2>Información para decidir</h2><p>Precio actual, precio anterior, ahorro, cupón y tienda en una publicación fácil de leer.</p></article><article><b>03</b><h2>Ofertas de varias tiendas</h2><p>Amazon, AliExpress, Miravia, PcComponentes, MediaMarkt, Xiaomi y El Corte Inglés.</p></article></section>
    <section className="telegramLandingCta"><div className="shell"><div><p className="eyebrow"><span />NO DEJES PASAR EL PRÓXIMO CHOLLO</p><h2>Entra, mira las ofertas y decide tú.</h2><p>Puedes silenciar las notificaciones y consultar el canal cuando te venga bien.</p></div><a href={joinUrl} target="_blank" rel="noreferrer">Ver el canal en Telegram →</a></div></section>
    <section className="faq shell telegramFaq"><p className="eyebrow"><span />PREGUNTAS FRECUENTES</p><h2>Todo claro antes de entrar</h2>{faq.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</section>
    <footer><div className="shell footnote"><span>© {new Date().getFullYear()} Chollos al Día</span><p><Link href="/">Ofertas de hoy</Link> · <Link href="/privacidad">Privacidad</Link> · <Link href="/contacto">Contacto</Link></p></div></footer>
  </main>;
}
