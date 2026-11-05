export default function TeslaSeo({ title, path = '/tesla/', article = false }: { title: string; path?: string; article?: boolean }) {
  const crumbs = [{ name: 'Inicio', item: 'https://chollosaldia.com/' }, { name: 'Accesorios Tesla', item: 'https://chollosaldia.com/tesla/' }, ...(path !== '/tesla/' ? [{ name: title, item: `https://chollosaldia.com${path}` }] : [])];
  const graph = [
    { '@type': 'BreadcrumbList', itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })) },
    { '@type': article ? 'Article' : 'CollectionPage', name: title, ...(article ? { headline: title, datePublished: '2026-11-05', dateModified: '2026-11-05', author: { '@type': 'Organization', name: 'Chollos al Día', url: 'https://chollosaldia.com/' } } : {}), inLanguage: 'es-ES', url: `https://chollosaldia.com${path}`, publisher: { '@type': 'Organization', name: 'Chollos al Día', url: 'https://chollosaldia.com/' } },
  ];
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c') }} /><nav className="teslaBreadcrumbs" aria-label="Ruta de navegación">{crumbs.map((crumb, index) => index === crumbs.length - 1 ? <span aria-current="page" key={crumb.item}>{crumb.name}</span> : <a key={crumb.item} href={crumb.item}>{crumb.name}</a>)}</nav></>;
}
