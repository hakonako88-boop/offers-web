"use client";

import { useState } from "react";
import { couponOptions } from "../../scripts/coupon-options.mjs";

export default function CouponCopy({ code, compact = false, discount = 0, minimumSpend = 0 }: { code: string; compact?: boolean; discount?: number; minimumSpend?: number }) {
  const [copied, setCopied] = useState("");
  const { codes, cashback } = couponOptions(code);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("");
    }
  }

  const renderCode = (value: string, index: number) => <button key={value} className={`couponCopy${compact ? " couponCopyCompact" : ""}`} type="button" onClick={() => void copy(value)} aria-label={`Copiar cupón ${value}`}>
      <span>{index ? "ALTERNATIVA" : "CUPÓN"}</span><b>{value}</b><strong aria-live="polite">{copied === value ? "¡COPIADO!" : "COPIAR"}</strong>
    </button>;
  return <div className="couponOptions" aria-label="Cupones de la oferta">
    {codes[0] && renderCode(codes[0], 0)}
    {codes.length > 1 && <details className="couponAlternatives"><summary>Ver {codes.length - 1} {codes.length === 2 ? "código alternativo" : "códigos alternativos"}</summary>{codes.slice(1).map((value: string, index: number) => renderCode(value, index + 1))}</details>}
    {codes.length > 1 && <small>Usa solo uno de estos códigos; no se suman entre sí.</small>}
    {!compact && codes.length > 0 && <small>{codes.length === 1 && discount > 0 && minimumSpend > 0
      ? `Descuento anunciado: ${discount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })} desde ${minimumSpend.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}. Confirma su aplicación en la cesta.`
      : "Comprueba que el código se aplica y confirma el total antes de pagar."}</small>}
    {cashback.length > 0 && <small>Cashback aparte: no es un código ni un descuento inmediato en caja.</small>}
  </div>;
}
