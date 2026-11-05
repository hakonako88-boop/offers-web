"use client";

import { useState } from "react";
import { couponOptions, isCollectableCoupon } from "../../scripts/coupon-options.mjs";

export default function CouponCopy({ code, compact = false, discount = 0, minimumSpend = 0 }: { code: string; compact?: boolean; discount?: number; minimumSpend?: number }) {
  const [copied, setCopied] = useState("");
  const [copyFailed, setCopyFailed] = useState("");
  const { codes, cashback } = couponOptions(code);

  async function copy(value: string) {
    setCopyFailed("");
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("");
      setCopyFailed(value);
    }
  }

  const renderCode = (value: string, index: number) => <button key={value} className={`couponCopy${compact ? " couponCopyCompact" : ""}`} type="button" onClick={() => void copy(value)} aria-label={`Copiar cupón ${value}`}>
      <span>{index ? "ALTERNATIVA" : "CUPÓN"}</span><b>{value}</b><strong aria-live="polite">{copied === value ? "¡COPIADO!" : "COPIAR"}</strong>
    </button>;
  if (isCollectableCoupon(code)) return <div className="couponOptions couponCollectable" aria-label="Cupón para recoger en la tienda"><b>🎟 {compact ? `Cupón${code.match(/\d+(?:[.,]\d+)?\s*€/u)?.[0] ? ` de ${code.match(/\d+(?:[.,]\d+)?\s*€/u)?.[0]}` : ' en ficha'}` : 'Cupón para recoger'}</b><p>{compact ? 'Recógelo en la ficha antes de pagar.' : code}</p>{!compact && <small>No hay un código para copiar. Recoge el cupón en la ficha y confirma que se aplica en el resumen de compra.</small>}</div>;
  return <div className="couponOptions" aria-label="Cupones de la oferta">
    {codes[0] && renderCode(codes[0], 0)}
    {copyFailed && <p className="couponCopyFailure" role="status">No se ha podido copiar automáticamente. Selecciona este código y cópialo: <code tabIndex={0}>{copyFailed}</code></p>}
    {codes.length > 1 && <details className="couponAlternatives"><summary>Ver {codes.length - 1} {codes.length === 2 ? "código alternativo" : "códigos alternativos"}</summary>{codes.slice(1).map((value: string, index: number) => renderCode(value, index + 1))}</details>}
    {codes.length > 1 && <small>Usa solo uno de estos códigos; no se suman entre sí.</small>}
    {!compact && codes.length > 0 && <small>{codes.length === 1 && discount > 0 && minimumSpend > 0
      ? `Descuento anunciado: ${discount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })} desde ${minimumSpend.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}. Confirma su aplicación en la cesta.`
      : "Comprueba que el código se aplica y confirma el total antes de pagar."}</small>}
    {cashback.length > 0 && <small>Cashback aparte: no es un código ni un descuento inmediato en caja.</small>}
  </div>;
}
