import type { Metadata } from 'next';
import BrandLink from '../../components/BrandLink';
import CatalogueDraft from './CatalogueDraft';
import '../tesla.css';
export const metadata: Metadata = { title: 'Borrador del catálogo Tesla', robots: { index: false, follow: false } };
export default function TeslaManagement() {
  return <main className="teslaPage"><header className="teslaHeader"><BrandLink /><a href="/tesla/">Volver a Tesla</a></header><section className="teslaHero"><h1>Prepara el catálogo, sin publicar por accidente.</h1><p>Herramienta local de borrador. No escribe en GitHub, no actualiza producción y no contiene credenciales.</p></section><section className="teslaSection"><h2>Importar, revisar y descargar</h2><p>Edita productos, variantes, compatibilidades, ofertas y fuentes en el JSON. Descarga el borrador validado para revisión técnica; la descarga no publica cambios.</p><CatalogueDraft /></section></main>;
}
