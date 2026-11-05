import catalogue from '../../data/tesla-catalogue.json';
import details from '../../data/tesla-import-details.json';
import StoreLogo from '../components/StoreLogo';
import observations from '../../data/tesla-price-observations.json';
import TeslaPrice from './TeslaPrice';
export default function ImportedProducts() {
  const approvedNew = observations.discoveries.filter(item => ['1005010473185985', '1005010472747139'].includes(item.productId) || ('admission' in item && item.admission === 'automated_low_risk_filter'));
  const entries = [...catalogue.imports, ...approvedNew.map(item => ({ productId: item.productId, originalUrl: item.generatedAffiliateUrl }))];
  const renderedAt = Date.now();
  return <section className="teslaSection" id="productos-recibidos"><div className="teslaSectionHeading"><div><p>Interior, protección y organización</p><h2>Accesorios Tesla en AliExpress</h2></div><a href="/tesla/guias/organizadores/">Cómo elegir la variante</a></div><p>Precios consultados en la API para España. El importe final depende de la variante y las condiciones de la cesta.</p><div className="teslaImportGrid">{entries.map(entry => {
    const source = approvedNew.find(item => item.productId === entry.productId);
    const item = details.items.find(item => item.productId === entry.productId) || (source ? { name: source.name, imageUrl: source.imageUrl, sellerClaim: 'Modelo y variante descritos por el vendedor; confirma la opción seleccionada', caution: undefined } : null); if (!item || !entry.originalUrl) return null;
    const observation = [...observations.items, ...observations.discoveries].find(item => item.productId === entry.productId);
    return <article className="teslaImportCard" key={entry.productId}>
      <div className="teslaImportImage"><img src={item.imageUrl} alt={item.name} width={400} height={300} loading="lazy" decoding="async" referrerPolicy="no-referrer" /></div>
      <div className="teslaImportBody"><StoreLogo store="AliExpress" /><h3>{item.name}</h3><p className="teslaFitClaim">Según el anuncio: {item.sellerClaim}.</p><TeslaPrice observation={observation} renderedAt={renderedAt} /><details className="teslaCompatibility"><summary>Revisar compatibilidad e instalación</summary><p>El vendedor indica: {item.sellerClaim}. Debes comprobar la variante; no es una confirmación de compatibilidad para tu coche.</p>{item.caution && <p className="teslaCaution">{item.caution}</p>}</details><a className="teslaAction" href={entry.originalUrl} target="_blank" rel="sponsored noopener noreferrer" data-tesla-product={entry.productId}>Ver precio y variantes</a></div>
    </article>;
  })}</div></section>;
}
