import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const wise = "https://wise.com/invite/ahpc/pedrojesush5";
const pageUrl = "https://chollosaldia.com/gta-vi-mas-barato-ps5/";
const publishedAt = "2026-08-25T08:00:00+02:00";
const updatedAt = "2026-08-31T12:00:00+02:00";
const seoDescription = "GTA 6 barato en PS5: precio oficial en España, comparación regional, ahorro, ediciones, reserva y fecha de lanzamiento de GTA VI en 2026.";
const officialVideoUrl = "https://www.youtube.com/watch?v=tJbzMqJGH4k";
const officialVideoEmbed = "https://www.youtube-nocookie.com/embed/tJbzMqJGH4k";
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
  ["¿Dónde se puede reservar GTA 6 para PS5?", "La reserva digital está disponible en PlayStation Store. Antes de pagar, comprueba la edición, la región de tu cuenta, la renovación de GTA+ y el precio final mostrado por PlayStation."],
  ["¿Cuál es el precio oficial de GTA 6 para PS5?", "En PlayStation Store España, la Standard Edition figura a 79,99 € y la Ultimate Edition a 99,99 € en la fecha de esta revisión."],
] as const;

export const metadata: Metadata = {
  title: "GTA 6 barato: precio PS5, reserva y ahorro",
  description: seoDescription,
  keywords: [
    "GTA 6 barato",
    "comprar GTA 6 barato PS5",
    "reservar GTA 6 PS5",
    "GTA VI precio",
    "precio GTA 6 PS5",
    "precio GTA VI España",
    "GTA 6 Standard Edition precio",
    "GTA 6 Ultimate Edition precio",
    "GTA VI PS5 Pro",
    "GTA 6 fecha de salida",
    "fecha lanzamiento GTA 6",
    "Grand Theft Auto VI",
    "oferta GTA 6",
  ],
  authors: [{ name: "Chollos al Día", url: "https://chollosaldia.com/" }],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  alternates: { canonical: pageUrl },
  openGraph: { title: "GTA 6 barato: precio en PS5, reserva y ahorro", description: seoDescription, url: pageUrl, type: "article", publishedTime: publishedAt, modifiedTime: updatedAt, section: "Gaming", tags: ["GTA VI", "GTA 6", "Grand Theft Auto VI", "PS5", "PS5 Pro", "Precio GTA 6", "Reserva GTA 6"], images: [{ url: "/images/gta-vi-official.jpg", width: 1200, height: 630, alt: "Arte promocional oficial de Grand Theft Auto VI" }] },
  twitter: { card: "summary_large_image", title: "GTA 6 barato: precio PS5, reserva y ahorro", description: seoDescription, images: ["/images/gta-vi-official.jpg"] },
};

function WiseCta({ label }: { label: string }) {
  return <div className="gtaWiseCta"><a href={wise} target="_blank" rel="sponsored noopener noreferrer">{label} <span>↗</span></a><small>Enlace de invitación/afiliado. Podemos recibir una recompensa si te registras, sin coste adicional para ti, según las condiciones vigentes de Wise.</small></div>;
}

