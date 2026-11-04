import guide from "../../data/mobile-comparison.json";
import { publishedDeals } from "../lib/deals";
import CouponCopy from "./CouponCopy";

export default function MobileComparison() {
  const entries = guide.products.map(product => ({ ...product, deal: publishedDeals.find(d => d.sourceProductId === product.offerId) }));
  return <section className="mobileComparison">
    <p>{guide.intro}</p>
    <aside className="comparisonNotice">Revisión editorial: 4 de noviembre de 2026. Los precios son los últimos registrados en nuestras fichas, no una comprobación del carrito en tiempo real. No restes el cupón otra vez al precio publicado.</aside>
    <h2>Las diferencias, de un vistazo</h2>
    <div className="comparisonScroll" tabIndex={0} aria-label="Tabla comparativa de móviles"><table><caption>Especificaciones oficiales; confirma la versión ofrecida por el vendedor.</caption><thead><tr><th scope="col">Qué comparamos</th>{entries.map(p => <th scope="col" key={p.name}>{p.name}</th>)}</tr></thead><tbody>{([['Pantalla','screen'],['Procesador','chip'],['Batería y carga','battery'],['Cámara trasera','camera'],['Peso','weight']] as const).map(([label,key]) => <tr key={key}><th scope="row">{label}</th>{entries.map(p => <td key={p.name}>{p[key]}</td>)}</tr>)}</tbody></table></div>
    <h2>Cuál elegir según tu uso</h2>
    <div className="comparisonProducts">{entries.map(p => <article key={p.offerId}>
      {p.deal && <img src={p.deal.imageUrl} alt={p.name} width={480} height={360} />}
      <h3>{p.name}</h3><p>{p.verdict}</p>
      <h4>A favor</h4><ul>{p.pros.map(t => <li key={t}>{t}</li>)}</ul>
      <h4>Ten en cuenta</h4><ul>{p.cons.map(t => <li key={t}>{t}</li>)}</ul>
      {p.deal ? <><span>Último precio registrado · {p.deal.verifiedAt}</span><strong className="comparisonPrice">{p.deal.price.toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</strong>{p.deal.coupon && <CouponCopy code={p.deal.coupon} />}<a className="primaryButton" href={p.deal.affiliateUrl} target="_blank" rel="sponsored nofollow noreferrer">Consultar oferta en {p.deal.store} ↗</a></> : <p>No hay una oferta disponible para enlazar ahora.</p>}
      <a className="comparisonSource" href={p.source} target="_blank" rel="noreferrer">Fuente: especificaciones oficiales de Xiaomi ↗</a>
    </article>)}</div>
    <h2>Antes de comprar: cinco comprobaciones</h2><ol><li>Selecciona la misma RAM y capacidad: los anuncios pueden mezclar varias versiones.</li><li>Comprueba versión europea, bandas, vendedor y garantía.</li><li>Aplica un solo código válido y revisa el total, incluido el envío.</li><li>Cuenta el coste de un cargador compatible si no tienes uno.</li><li>No confundas capacidad de batería con horas de autonomía: no hemos medido su duración real.</li></ol>
    <p>Conclusión editorial: el X8 Pro encaja si buscas menor tamaño y más opciones de vídeo; el M8 Pro si prefieres una pantalla mayor. La elección final depende del precio y de la variante que realmente puedas comprar. Los enlaces comerciales pueden generar una comisión para Chollos al Día sin coste adicional.</p>
  </section>;
}
