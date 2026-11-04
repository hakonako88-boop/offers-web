import guide from "../../data/tv-selection.json";
import { allDeals } from "../lib/deals";
import CouponCopy from "./CouponCopy";
import StoreLogo from "./StoreLogo";

export default function TelevisionSelection() {
  const entries = guide.products.map(p => ({ ...p, deal: allDeals.find(d => d.sourceProductId === p.offerId) }));
  return <section className="tvSelection">
    <figure className="tvCollage"><img src={guide.collage} alt="Comparativa visual: Xiaomi Mini LED 55 por 300,45 euros, Xiaomi F 65 por 351,11 euros y Xiaomi A 32 por 91,12 euros. Precios registrados; confirma el total en tienda." width={1024} height={1536} /><figcaption>Resumen visual · precios registrados, no una comprobación del carrito en tiempo real.</figcaption></figure>
    <nav className="tvCollageLinks" aria-label="Enlaces de los tres televisores">{entries.map(p=>p.deal && <a key={p.offerId} href={p.deal.affiliateUrl} target="_blank" rel="sponsored nofollow noreferrer">Ver {p.size} · {p.deal.price.toLocaleString('es-ES',{style:'currency',currency:'EUR'})} ↗</a>)}</nav>
    <div className="tvGuideIntro"><span>ELIGE POR USO · NO SOLO POR PULGADAS</span><p>{guide.intro}</p><div><a href="#tv-picks">Ver los televisores ↓</a><a href="#tv-compare">Comparar características ↓</a></div></div>
    <div className="tvGuideNotice">Revisión: 4 de noviembre de 2026. Precios registrados, no verificados en el carrito en tiempo real. Confirma modelo, vendedor, entrega y total antes de pagar. No vuelvas a restar el cupón al precio publicado.</div>
    <h2 id="tv-picks">Una televisión para cada espacio</h2>
    <div className="tvGuideCards">{entries.map(p => <article key={p.offerId}>
      <div className="tvGuideCardTop"><span>{p.badge}</span><b>{p.size}</b></div>
      <img className="tvGuidePhoto" src={guide.images[p.offerId as keyof typeof guide.images].local} alt={p.name} width={520} height={340} />
      <h3>{p.name}</h3><div className="tvGuideSpecs"><span>{p.panel}</span><span>{p.refresh}</span><span>{p.system}</span></div>
      <p className="tvGuideVerdict">{p.verdict}</p>
      {p.deal ? <div className="tvGuidePurchase"><StoreLogo store={p.deal.store} /><small>Último registro: {p.deal.verifiedAt.replace(/^Publicado el /u,'')}</small><strong>{p.deal.price.toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</strong><a className="primaryButton" href={p.deal.affiliateUrl} target="_blank" rel="sponsored nofollow noreferrer">Ver oferta en {p.deal.store} ↗</a>{p.deal.coupon ? <CouponCopy code={p.deal.coupon} /> : <p className="tvGuideNoCoupon">Sin código de cupón registrado.</p>}</div> : <p>Oferta no disponible actualmente.</p>}
      <details><summary>Lo mejor y lo que debes revisar</summary><h4>A favor</h4><ul>{p.pros.map(t=><li key={t}>{t}</li>)}</ul><h4>Antes de elegir</h4><ul>{p.cons.map(t=><li key={t}>{t}</li>)}</ul><a href={p.source} target="_blank" rel="noreferrer">Ficha oficial de Xiaomi ↗</a></details>
    </article>)}</div>
    <h2 id="tv-compare">Compara sin perderte entre siglas</h2><p className="tvGuideTableHint">Desliza la tabla en móvil para ver los tres modelos →</p>
    <div className="comparisonScroll" tabIndex={0} aria-label="Comparativa de televisores"><table><caption>Datos de las fichas oficiales. Las funciones pueden variar según la versión y el mercado.</caption><thead><tr><th scope="col">Característica</th>{entries.map(p=><th scope="col" key={p.name}>{p.name}</th>)}</tr></thead><tbody>{([['Tamaño','size'],['Pantalla','panel'],['Frecuencia','refresh'],['Smart TV','system'],['Conexiones','connections'],['Anchura','width']] as const).map(([label,key])=><tr key={key}><th scope="row">{label}</th>{entries.map(p=><td key={p.name}>{p[key]}</td>)}</tr>)}</tbody></table></div>
    <div className="tvGuideAdvice"><h2>Cuál elegiría según tu prioridad</h2><p><b>Cine y consola:</b> la S Mini LED 55 destaca en esta selección por pantalla y conexiones. Es una valoración de su ficha, no una medición de imagen.</p><p><b>Pantalla grande:</b> la F 65 si cabe en el mueble y no necesitas 4K a alta frecuencia.</p><p><b>Una habitación:</b> la A 32 por tamaño, aceptando que su resolución es HD.</p></div>
    <h2>Antes de pagar</h2><ul className="tvGuideChecklist"><li>Mide el mueble, la separación de las patas y el hueco disponible.</li><li>Confirma referencia, tamaño y año: no todas las variantes comparten panel.</li><li>Revisa envío de gran volumen, entrega y devoluciones del vendedor.</li><li>Para consola, comprueba resolución, Hz y puerto HDMI: no son lo mismo.</li><li>Prueba un solo cupón y revisa el total final; el ahorro no está garantizado.</li></ul>
    <p className="tvGuideDisclosure">Los enlaces comerciales pueden generar una comisión para Chollos al Día sin coste adicional. Selección limitada a ofertas registradas con foto y enlace; no significa que sean los precios más bajos de todo el mercado.</p>
  </section>;
}
