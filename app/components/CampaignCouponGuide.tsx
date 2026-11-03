"use client";

import { useState } from "react";
import { ALIEXPRESS_11_COUPONS, ALIEXPRESS_11_LIMITED_COUPONS } from "../../scripts/aliexpress-11-11-data.mjs";

type Coupon = { code: string; alternative: string; discount: number; minimum: number };

export default function CampaignCouponGuide({ affiliateUrl, imageUrl }: { affiliateUrl?: string; imageUrl: string }) {
  const [copied, setCopied] = useState("");
  const [notice, setNotice] = useState("");
  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setNotice(`Código ${code} copiado. Pégalo en el carrito de AliExpress.`);
    } catch {
      setNotice(`No se pudo copiar automáticamente. Mantén pulsado el código ${code} para copiarlo.`);
    }
  }
  function card(coupon: Coupon, limited = false) {
    return <article key={coupon.code} className={`campaignCouponCard${limited ? " campaignCouponCardLimited" : ""}`}>
      <div className="campaignCouponSaving"><span>DESCUENTO</span><strong>{coupon.discount}<small> €</small></strong><p>en compras desde <b>{coupon.minimum} €</b></p></div>
      <div className="campaignCouponCodes"><button type="button" onClick={() => void copy(coupon.code)} aria-label={`Copiar cupón ${coupon.code}`}><code>{coupon.code}</code><span>{copied === coupon.code ? "✓ Copiado" : "Copiar código"}</span></button>
        {coupon.alternative && <button className="campaignCouponAlternative" type="button" onClick={() => void copy(coupon.alternative)} aria-label={`Copiar código alternativo ${coupon.alternative}`}><small>O usa</small><code>{coupon.alternative}</code><span>{copied === coupon.alternative ? "✓" : "Copiar"}</span></button>}
      </div>
      <p className="campaignCouponDates">{limited ? "Solo 1–3 y 11–12 de noviembre de 2026" : "Fechas anunciadas: 1–18 noviembre de 2026"}</p>
    </article>;
  }
  return <div className="campaignCouponGuide">
    <div className="campaignCouponIntro"><div><span className="campaignCouponEyebrow">ESPAÑA · NOVIEMBRE 2026</span><h2>El cupón correcto,<br />sin buscar entre párrafos.</h2><p>Busca el mínimo que cumple tu compra, copia <strong>un código</strong> y confirma el descuento en el carrito.</p><a href="#cupones-1111">Ir a los cupones ↓</a></div><img src={imageUrl} alt="Especial 11.11 AliExpress 2026 de Chollos al Día" width={1200} height={800} /></div>
    <div className="campaignCouponRules" aria-label="Condiciones esenciales"><p><b>01 · Compra mínima</b><span>Debe cumplirla el subtotal elegible de tu pedido.</span></p><p><b>02 · Solo un código</b><span>Los códigos alternativos no se suman entre sí.</span></p><p><b>03 · Comprueba el total</b><span>Disponibilidad y aceptación dependen de AliExpress.</span></p></div>
    <section id="cupones-1111" aria-labelledby="coupon-list-title"><div className="campaignCouponSectionTitle"><div><span>CUPONES POR IMPORTE DE COMPRA</span><h2 id="coupon-list-title">Elige tu descuento</h2></div><p>Los dos códigos de cada tarjeta son <strong>alternativas</strong>. Copia uno, no los dos.</p></div><div className="campaignCouponGrid">{ALIEXPRESS_11_COUPONS.map((coupon) => card(coupon))}</div></section>
    <section className="campaignCouponLimitedSection" aria-labelledby="limited-coupon-title"><div className="campaignCouponSectionTitle"><div><span>ATENCIÓN A LAS FECHAS</span><h2 id="limited-coupon-title">Los cupones grandes van aparte</h2></div><p><strong>Solo 1–3 y 11–12 de noviembre.</strong> No están anunciados para todos los días de la campaña.</p></div><div className="campaignCouponGrid">{ALIEXPRESS_11_LIMITED_COUPONS.map((coupon) => card(coupon, true))}</div></section>
    <div className="campaignCouponNotice" role="note"><b>Importante antes de pagar</b><p>Son códigos anunciados para pedidos elegibles con destino a España, sujetos a disponibilidad y productos participantes. Pueden agotarse o resultar incompatibles con otras promociones. <strong>No contamos ventajas personales ni de PayPal si no aparecen aplicadas en tu cuenta.</strong></p></div>
    <div className="campaignCouponCheckout"><div><span>EL ÚLTIMO PASO ES EL QUE CUENTA</span><h2>Confirma el precio final.</h2><p>Si el descuento no aparece en el carrito, no des por hecho que se aplicará después.</p></div>{affiliateUrl && <a href={affiliateUrl} target="_blank" rel="nofollow sponsored noreferrer">Abrir AliExpress <span aria-hidden="true">↗</span></a>}</div>
    <p className="campaignCouponCopyStatus" role="status" aria-live="polite">{notice || "Toca un código para copiarlo. Su aceptación se comprueba al tramitar el pedido."}</p>
  </div>;
}
