import type { Metadata } from 'next';
import BrandLink from '../components/BrandLink';
import TeslaExplorer from './TeslaExplorer';
import ImportedProducts from './ImportedProducts';
import AmazonProducts from './AmazonProducts';
import TeslaDaily from './TeslaDaily';
import catalogue from '../../data/tesla-catalogue.json';
import TeslaSeo from './TeslaSeo';
import { teslaGuides } from '../lib/tesla-guides';
import './tesla.css';
import './tesla-design.css';

export const metadata: Metadata = {
  title: 'Accesorios Tesla Model Y y Model 3: ofertas y guías',
  description: 'Ofertas de accesorios Tesla Model Y y Model 3 en España. Compara precios consultados, cupones y guías de Juniper, Highland, alfombrillas y organizadores.',
  alternates: { canonical: '/tesla/' },
  twitter: { card: 'summary_large_image', title: 'Accesorios Tesla Model Y y Model 3: ofertas y guías', description: 'Guías de compatibilidad y precios consultados para España.', images: ['/images/tesla/model-y.webp'] },
  openGraph: { title: 'Accesorios Tesla Model Y y Model 3', description: 'Precios consultados, cupones por producto y guías de compatibilidad.', url: '/tesla/', images: ['/images/tesla/model-y.webp'] },
};
export default function TeslaPage() {
  return <main className="teslaPage">
    <header className="teslaHeader"><BrandLink /><a href="/">Todas las ofertas</a></header>
    <TeslaSeo title="Accesorios Tesla Model Y y Model 3" />
    <section className="teslaHero teslaMainHero"><div><p className="teslaEyebrow"><span />EL GARAJE · CHOLLOS AL DÍA</p><h1>Tu Tesla.<br /><em>Más a tu medida.</em><span className="teslaSeoSubtitle">Accesorios Tesla Model 3 y Model Y</span></h1><p>Detalles que cambian tu día a día. Descubre accesorios, compara precios consultados y elige la variante de tu Model 3 o Model Y.</p><div className="teslaHeroActions"><a className="teslaAction" href="#ofertas-hoy">Descubrir ofertas de hoy <span aria-hidden="true">↗</span></a><a className="teslaHeroSecondary" href="#vehiculo">Encontrar mi modelo <span aria-hidden="true">↓</span></a></div><div className="teslaHeroTags"><span>MODEL 3 / HIGHLAND</span><span>MODEL Y / JUNIPER</span></div></div><figure><div className="teslaHeroPhoto"><img src="/images/tesla/model-y.webp" alt="Tesla Model Y Juniper rojo, imagen ilustrativa" width={900} height={600} fetchPriority="high" /><span className="teslaPhotoLabel">01 / MODEL Y JUNIPER</span></div><figcaption>Imagen ilustrativa. Comprueba generación y acabado antes de comprar.</figcaption></figure></section>
    <nav className="teslaQuickNav" aria-label="Explorar el garaje Tesla"><a href="#ofertas-hoy"><span>01</span> Ofertas de hoy <b aria-hidden="true">↗</b></a><a href="#vehiculo"><span>02</span> Tu modelo <b aria-hidden="true">↗</b></a><a href="#productos-recibidos"><span>03</span> Accesorios <b aria-hidden="true">↗</b></a><a href="#amazon"><span>04</span> Cargadores en Amazon <b aria-hidden="true">↗</b></a></nav>
    <TeslaDaily renderedAt={Date.now()} />
    <TeslaExplorer catalogue={catalogue} />
    <ImportedProducts />
    <AmazonProducts />
    <section className="teslaSection"><h2>Compra con criterio</h2><div className="teslaGuideGrid">{Object.entries(teslaGuides).map(([slug, guide]) => <a href={`/tesla/guias/${slug}/`} key={slug}><h3>{guide.title}</h3><p>{guide.description}</p><span>Leer guía</span></a>)}</div></section>
    <section className="teslaSection"><h2>Amazon o AliExpress: compara el total</h2><p>No basta con una foto parecida. Compara la misma referencia, variante, material y cantidad, con envío e impuestos para España. Las promociones personales no se consideran un precio universal.</p><p>Si falta un coste o la verificación tiene más de 24 horas, no mostramos un ahorro calculado. “Más barato” significa únicamente entre las tiendas comprobadas, nunca en todo Internet.</p></section>
    <section className="teslaSection"><h2>Antes de instalar</h2><p>No recomendamos modificaciones de airbags, cámaras, sensores, pedales o sistemas eléctricos sin asesoramiento profesional. No coloques accesorios que dificulten los mandos o la visión.</p><p>Consulta el <a href="https://www.tesla.com/ownersmanual/modely/es_es/" rel="noopener noreferrer" target="_blank">manual oficial del Model Y</a> y las <a href="https://shop.tesla.com/es_es/category/accesorios" rel="noopener noreferrer" target="_blank">compatibilidades de la tienda Tesla</a>. Las fechas de una ficha no sustituyen la identificación de tu vehículo.</p></section>
    <section className="teslaSection"><h2>Preguntas antes de comprar</h2><details><summary>¿Un accesorio para Model Y sirve para Juniper?</summary><p>No lo damos por hecho. Hace falta una variante identificada y una fuente que confirme tu generación, año y acabado cuando sea relevante.</p></details><details><summary>¿Por qué no aparecen precios en algunos productos?</summary><p>No publicamos cifras sin comprobar variante, envío, impuestos y fecha. Un enlace válido no prueba precio ni disponibilidad.</p></details><details><summary>¿Son accesorios oficiales Tesla?</summary><p>Solo cuando la ficha y su fuente lo indiquen. Chollos al Día es independiente de Tesla.</p></details></section>
    <footer className="teslaSection"><h2>Las ofertas, también en Telegram</h2><p><a className="teslaAction" href="https://t.me/aldiachollos" target="_blank" rel="noopener noreferrer">Unirme a Chollos al Día</a></p><p>Podemos recibir una comisión por enlaces patrocinados. No cambia tu precio. <a href="/afiliacion/">Cómo funciona la afiliación</a>.</p><p>Fotos de los modelos: <a href="https://commons.wikimedia.org/wiki/File:Tesla_Model_3_%27Highland%27_(2024).jpg">Model 3, Mliu92</a> y <a href="https://commons.wikimedia.org/wiki/File:Tesla_Model_Y_Juniper_First_Edition_RWD_Ultra_Red_02.jpg">Model Y, Ethan Llamas</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Redimensionadas y convertidas a WebP; encuadre adaptado. Imágenes ilustrativas de Highland y Juniper, no de todos los acabados.</p></footer>
    <span id="creditos" aria-hidden="true" />
  </main>;
}
