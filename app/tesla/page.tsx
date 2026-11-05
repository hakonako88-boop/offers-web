import type { Metadata } from 'next';
import BrandLink from '../components/BrandLink';
import TeslaExplorer from './TeslaExplorer';
import ImportedProducts from './ImportedProducts';
import catalogue from '../../data/tesla-catalogue.json';
import TeslaSeo from './TeslaSeo';
import { teslaGuides } from '../lib/tesla-guides';
import './tesla.css';

export const metadata: Metadata = {
  title: 'Accesorios Tesla Model Y y Model 3: precios, cupones y guías',
  description: 'Selecciona modelo, generación y año de tu Tesla. Guías para revisar accesorios y comparar precios sin confundir variantes.',
  alternates: { canonical: '/tesla/' },
  openGraph: { title: 'Accesorios Tesla Model Y y Model 3', description: 'Precios consultados, cupones por producto y guías de compatibilidad.', url: '/tesla/', images: ['/images/tesla/model-y.webp'] },
};
export default function TeslaPage() {
  return <main className="teslaPage">
    <header className="teslaHeader"><BrandLink /><a href="/">Todas las ofertas</a></header>
    <TeslaSeo title="Accesorios Tesla Model Y y Model 3" />
    <section className="teslaHero teslaMainHero"><div><p>El garaje de Chollos al Día</p><h1>Tu Tesla.<br />Cada detalle cuenta.</h1><p>Accesorios Model Y y Model 3, precios consultados y guías para elegir la variante correcta.</p><div className="teslaHeroActions"><a className="teslaAction" href="#productos-recibidos">Explorar accesorios</a><a href="#vehiculo">Elegir mi Tesla</a></div></div><figure><img src="/images/tesla/model-y.webp" alt="Tesla Model Y Juniper rojo, imagen ilustrativa" width={900} height={600} fetchPriority="high" /><figcaption>Model Y Juniper. Identifica también tu acabado antes de elegir accesorios.</figcaption></figure></section>
    <TeslaExplorer catalogue={catalogue} />
    <ImportedProducts />
    <section className="teslaSection"><h2>Compra con criterio</h2><div className="teslaGuideGrid">{Object.entries(teslaGuides).map(([slug, guide]) => <a href={`/tesla/guias/${slug}/`} key={slug}><h3>{guide.title}</h3><p>{guide.description}</p><span>Leer guía</span></a>)}</div></section>
    <section className="teslaSection"><h2>Amazon o AliExpress: compara el total</h2><p>No basta con una foto parecida. Compara la misma referencia, variante, material y cantidad, con envío e impuestos para España. Las promociones personales no se consideran un precio universal.</p><p>Si falta un coste o la verificación tiene más de 24 horas, no mostramos un ahorro calculado. “Más barato” significa únicamente entre las tiendas comprobadas, nunca en todo Internet.</p></section>
    <section className="teslaSection"><h2>Antes de instalar</h2><p>No recomendamos modificaciones de airbags, cámaras, sensores, pedales o sistemas eléctricos sin asesoramiento profesional. No coloques accesorios que dificulten los mandos o la visión.</p><p>Consulta el <a href="https://www.tesla.com/ownersmanual/modely/es_es/" rel="noopener noreferrer" target="_blank">manual oficial del Model Y</a> y las <a href="https://shop.tesla.com/es_es/category/accesorios" rel="noopener noreferrer" target="_blank">compatibilidades de la tienda Tesla</a>. Las fechas de una ficha no sustituyen la identificación de tu vehículo.</p></section>
    <section className="teslaSection"><h2>Preguntas antes de comprar</h2><details><summary>¿Un accesorio para Model Y sirve para Juniper?</summary><p>No lo damos por hecho. Hace falta una variante identificada y una fuente que confirme tu generación, año y acabado cuando sea relevante.</p></details><details><summary>¿Por qué no aparecen precios en algunos productos?</summary><p>No publicamos cifras sin comprobar variante, envío, impuestos y fecha. Un enlace válido no prueba precio ni disponibilidad.</p></details><details><summary>¿Son accesorios oficiales Tesla?</summary><p>Solo cuando la ficha y su fuente lo indiquen. Chollos al Día es independiente de Tesla.</p></details></section>
    <footer className="teslaSection"><h2>Las ofertas, también en Telegram</h2><p><a className="teslaAction" href="https://t.me/aldiachollos" target="_blank" rel="noopener noreferrer">Unirme a Chollos al Día</a></p><p>Podemos recibir una comisión por enlaces patrocinados. No cambia tu precio. <a href="/afiliacion/">Cómo funciona la afiliación</a>.</p><p>Fotos de los modelos: <a href="https://commons.wikimedia.org/wiki/File:Tesla_Model_3_%27Highland%27_(2024).jpg">Model 3, Mliu92</a> y <a href="https://commons.wikimedia.org/wiki/File:Tesla_Model_Y_Juniper_First_Edition_RWD_Ultra_Red_02.jpg">Model Y, Ethan Llamas</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Redimensionadas y convertidas a WebP; encuadre adaptado. Imágenes ilustrativas de Highland y Juniper, no de todos los acabados.</p></footer>
    <span id="creditos" aria-hidden="true" />
  </main>;
}
