import Link from "next/link";
import "../legal.css";

export const metadata = { title: "Términos de uso", alternates: { canonical: "/terminos/" } };

export default function Page() {
  return (
    <main className="legalPage">
      <header className="legalHead shell">
        <Link className="brand" href="/"><span className="brandMark">€</span><span>chollos<span>al</span>día</span></Link>
      </header>
      <article className="legalBody shell">
        <h1>Términos de uso</h1>
        <p>Última actualización: 28 de agosto de 2026.</p>
        <div className="notice">Estos términos regulan el uso de Chollos al Día y de Rocky, su herramienta privada para preparar publicaciones de ofertas en redes sociales.</div>
        <h2>Finalidad del servicio</h2>
        <p>Chollos al Día informa sobre ofertas, cupones y promociones de comercios externos. Rocky ayuda al administrador de Chollos al Día a revisar y publicar contenidos en sus propios perfiles sociales. No permite que terceras personas publiquen en cuentas ajenas.</p>
        <h2>Precios, cupones y disponibilidad</h2>
        <p>Los precios, cupones, gastos y existencias dependen de cada comercio y pueden cambiar sin previo aviso. Antes de comprar debes comprobar siempre el precio y las condiciones finales en la tienda.</p>
        <h2>Enlaces externos y afiliación</h2>
        <p>Algunos enlaces son de afiliación. Si realizas una compra mediante ellos, Chollos al Día puede recibir una comisión sin aumentar el precio que pagas. Las compras se formalizan directamente con el comercio correspondiente.</p>
        <h2>Uso de TikTok</h2>
        <p>La conexión con TikTok se utiliza únicamente para que el administrador autorice y gestione publicaciones de Chollos al Día. La autorización puede revocarse desde TikTok. El uso de TikTok también está sujeto a sus propios términos y políticas.</p>
        <h2>Contacto</h2>
        <p>Para consultas sobre estos términos puedes escribir a <a href="mailto:chollosaldia@gmail.com">chollosaldia@gmail.com</a>.</p>
        <p><Link href="/privacidad/">Política de privacidad</Link> · <Link href="/aviso-legal/">Aviso legal</Link></p>
        <p><Link href="/">← Volver a la portada</Link></p>
      </article>
    </main>
  );
}
