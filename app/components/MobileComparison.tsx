import guide from "../../data/mobile-comparison.json";
import { allDeals } from "../lib/deals";
import CouponCopy from "./CouponCopy";

export default function MobileComparison() {
  // Comparisons reference their exact reviewed records, not the capped home feed.
  const entries = guide.products.map(product => { const deal = allDeals.find(d => d.sourceProductId === product.offerId); const checked = Date.parse(deal?.verifiedDate || ''); return { ...product, deal, recent: Number.isFinite(checked) && checked <= Date.now() && Date.now() - checked <= 86400000 }; });
  return <section className="mobileComparison">
    <p>{guide.intro}</p>
    <h2>Cuál elegir según tu uso</h2>
    <div className="comparisonProducts">{entries.map((p,index) => <article key={p.offerId}>
      <span className="comparisonBadge">{index === 0 ? 'FORMATO MÁS CONTENIDO' : 'PANTALLA MÁS GRANDE'}</span>
      {p.deal && <img src={p.deal.imageUrl} alt={p.name} width={480} height={360} />}
      <h3>{p.name}</h3><p>{p.verdict}</p>
      {p.deal ? <div className="comparisonPurchase"><span className="comparisonDate">{p.recent ? 'Último precio registrado' : 'Referencia histórica: no es un precio vigente'} · {p.deal.verifiedAt.replace(/^Publicado el /u,'')}</span>{p.recent ? <strong className="comparisonPrice">{p.deal.price.toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</strong> : <p>Consulta el importe actual y la variante en la tienda.</p>}<a className="primaryButton" href={p.deal.affiliateUrl} target="_blank" rel="sponsored nofollow noreferrer">Ver {p.name} en {p.deal.store} ↗</a>{p.recent && p.deal.coupon && <CouponCopy code={p.deal.coupon} />}</div> : <p>No hay una oferta disponible para enlazar ahora.</p>}
      <details className="comparisonReview"><summary>Ventajas y puntos a revisar</summary><h4>A favor</h4><ul>{p.pros.map(t => <li key={t}>{t}</li>)}</ul><h4>Ten en cuenta</h4><ul>{p.cons.map(t => <li key={t}>{t}</li>)}</ul></details>
      <a className="comparisonSource" href={p.source} target="_blank" rel="noreferrer">Fuente: especificaciones oficiales de Xiaomi ↗</a>
    </article>)}</div>
    <aside className="comparisonNotice">Revisión de características: {new Date(guide.reviewed+'T12:00:00Z').toLocaleDateString('es-ES',{timeZone:'Europe/Madrid',day:'numeric',month:'long',year:'numeric'})}. Las especificaciones se contrastan con el fabricante. Los precios publicados hace más de 24 horas no se presentan como actuales; confirma siempre el carrito. No restes el cupón otra vez al precio publicado.</aside>
    <h2>Cómo elegir por precio, sin pagar por funciones que no usarás</h2><ul><li>Con un presupuesto ajustado, compara el total de la misma RAM y capacidad, incluidos envío y cargador. No elijas por el precio de una variante distinta.</li><li>Si ambos te cuestan parecido, el X8 Pro encaja mejor si valoras un cuerpo más estrecho y vídeo 4K a 60 fps; el M8 Pro, si prefieres una pantalla de mayor tamaño.</li><li>Si hay una diferencia importante de precio, decide si esas funciones justifican el extra para tu uso. No calificamos un modelo como el mejor de todo el mercado ni como ganador de cámara sin pruebas propias.</li></ul>
    <h2>Las diferencias, de un vistazo</h2>
    <p className="comparisonTableHint">En móvil, desliza la tabla para ver ambos modelos →</p>
    <div className="comparisonScroll" tabIndex={0} aria-label="Tabla comparativa de móviles"><table><caption>Especificaciones oficiales; confirma la versión ofrecida por el vendedor.</caption><thead><tr><th scope="col">Qué comparamos</th>{entries.map(p => <th scope="col" key={p.name}>{p.name}</th>)}</tr></thead><tbody>{([['Pantalla','screen'],['Procesador','chip'],['Batería y carga','battery'],['Cámara trasera','camera'],['Peso','weight']] as const).map(([label,key]) => <tr key={key}><th scope="row">{label}</th>{entries.map(p => <td key={p.name}>{p[key]}</td>)}</tr>)}</tbody></table></div>
    <h2>Antes de comprar: cinco comprobaciones</h2><ol><li>Selecciona la misma RAM y capacidad: los anuncios pueden mezclar varias versiones.</li><li>Comprueba versión europea, bandas, vendedor y garantía.</li><li>Aplica un solo código válido y revisa el total, incluido el envío.</li><li>Cuenta el coste de un cargador compatible si no tienes uno.</li><li>No confundas capacidad de batería con horas de autonomía: no hemos medido su duración real.</li></ol>
    <p>Conclusión editorial: el X8 Pro encaja si buscas menor tamaño y más opciones de vídeo; el M8 Pro si prefieres una pantalla mayor. La elección final depende del precio y de la variante que realmente puedas comprar. Los enlaces comerciales pueden generar una comisión para Chollos al Día sin coste adicional.</p>
  </section>;
}
