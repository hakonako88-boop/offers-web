import Link from "next/link";
import "../legal.css";

export const metadata = { title: "Aviso legal", alternates: { canonical: "/aviso-legal/" } };

export default function Page() {
  return <main className="legalPage"><header className="legalHead shell"><Link className="brand" href="/"><span className="brandMark">€</span><span>chollos<span>al</span>día</span></Link></header><article className="legalBody shell"><h1>Aviso legal</h1><p>Última actualización: 11 de agosto de 2026.</p><div className="notice">Completa esta página con el nombre o razón social, NIF/CIF, domicilio y correo de contacto del titular antes de publicar con dominio propio.</div><h2>Objeto</h2><p>Chollos al Día ofrece información sobre promociones, cupones y descuentos de terceros. No vende directamente los productos mostrados ni interviene en el contrato de compraventa.</p><h2>Precios y disponibilidad</h2><p>Las tiendas pueden modificar precios, gastos, cupones y existencias en cualquier momento. Comprueba siempre las condiciones finales en la tienda antes de comprar.</p><h2>Responsabilidad</h2><p>Se procura mantener la información actualizada, pero no se garantiza la disponibilidad permanente ni la ausencia de errores.</p><p><Link href="/">← Volver a la portada</Link></p></article></main>;
}
