import Link from "next/link";
import "../legal.css";

export const metadata = { title: "Política de privacidad", alternates: { canonical: "/privacidad/" } };

export default function Page() {
  return (
    <main className="legalPage">
      <header className="legalHead shell">
        <Link className="brand" href="/"><span className="brandMark">€</span><span>chollos<span>al</span>día</span></Link>
      </header>
      <article className="legalBody shell">
        <h1>Privacidad</h1>
        <p>Última actualización: 14 de agosto de 2026.</p>
        <div className="notice">La medición de visitas con Google Analytics solo se activa si la persona visitante la acepta. Si se activa publicidad, Google solicitará por separado las preferencias necesarias mediante una plataforma de consentimiento certificada.</div>
        <h2>Datos tratados</h2>
        <p>La web no solicita datos personales directamente. El alojamiento puede tratar datos técnicos mínimos, como dirección IP y registros de seguridad, para servir y proteger el sitio.</p>
        <h2>Medición de visitas</h2>
        <p>Si aceptas la medición, Google Analytics registra datos agregados de uso, como páginas visitadas, dispositivo, procedencia y clics de salida hacia tiendas. Se utiliza para mejorar los contenidos y las ofertas mostradas. Puedes rechazarla; la web seguirá funcionando con normalidad.</p>
        <h2>Publicidad</h2>
        <p>La web puede mostrar anuncios gestionados por Google AdSense. Cuando estén activos, Google y sus proveedores pueden utilizar cookies u otras tecnologías para mostrar, medir y limitar anuncios de acuerdo con las preferencias elegidas. En España y el resto del Espacio Económico Europeo esas preferencias se solicitarán mediante una plataforma de gestión del consentimiento certificada por Google. Rechazar la publicidad personalizada no impide acceder a las ofertas.</p>
        <h2>Enlaces externos</h2>
        <p>Al abrir una oferta accedes a una tienda externa, que aplica su propia política de privacidad y cookies.</p>
        <h2>Tus derechos</h2>
        <p>Para solicitudes de acceso, rectificación o supresión puedes escribir a chollosaldia@gmail.com.</p>
        <p><Link href="/">← Volver a la portada</Link></p>
      </article>
    </main>
  );
}
