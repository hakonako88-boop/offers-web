import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BrandLink from '../../../components/BrandLink';
import { teslaGuides } from '../../../lib/tesla-guides';
import TeslaSeo from '../../TeslaSeo';
import '../../tesla.css';
export function generateStaticParams() { return Object.keys(teslaGuides).map(modelo => ({ modelo })); }
export async function generateMetadata({ params }: { params: Promise<{ modelo: string }> }): Promise<Metadata> {
  const { modelo } = await params; const guide = teslaGuides[modelo];
  return guide ? { title: guide.title, description: guide.description, alternates: { canonical: `/tesla/guias/${modelo}/` }, openGraph: { type: 'article', title: guide.title, description: guide.description, url: `/tesla/guias/${modelo}/`, images: [guide.image] }, twitter: { card: 'summary_large_image', title: guide.title, description: guide.description, images: [guide.image] } } : {};
}
export default async function TeslaGuide({ params }: { params: Promise<{ modelo: string }> }) {
  const { modelo } = await params; const guide = teslaGuides[modelo]; if (!guide) notFound();
  return <main className="teslaPage"><header className="teslaHeader"><BrandLink /><a href="/tesla/">Accesorios Tesla</a></header><TeslaSeo title={guide.title} description={guide.description} image={guide.image} path={`/tesla/guias/${modelo}/`} article /><article>
    <section className="teslaHero teslaGuideHero"><div><p>Guía de compra independiente</p><h1>{guide.title}</h1><p>{guide.intro}</p><a className="teslaAction" href="/tesla/#productos-recibidos">Consultar accesorios y precios</a></div><img src={guide.image} alt="Fotografía ilustrativa de un Tesla; comprueba tu generación y acabado" width={900} height={600} /></section>
    <nav className="teslaSection teslaContents" aria-label="Contenido de la guía">{guide.sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}</nav>
    {guide.sections.map(section => <section className="teslaSection" id={section.id} key={section.id}><h2>{section.title}</h2>{section.text.map(text => <p key={text}>{text}</p>)}{section.source && <a href={section.source} target="_blank" rel="noopener noreferrer">{section.sourceLabel}</a>}</section>)}
    <section className="teslaSection"><h2>Antes de pagar</h2><ol>{guide.checklist.map(item => <li key={item}>{item}</li>)}</ol><a className="teslaAction" href="/tesla/#vehiculo">Elegir mi vehículo</a></section>
    <section className="teslaSection"><h2>Preguntas frecuentes</h2>{guide.faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    <section className="teslaSection"><h2>Sigue comparando</h2><div className="teslaGuideGrid">{Object.entries(teslaGuides).filter(([slug]) => slug !== modelo).map(([slug, related]) => <a href={`/tesla/guias/${slug}/`} key={slug}><h3>{related.title}</h3><p>{related.description}</p></a>)}</div><p>Revisión editorial: 5 de noviembre de 2026. No se han realizado ensayos físicos propios. Fotos ilustrativas; <a href="/tesla/#creditos">créditos y licencia</a>.</p><a href="https://t.me/aldiachollos" target="_blank" rel="noopener noreferrer">Seguir Chollos al Día en Telegram</a></section>
  </article></main>;
}
