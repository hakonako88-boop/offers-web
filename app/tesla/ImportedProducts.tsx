import catalogue from '../../data/tesla-catalogue.json';
import details from '../../data/tesla-import-details.json';
import StoreLogo from '../components/StoreLogo';
export default function ImportedProducts() {
  return <section className="teslaSection" id="productos-recibidos"><h2>Los accesorios que nos has enviado</h2><p>Fotos y datos de las fichas de AliExpress. Referencias en revisión, no resultados compatibles con el vehículo elegido arriba. Comprueba la variante antes de comprar.</p><div className="teslaImportGrid">{catalogue.imports.map(entry => {
    const item = details.items.find(item => item.productId === entry.productId); if (!item) return null;
    return <article className="teslaImportCard" key={entry.productId}>
      <div className="teslaImportImage"><img src={item.imageUrl} alt={item.name} width={400} height={300} loading="lazy" decoding="async" referrerPolicy="no-referrer" /></div>
      <div className="teslaImportBody"><StoreLogo store="AliExpress" /><h3>{item.name}</h3><p>El anuncio menciona: {item.sellerClaim}. No es una compatibilidad confirmada.</p><span className="teslaPending">Compatibilidad pendiente de verificar</span><strong className="teslaPendingPrice">Precio pendiente de comprobar</strong>{item.caution && <p className="teslaCaution">{item.caution}</p>}<a className="teslaAction" href={entry.originalUrl} target="_blank" rel="sponsored noopener noreferrer">Ver ficha y variantes</a><small>Datos e imagen de ficha consultados el 5 de noviembre de 2026. Confirma precio y disponibilidad en la tienda.</small></div>
    </article>;
  })}</div></section>;
}