export default function GtaGuide() {
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": `${pageUrl}#webpage`, url: pageUrl, name: "GTA 6 barato: precio PS5, reserva y ahorro", description: seoDescription, inLanguage: "es-ES", isPartOf: { "@id": "https://chollosaldia.com/#website" }, primaryImageOfPage: { "@id": `${pageUrl}#primaryimage` }, breadcrumb: { "@id": `${pageUrl}#breadcrumb` }, datePublished: publishedAt, dateModified: updatedAt },
    { "@type": "ImageObject", "@id": `${pageUrl}#primaryimage`, url: "https://chollosaldia.com/images/gta-vi-official.jpg", contentUrl: "https://chollosaldia.com/images/gta-vi-official.jpg", width: 1200, height: 630, caption: "Arte promocional oficial de Grand Theft Auto VI" },
    { "@type": "Article", "@id": `${pageUrl}#article`, headline: "GTA 6 barato: precio en PS5, reserva y ahorro", description: seoDescription, datePublished: publishedAt, dateModified: updatedAt, inLanguage: "es-ES", isAccessibleForFree: true, author: { "@type": "Organization", name: "Chollos al Día", url: "https://chollosaldia.com/como-verificamos-ofertas/" }, publisher: { "@type": "Organization", name: "Chollos al Día", url: "https://chollosaldia.com/", logo: { "@type": "ImageObject", url: "https://chollosaldia.com/favicon-512.png" } }, image: { "@id": `${pageUrl}#primaryimage` }, mainEntityOfPage: { "@id": `${pageUrl}#webpage` }, articleSection: "Gaming y videojuegos", keywords: ["GTA 6 barato", "precio GTA 6 PS5", "reservar GTA VI PS5", "precio GTA VI España", "fecha de salida GTA 6", "Grand Theft Auto VI"], about: { "@type": "VideoGame", name: "Grand Theft Auto VI", alternateName: ["GTA VI", "GTA 6"], gamePlatform: ["PlayStation 5", "PlayStation 5 Pro", "Xbox Series X|S"], url: "https://www.rockstargames.com/VI" }, citation: ["https://www.rockstargames.com/VI", "https://www.playstation.com/es-es/games/grand-theft-auto-vi/", "https://www.playstation.com/en-in/games/grand-theft-auto-vi/"] },
    { "@type": "VideoObject", "@id": `${pageUrl}#video`, name: "Grand Theft Auto VI: An Extended Look", description: "Vídeo oficial de Rockstar Games con imágenes capturadas dentro del juego en PlayStation 5.", thumbnailUrl: ["https://chollosaldia.com/images/gta-vi-official.jpg"], uploadDate: "2026-08-27T21:00:00+02:00", contentUrl: officialVideoUrl, embedUrl: officialVideoEmbed, publisher: { "@type": "Organization", name: "Rockstar Games", url: "https://www.rockstargames.com/" } },
    { "@type": "BreadcrumbList", "@id": `${pageUrl}#breadcrumb`, itemListElement: [{ "@type": "ListItem", position: 1, name: "Inicio", item: "https://chollosaldia.com/" }, { "@type": "ListItem", position: 2, name: "Gaming", item: "https://chollosaldia.com/chollos/videojuegos/" }, { "@type": "ListItem", position: 3, name: "GTA 6 barato en PS5", item: pageUrl }] },
    { "@type": "FAQPage", "@id": `${pageUrl}#faq`, mainEntity: faqs.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) }
  ] };
  return <main className="gtaGuide">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <header className="gtaTop"><Link className="brand" href="/"><span className="brandMark">€</span><span>Chollos <span>al</span>Día</span></Link><Link href="/">Ofertas de hoy</Link></header>
    <section className="gtaHero">
      <Image src="/images/gta-vi-official.jpg" alt="Arte promocional oficial de Grand Theft Auto VI con sus personajes, vehículos y Vice City" fill priority sizes="100vw" />
      <div className="gtaHeroShade" /><div className="gtaHeroCopy"><p>GUÍA DE PRECIOS · ACTUALIZADA</p><h1>GTA 6 barato en PS5: precio, reserva y ahorro frente a España</h1><h2>Comparamos el precio oficial de GTA VI en España con la referencia regional, las ediciones, los requisitos de PlayStation y la fecha de lanzamiento.</h2><div><span><time dateTime={updatedAt}>Actualizado: 31 agosto 2026</time></span><span>Ahorro teórico: ≈26 €</span><span>Lanzamiento: 19 noviembre 2026</span><span>Lectura: 12 min</span></div><p className="gtaByline">Por Chollos al Día · Precios contrastados con PlayStation y Rockstar Games</p><a href="#precio">Ver precio de GTA 6 ↓</a></div>
    </section>

    <article className="gtaArticle">
      <nav className="gtaBreadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>/</span><Link href="/chollos/videojuegos/">Videojuegos</Link><span>/</span><b>GTA 6 barato</b></nav>
      <section id="ultima-hora" className="gtaLatest" aria-labelledby="gta-latest-title"><div><p className="gtaEyebrow">VÍDEO OFICIAL · 27 AGOSTO 2026</p><h2 id="gta-latest-title">Ya puedes ver “GTA VI: An Extended Look”</h2><p>Rockstar Games ha publicado la presentación ampliada de <strong>Grand Theft Auto VI</strong>, capturada dentro del juego en PlayStation 5. El estudio mantiene el lanzamiento para el <strong>19 de noviembre de 2026</strong> en PS5 y Xbox Series X|S.</p></div><a href="https://www.rockstargames.com/VI/an-extended-look" target="_blank" rel="noopener noreferrer">Ver información oficial ↗</a></section>
      <section className="gtaVideo" aria-labelledby="gta-video-title"><div><p className="gtaEyebrow">IMÁGENES OFICIALES DE JUEGO</p><h2 id="gta-video-title">Vídeo ampliado de GTA 6</h2><p>Este vídeo pertenece al canal oficial de Rockstar Games. Después puedes continuar con la comparativa de precios y las condiciones de la reserva.</p></div><div className="gtaVideoFrame"><iframe src={officialVideoEmbed} title="Grand Theft Auto VI: An Extended Look, vídeo oficial" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></section>
      <section className="gtaPrice" aria-labelledby="precio"><p className="gtaEyebrow">LA DIFERENCIA EN 5 SEGUNDOS</p><h2 id="precio">¿79,99 € o aproximadamente 54 €?</h2><div className="gtaPriceGrid"><div><span>🇪🇸 PRECIO ESPAÑA</span><strong>79,99 €</strong><small>PlayStation Store España</small></div><b>→</b><div className="hot"><span>🔥 REFERENCIA INDIA</span><strong>≈ 53,91 €</strong><small>Conversión aproximada de ₹5.999</small></div></div><h3>AHORRO TEÓRICO ≈ 26,08 € <span>· alrededor del 32 %</span></h3><p>El importe final puede variar por el cambio EUR/INR, las comisiones y el coste real de conseguir saldo. No es un precio garantizado.</p></section>

      <section className="gtaIntro"><p><strong>Grand Theft Auto VI</strong>, conocido como GTA VI o GTA 6, es uno de los lanzamientos más esperados. El precio de GTA 6 para PS5 en España parte de 79,99 € para la Standard Edition. Las tiendas digitales de PlayStation no utilizan el mismo precio en todos los países, y una de las diferencias regionales más llamativas está en:</p><div className="gtaReveal"><span>¿DÓNDE ESTÁ MÁS BARATO?</span><strong>🇮🇳 PlayStation Store India</strong></div><div className="gtaTruth"><b>Lo importante antes de seguir</b><p>PlayStation exige registrar una cuenta en el país o región correcto y hacer coincidir la facturación. La región no puede cambiarse después. Por tanto, esta diferencia es informativa y no una invitación a declarar una residencia falsa.</p></div></section>

      <details className="gtaToc" open><summary>Contenido de la guía</summary><nav><a href="#ultima-hora">Vídeo oficial</a><a href="#comparativa">Precio GTA 6</a><a href="#metodo">Cómo funciona</a><a href="#wise">Wise</a><a href="#saldo">Saldo regional</a><a href="#reserva">Reserva y lanzamiento</a><a href="#seguridad">Condiciones</a><a href="#faq">Preguntas frecuentes</a></nav></details>

      <section id="comparativa" className="gtaSection"><p className="gtaEyebrow">PRECIOS OFICIALES CONSULTADOS</p><h2>Precio de GTA 6 en España: Standard y Ultimate</h2><div className="gtaTable"><table><thead><tr><th>Edición</th><th>España</th><th>India</th><th>Diferencia aprox.</th></tr></thead><tbody><tr><td>Standard</td><td>79,99 €</td><td>₹5.999 ≈ 53,91 €</td><td>≈ 26,08 €</td></tr><tr><td>Ultimate</td><td>99,99 €</td><td>₹7.499 ≈ 67,39 €</td><td>≈ 32,60 €</td></tr></tbody></table></div><p className="gtaNote">Precios observados el 25/08/2026. El tipo de cambio y los costes asociados pueden variar. Comprueba siempre las páginas oficiales enlazadas al final.</p></section>

      <section id="metodo" className="gtaSection"><p className="gtaEyebrow">CÓMO SE FORMA EL PRECIO</p><h2>El recorrido del dinero y del saldo</h2><div className="gtaFlow"><div><b>€</b><span>Euros</span></div><i>→</i><div><b>W</b><span>Conversión</span></div><i>→</i><div><b>₹</b><span>Saldo regional</span></div><i>→</i><div><b>PS</b><span>Cuenta coincidente</span></div><i>→</i><div><b>VI</b><span>Reservar</span></div></div></section>

      <section id="wise" className="gtaStep"><span>01</span><div><p className="gtaEyebrow">PAGO EN OTRA DIVISA</p><h2>Compara la conversión con Wise</h2><p>Wise permite pagar en monedas distintas y puede convertir automáticamente desde el saldo disponible. Antes de usarlo, revisa la comisión y el importe definitivo mostrado. Si un comercio ofrece cobrar en euros o en moneda local, compara ambas alternativas; Wise recomienda elegir la moneda local para evitar la conversión del comercio.</p><WiseCta label="Crear cuenta en Wise" /></div></section>

      <section id="saldo" className="gtaStep"><span>02</span><div><p className="gtaEyebrow">SALDO PLAYSTATION</p><h2>La región del código debe coincidir</h2><p>El precio indio requiere saldo suficiente para ₹5.999. La disponibilidad y denominación de las tarjetas puede cambiar, así que nunca des por hecho que existe una tarjeta exacta de ₹6.000 ni que Amazon India la vende en todo momento.</p><div className="gtaWarning"><b>⚠️ La región importa</b><p>PS Store India + cuenta India: compatible según la región. PS Store India + cuenta España: el código no se puede canjear.</p></div><p>No compres un código hasta comprobar vendedor, entrega, devolución, región y coste final. No proporciones a PlayStation información de residencia o facturación inexacta.</p></div></section>

      <section className="gtaCalc"><div><span>Necesitas</span><strong>₹5.999</strong></div><div><span>Valor orientativo</span><strong>≈53,91 €</strong></div><div><span>España</span><strong>79,99 €</strong></div><div className="hot"><span>Diferencia</span><strong>≈26,08 €</strong></div></section>

      <section className="gtaStep"><span>03</span><div><p className="gtaEyebrow">ANTES DE PAGAR</p><h2>Calcula el coste real, no solo el cambio</h2><ol><li>Comprueba la región exacta del saldo.</li><li>Revisa el total que carga el vendedor.</li><li>Selecciona INR únicamente si corresponde y el comercio lo permite.</li><li>Suma conversión y comisiones aplicables.</li><li>Confirma que el ahorro sigue compensando.</li></ol><p className="gtaFormula">Coste real = coste del saldo + conversión + comisiones aplicables</p><WiseCta label="Abrir Wise y revisar el pago en rupias" /></div></section>

      <section id="reserva" className="gtaStep"><span>04</span><div><p className="gtaEyebrow">RESERVA, NO DESCARGA INMEDIATA</p><h2>Reservar GTA VI para PS5 antes de la fecha de salida</h2><p>Con saldo suficiente en una cuenta cuya región corresponda correctamente, PlayStation muestra la Standard Edition por ₹5.999. A fecha de esta guía solo se puede <strong>reservar GTA 6 para PS5 o PS5 Pro</strong>: el lanzamiento oficial está previsto para el <strong>19 de noviembre de 2026</strong>.</p><div className="gtaWarning"><b>⚠️ Atención con GTA+</b><p>La reserva digital incluye actualmente un mes de GTA+. PlayStation indica que después continúa como suscripción de pago hasta que se cancele. Revisa la renovación en la cuenta.</p></div></div></section>

      <section id="seguridad" className="gtaSection gtaSafety"><p className="gtaEyebrow">TRANSPARENCIA</p><h2>No es piratería, pero la región tiene condiciones</h2><div><article><b>✓ El juego y el saldo se pagan</b><p>No hay cracks, copias piratas ni descargas gratuitas.</p></article><article><b>! No es una promoción aprobada para residentes españoles</b><p>PlayStation exige elegir el país correcto y mantener información precisa.</p></article><article><b>! DLC, GTA+ y compras futuras</b><p>El contenido adicional puede tener restricciones regionales. Comprueba compatibilidad antes de pagar.</p></article><article><b>✓ Compartir consola y juego offline</b><p>PlayStation ofrece esta función bajo sus condiciones, pero no garantiza compatibilidad futura específica más allá de la información oficial.</p></article></div></section>

      <section className="gtaSaving"><span>🇪🇸 79,99 €</span><i>→</i><span>🇮🇳 ≈53,91 €</span><strong>≈26,08 € MENOS</strong><p>Una diferencia aproximada del 32 %, antes de costes y siempre respetando las condiciones regionales.</p></section>

      <section className="gtaFinalCta"><div><p className="gtaEyebrow">PAGOS EN OTRAS MONEDAS</p><h2>¿Necesitas comparar el coste en otra divisa?</h2><p>Wise puede gestionar la conversión al pagar, pero debes revisar la disponibilidad, las comisiones y el total antes de confirmar.</p></div><WiseCta label="Crear mi cuenta Wise" /></section>

      <section id="faq" className="gtaFaq"><p className="gtaEyebrow">PREGUNTAS FRECUENTES</p><h2>Precio, reserva y fecha de salida de GTA 6</h2>{faqs.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</section>

      <section className="gtaSources"><h2>Más ofertas y guías relacionadas</h2><ul><li><Link href="/chollos/videojuegos/">Chollos de videojuegos y gaming</Link></li><li><Link href="/ofertas/amazon/">Ofertas de Amazon verificadas</Link></li><li><Link href="/blog/">Guías para comprar y ahorrar</Link></li><li><Link href="/telegram/">Recibir alertas de chollos en Telegram</Link></li></ul></section>

      <section className="gtaSources"><h2>Fuentes oficiales</h2><ul><li><a href="https://www.playstation.com/es-es/games/grand-theft-auto-vi/" target="_blank" rel="noopener noreferrer">GTA VI en PlayStation España ↗</a></li><li><a href="https://www.playstation.com/en-in/games/grand-theft-auto-vi/" target="_blank" rel="noopener noreferrer">GTA VI en PlayStation India ↗</a></li><li><a href="https://www.playstation.com/en-us/support/account/check-account-country-region/" target="_blank" rel="noopener noreferrer">Soporte oficial sobre país y región ↗</a></li><li><a href="https://www.playstation.com/legal/psn-terms-of-service/" target="_blank" rel="noopener noreferrer">Términos de PlayStation ↗</a></li><li><a href="https://wise.com/help/articles/2977949/an-atm-asked-me-to-convert-currencies-when-using-my-wise-card" target="_blank" rel="noopener noreferrer">Ayuda oficial de Wise sobre conversión ↗</a></li><li><a href="https://www.rockstargames.com/VI" target="_blank" rel="noopener noreferrer">Página oficial de Rockstar Games ↗</a></li></ul></section>
      <aside className="gtaDisclaimer"><h2>Aviso</h2><p>Los precios, tipos de cambio, disponibilidad de tarjetas y condiciones de PlayStation, Amazon y Wise pueden cambiar. PlayStation establece requisitos sobre el país/región y la información de las cuentas. Esta comparativa tiene fines informativos y no implica que Sony autorice a una persona a registrarse como residente de otro país. Comprueba siempre las condiciones vigentes antes de comprar.</p></aside>
    </article>
  </main>;
}
