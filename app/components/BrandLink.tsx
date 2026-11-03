/** A plain anchor deliberately works with static hosting, without client routing. */
export default function BrandLink() {
  return <a className="brand brandUnified" href="/" aria-label="Chollos al Día, inicio" title="Volver a la página de inicio">
    <img className="brandSymbol" src="/brand-mark-2026.svg" width={42} height={42} alt="" aria-hidden="true" />
    <span className="brandWordmark"><strong>Chollos</strong><small>al Día</small></span>
  </a>;
}
