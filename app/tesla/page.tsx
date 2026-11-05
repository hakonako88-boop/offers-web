import type { Metadata } from 'next';
import BrandLink from '../components/BrandLink';
import TeslaExplorer from './TeslaExplorer';
import ImportedProducts from './ImportedProducts';
import catalogue from '../../data/tesla-catalogue.json';
import './tesla.css';

export const metadata: Metadata = {
  title: 'Accesorios Tesla Model 3 y Model Y: compatibilidad y compra',
  description: 'Selecciona modelo, generación y año de tu Tesla. Guías para revisar accesorios y comparar precios sin confundir variantes.',
  alternates: { canonical: '/tesla/' },
};
export default function TeslaPage() {
  return <main className="teslaPage">
    <header className="teslaHeader"><BrandLink /><a href="/">Todas las ofertas</a></header>
    <section className="teslaHero"><p>Elige bien antes de comprar</p><h1>Accesorios para tu Tesla.<br />No para cualquier Tesla.</h1><p>Encuentra tu generación y comprueba la variante antes de comparar precios.</p><a className="teslaAction" href="#vehiculo">Seleccionar mi Tesla</a></section>
    <TeslaExplorer catalogue={catalogue} />
    <ImportedProducts />
    <section className="teslaSection"><h2>Dos modelos, distintas decisiones</h2><div className="teslaGuideGrid">
      <a href="/tesla/guias/model-3/"><h3>Model 3: original y Highland</h3><p>Qué comprobar en pantalla, consola y alfombrillas antes de comprar.</p></a>
      <a href="/tesla/guias/model-y/"><h3>Model Y: original y Juniper</h3><p>Organización, protección y viajes sin confundir generaciones.</p></a>
    </div></section>
    <section className="teslaSection"><h2>Amazon o AliExpress: compara el total</h2><p>No basta con una foto parecida. Compara la misma referencia, variante, material y cantidad, con envío e impuestos para España. Las promociones personales no se consideran un precio universal.</p><p>Si falta un coste o la verificación tiene más de 24 horas, no mostramos un ahorro calculado. “Más barato” significa únicamente entre las tiendas comprobadas, nunca en todo Internet.</p></section>
    <section className="teslaSection"><h2>Antes de instalar</h2><p>No recomendamos modificaciones de airbags, cámaras, sensores, pedales o sistemas eléctricos sin asesoramiento profesional. No coloques accesorios que dificulten los mandos o la visión.</p><p>Consulta el <a href="https://www.tesla.com/ownersmanual/modely/es_es/" rel="noopener noreferrer" target="_blank">manual oficial del Model Y</a> y las <a href="https://shop.tesla.com/es_es/category/accesorios" rel="noopener noreferrer" target="_blank">compatibilidades de la tienda Tesla</a>. Las fechas de una ficha no sustituyen la identificación de tu vehículo.</p></section>
    <section className="teslaSection"><h2>Preguntas antes de comprar</h2><details><summary>¿Un accesorio para Model Y sirve para Juniper?</summary><p>No lo damos por hecho. Hace falta una variante identificada y una fuente que confirme tu generación, año y acabado cuando sea relevante.</p></details><details><summary>¿Por qué no aparecen precios en algunos productos?</summary><p>No publicamos cifras sin comprobar variante, envío, impuestos y fecha. Un enlace válido no prueba precio ni disponibilidad.</p></details><details><summary>¿Son accesorios oficiales Tesla?</summary><p>Solo cuando la ficha y su fuente lo indiquen. Chollos al Día es independiente de Tesla.</p></details></section>
    <footer className="teslaSection"><h2>Las ofertas, también en Telegram</h2><p><a className="teslaAction" href="https://t.me/aldiachollos" target="_blank" rel="noopener noreferrer">Unirme a Chollos al Día</a></p><p>Podemos recibir una comisión por enlaces patrocinados. No cambia tu precio. <a href="/afiliacion/">Cómo funciona la afiliación</a>.</p><p>Fotos de los modelos: <a href="https://commons.wikimedia.org/wiki/File:Tesla_Model_3_%27Highland%27_(2024).jpg">Model 3, Mliu92</a> y <a href="https://commons.wikimedia.org/wiki/File:Tesla_Model_Y_Juniper_First_Edition_RWD_Ultra_Red_02.jpg">Model Y, Ethan Llamas</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Redimensionadas y convertidas a WebP; encuadre adaptado. Imágenes ilustrativas de Highland y Juniper, no de todos los acabados.</p></footer>
  </main>;
}
