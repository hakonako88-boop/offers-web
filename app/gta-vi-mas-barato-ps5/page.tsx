import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const wise = "https://wise.com/invite/ahpc/pedrojesush5";
const pageUrl = "https://chollosaldia.com/gta-vi-mas-barato-ps5/";
const faqs = [
  ["¿Cuánto cuesta GTA VI en España?", "La Standard Edition figura a 79,99 € y la Ultimate Edition a 99,99 € en PlayStation España en la fecha de actualización."],
  ["¿Cuánto cuesta GTA VI en India?", "La Standard Edition figura a ₹5.999 y la Ultimate Edition a ₹7.499 en PlayStation India."],
  ["¿Cuánto son ₹5.999 en euros?", "Aproximadamente 53,91 € con el cambio utilizado para esta guía. El cambio y las comisiones pueden variar."],
  ["¿Cuánto ahorro?", "La diferencia teórica frente a 79,99 € ronda los 26 €, antes de posibles costes de conversión o del saldo."],
  ["¿Ya se puede jugar a GTA VI?", "No. Está disponible para reserva y su lanzamiento está previsto para el 19 de noviembre de 2026."],
  ["¿Puedo usar una tarjeta PlayStation India en una cuenta española?", "No. PlayStation indica que el código y el país o región de la cuenta deben coincidir."],
  ["¿Puedo cambiar una cuenta española a India?", "No. PlayStation indica que la región de una cuenta no puede modificarse después de crearla."],
  ["¿Es piratería?", "No: el saldo y el producto se pagan. Eso no convierte el uso de una región que no corresponde a tu residencia en un método aprobado por Sony."],
  ["¿PlayStation aprueba crear una cuenta de otro país para pagar menos?", "PlayStation pide registrar la región correcta y hacerla coincidir con la información de facturación. Esta guía no recomienda proporcionar datos inexactos."],
  ["¿Tengo que convertir manualmente euros a INR?", "No necesariamente. Wise puede convertir al pagar en otra moneda, aplicando las condiciones y comisiones que muestre antes de confirmar."],
  ["¿Cuándo sale GTA VI?", "El lanzamiento oficial para PS5 y PS5 Pro está previsto para el 19 de noviembre de 2026."],
] as const;

export const metadata: Metadata = {
  title: "GTA VI por 54 € en PS5: cómo ahorrar unos 26 €",
  description: "Descubre la diferencia regional que sitúa la reserva de GTA VI en PS5 en unos 54 € frente a 79,99 €, sus límites y qué debes comprobar.",
  alternates: { canonical: pageUrl },
  openGraph: { title: "GTA VI: 79,99 € frente a unos 54 €", description: "Comparativa regional, riesgos y costes que debes comprobar antes de reservar.", url: pageUrl, type: "article", images: ["/images/gta-vi-official.jpg"] },
};

function WiseCta({ label }: { label: string }) {
  return <div className="gtaWiseCta"><a href={wise} target="_blank" rel="sponsored noopener noreferrer">{label} <span>↗</span></a><small>Enlace de invitación/afiliado. Podemos recibir una recompensa si te registras, sin coste adicional para ti, según las condiciones vigentes de Wise.</small></div>;
}

