import data from '../../data/tesla-amazon-observations.json';
import config from '../../data/tesla-discovery-config.json';
import StoreLogo from '../components/StoreLogo';
type AmazonReference = { productId: string; originalUrl: string; checkedAt: string | null; editorialCategory: string; manualReview?: boolean };
export default function AmazonProducts() {
  const items = data.items as AmazonReference[];
  return <section className="teslaSection" id="amazon"><div className="teslaSectionHeading"><div><p>Accesorios y referencias seleccionadas</p><h2>Tesla en Amazon.es</h2></div><a href="/tesla/guias/model-3/">Elegir según tu modelo</a></div><p>Consulta la foto, el precio y la disponibilidad directamente en Amazon y comprueba la variante antes de comprar.</p>
    {items.length ? <div className="teslaGuideGrid">{items.map(item => {
      const reviewed = config.reviewedAmazon.find(row => row.asin === item.productId);
      return <article className="teslaAmazonReference" key={item.productId}><StoreLogo store="Amazon" /><h3>{reviewed?.name || item.editorialCategory}</h3><p>Referencia {item.productId}. Comprueba el producto y la variante en la ficha; su aparición no confirma compatibilidad con tu vehículo.</p>{reviewed?.caution && <p className="teslaCaution">{reviewed.caution}</p>}<a className="teslaAction" href={item.originalUrl} target="_blank" rel="sponsored noopener noreferrer" data-tesla-product={item.productId}>Ver foto y precio en Amazon</a></article>;
    })}</div> : <div className="teslaEmpty"><h3>Amazon: conexión en comprobación</h3><p>No se han recibido referencias publicables de la API en esta consulta. AliExpress sigue funcionando de forma independiente.</p></div>}
  </section>;
}