export default function GtaGuide() {
  const schema = [{ "@context": "https://schema.org", "@type": "Article", headline: "Cómo conseguir GTA VI por unos 54 € en PS5 y ahorrar más de 25 €", description: metadata.description, datePublished: "2026-08-25", dateModified: "2026-08-25", author: { "@type": "Organization", name: "Chollos al Día" }, publisher: { "@type": "Organization", name: "Chollos al Día" }, image: "https://chollosaldia.com/images/gta-vi-official.jpg", mainEntityOfPage: pageUrl }, { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) }];
  return <main className="gtaGuide">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <header className="gtaTop"><Link className="brand" href="/"><span className="brandMark">€</span><span>Chollos <span>al</span>Día</span></Link><Link href="/">Ofertas de hoy</Link></header>
    <section className="gtaHero">
      <Image src="/images/gta-vi-official.jpg" alt="Arte promocional oficial de Grand Theft Auto VI con sus personajes, vehículos y Vice City" fill priority sizes="100vw" />
      <div className="gtaHeroShade" /><div className="gtaHeroCopy"><p>GUÍA ACTUALIZADA · AGOSTO 2026</p><h1>Cómo conseguir GTA VI por unos 54 € en PS5 y ahorrar más de 25 €</h1><h2>Una diferencia entre tiendas oficiales sitúa la reserva aproximadamente un 32 % por debajo de España. Te contamos el dato, sus límites y qué debes comprobar.</h2><div><span>Actualizado: 25 agosto 2026</span><span>Ahorro teórico: ≈26 €</span><span>Lectura: 10 min</span><span>Dificultad: media</span></div><a href="#metodo">Ver la comparativa y los requisitos ↓</a></div>
    </section>

    <article className="gtaArticle">
      <section className="gtaPrice" aria-labelledby="precio"><p className="gtaEyebrow">LA DIFERENCIA EN 5 SEGUNDOS</p><h2 id="precio">¿79,99 € o aproximadamente 54 €?</h2><div className="gtaPriceGrid"><div><span>🇪🇸 PRECIO ESPAÑA</span><strong>79,99 €</strong><small>PlayStation Store España</small></div><b>→</b><div className="hot"><span>🔥 REFERENCIA INDIA</span><strong>≈ 53,91 €</strong><small>Conversión aproximada de ₹5.999</small></div></div><h3>AHORRO TEÓRICO ≈ 26,08 € <span>· alrededor del 32 %</span></h3><p>El importe final puede variar por el cambio EUR/INR, las comisiones y el coste real de conseguir saldo. No es un precio garantizado.</p></section>

      <section className="gtaIntro"><p>GTA VI es uno de los lanzamientos más esperados y su Standard Edition cuesta 79,99 € en la tienda española. Las tiendas digitales de PlayStation no utilizan el mismo precio en todos los países, y una de las diferencias regionales más llamativas está en:</p><div className="gtaReveal"><span>¿DÓNDE ESTÁ MÁS BARATO?</span><strong>🇮🇳 PlayStation Store India</strong></div><div className="gtaTruth"><b>Lo importante antes de seguir</b><p>PlayStation exige registrar una cuenta en el país o región correcto y hacer coincidir la facturación. La región no puede cambiarse después. Por tanto, esta diferencia es informativa y no una invitación a declarar una residencia falsa.</p></div></section>

      <details className="gtaToc" open><summary>Contenido de la guía</summary><nav><a href="#comparativa">Comparativa</a><a href="#metodo">Cómo funciona</a><a href="#wise">Wise</a><a href="#saldo">Saldo regional</a><a href="#reserva">Reserva</a><a href="#seguridad">Condiciones</a><a href="#faq">Preguntas frecuentes</a></nav></details>

      <section id="comparativa" className="gtaSection"><p className="gtaEyebrow">PRECIOS OFICIALES CONSULTADOS</p><h2>España frente a India</h2><div className="gtaTable"><table><thead><tr><th>Edición</th><th>España</th><th>India</th><th>Diferencia aprox.</th></tr></thead><tbody><tr><td>Standard</td><td>79,99 €</td><td>₹5.999 ≈ 53,91 €</td><td>≈ 26,08 €</td></tr><tr><td>Ultimate</td><td>99,99 €</td><td>₹7.499 ≈ 67,39 €</td><td>≈ 32,60 €</td></tr></tbody></table></div><p className="gtaNote">Precios observados el 25/08/2026. El tipo de cambio y los costes asociados pueden variar. Comprueba siempre las páginas oficiales enlazadas al final.</p></section>

      <section id="metodo" className="gtaSection"><p className="gtaEyebrow">CÓMO SE FORMA EL PRECIO</p><h2>El recorrido del dinero y del saldo</h2><div className="gtaFlow"><div><b>€</b><span>Euros</span></div><i>→</i><div><b>W</b><span>Conversión</span></div><i>→</i><div><b>₹</b><span>Saldo regional</span></div><i>→</i><div><b>PS</b><span>Cuenta coincidente</span></div><i>→</i><div><b>VI</b><span>Reservar</span></div></div></section>

      <section id="wise" className="gtaStep"><span>01</span><div><p className="gtaEyebrow">PAGO EN OTRA DIVISA</p><h2>Compara la conversión con Wise</h2><p>Wise permite pagar en monedas distintas y puede convertir automáticamente desde el saldo disponible. Antes de usarlo, revisa la comisión y el importe definitivo mostrado. Si un comercio ofrece cobrar en euros o en moneda local, compara ambas alternativas; Wise recomienda elegir la moneda local para evitar la conversión del comercio.</p><WiseCta label="Crear cuenta en Wise" /></div></section>

      <section id="saldo" className="gtaStep"><span>02</span><div><p className="gtaEyebrow">SALDO PLAYSTATION</p><h2>La región del código debe coincidir</h2><p>El precio indio requiere saldo suficiente para ₹5.999. La disponibilidad y denominación de las tarjetas puede cambiar, así que nunca des por hecho que existe una tarjeta exacta de ₹6.000 ni que Amazon India la vende en todo momento.</p><div className="gtaWarning"><b>⚠️ La región importa</b><p>PS Store India + cuenta India: compatible según la región. PS Store India + cuenta España: el código no se puede canjear.</p></div><p>No compres un código hasta comprobar vendedor, entrega, devolución, región y coste final. No proporciones a PlayStation información de residencia o facturación inexacta.</p></div></section>

      <section className="gtaCalc"><div><span>Necesitas</span><strong>₹5.999</strong></div><div><span>Valor orientativo</span><strong>≈53,91 €</strong></div><div><span>España</span><strong>79,99 €</strong></div><div className="hot"><span>Diferencia</span><strong>≈26,08 €</strong></div></section>

      <section className="gtaStep"><span>03</span><div><p className="gtaEyebrow">ANTES DE PAGAR</p><h2>Calcula el coste real, no solo el cambio</h2><ol><li>Comprueba la región exacta del saldo.</li><li>Revisa el total que carga el vendedor.</li><li>Selecciona INR únicamente si corresponde y el comercio lo permite.</li><li>Suma conversión y comisiones aplicables.</li><li>Confirma que el ahorro sigue compensando.</li></ol><p className="gtaFormula">Coste real = coste del saldo + conversión + comisiones aplicables</p><WiseCta label="Abrir Wise y revisar el pago en rupias" /></div></section>

      <section id="reserva" className="gtaStep"><span>04</span><div><p className="gtaEyebrow">RESERVA, NO DESCARGA INMEDIATA</p><h2>GTA VI se juega después del lanzamiento</h2><p>Con saldo suficiente en una cuenta cuya región corresponda correctamente, PlayStation muestra la Standard Edition por ₹5.999. A fecha de esta guía solo se puede <strong>reservar</strong>: el lanzamiento oficial está previsto para el <strong>19 de noviembre de 2026</strong>.</p><div className="gtaWarning"><b>⚠️ Atención con GTA+</b><p>La reserva digital incluye actualmente un mes de GTA+. PlayStation indica que después continúa como suscripción de pago hasta que se cancele. Revisa la renovación en la cuenta.</p></div></div></section>

      <section id="seguridad" className="gtaSection gtaSafety"><p className="gtaEyebrow">TRANSPARENCIA</p><h2>No es piratería, pero la región tiene condiciones</h2><div><article><b>✓ El juego y el saldo se pagan</b><p>No hay cracks, copias piratas ni descargas gratuitas.</p></article><article><b>! No es una promoción aprobada para residentes españoles</b><p>PlayStation exige elegir el país correcto y mantener información precisa.</p></article><article><b>! DLC, GTA+ y compras futuras</b><p>El contenido adicional puede tener restricciones regionales. Comprueba compatibilidad antes de pagar.</p></article><article><b>✓ Compartir consola y juego offline</b><p>PlayStation ofrece esta función bajo sus condiciones, pero no garantiza compatibilidad futura específica más allá de la información oficial.</p></article></div></section>

      <section className="gtaSaving"><span>🇪🇸 79,99 €</span><i>→</i><span>🇮🇳 ≈53,91 €</span><strong>≈26,08 € MENOS</strong><p>Una diferencia aproximada del 32 %, antes de costes y siempre respetando las condiciones regionales.</p></section>

      <section className="gtaFinalCta"><div><p className="gtaEyebrow">PAGOS EN OTRAS MONEDAS</p><h2>¿Necesitas comparar el coste en otra divisa?</h2><p>Wise puede gestionar la conversión al pagar, pero debes revisar la disponibilidad, las comisiones y el total antes de confirmar.</p></div><WiseCta label="Crear mi cuenta Wise" /></section>

      <section id="faq" className="gtaFaq"><p className="gtaEyebrow">PREGUNTAS FRECUENTES</p><h2>Lo esencial antes de reservar</h2>{faqs.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</section>

      <section className="gtaSources"><h2>Fuentes oficiales</h2><ul><li><a href="https://www.playstation.com/es-es/games/grand-theft-auto-vi/" target="_blank" rel="noopener noreferrer">GTA VI en PlayStation España ↗</a></li><li><a href="https://www.playstation.com/en-in/games/grand-theft-auto-vi/" target="_blank" rel="noopener noreferrer">GTA VI en PlayStation India ↗</a></li><li><a href="https://www.playstation.com/en-us/support/account/check-account-country-region/" target="_blank" rel="noopener noreferrer">Soporte oficial sobre país y región ↗</a></li><li><a href="https://www.playstation.com/legal/psn-terms-of-service/" target="_blank" rel="noopener noreferrer">Términos de PlayStation ↗</a></li><li><a href="https://wise.com/help/articles/2977949/an-atm-asked-me-to-convert-currencies-when-using-my-wise-card" target="_blank" rel="noopener noreferrer">Ayuda oficial de Wise sobre conversión ↗</a></li><li><a href="https://www.rockstargames.com/VI" target="_blank" rel="noopener noreferrer">Página oficial de Rockstar Games ↗</a></li></ul></section>
      <aside className="gtaDisclaimer"><h2>Aviso</h2><p>Los precios, tipos de cambio, disponibilidad de tarjetas y condiciones de PlayStation, Amazon y Wise pueden cambiar. PlayStation establece requisitos sobre el país/región y la información de las cuentas. Esta comparativa tiene fines informativos y no implica que Sony autorice a una persona a registrarse como residente de otro país. Comprueba siempre las condiciones vigentes antes de comprar.</p></aside>
    </article>
  </main>;
}
