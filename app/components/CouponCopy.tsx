"use client";

import { useState } from "react";

export default function CouponCopy({ code, compact = false, discount = 0, minimumSpend = 0 }: { code: string; compact?: boolean; discount?: number; minimumSpend?: number }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return <button className={`couponCopy${compact ? " couponCopyCompact" : ""}`} type="button" onClick={copy} aria-label={`Copiar cupón ${code}`}>
    <span>CUPÓN</span><b>{code}</b><strong aria-live="polite">{copied ? "¡COPIADO!" : "COPIAR"}</strong>
    {!compact && <small>{discount > 0 && minimumSpend > 0
      ? `Descuenta ${discount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })} en pedidos desde ${minimumSpend.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}. El precio mostrado ya incluye el cupón.`
      : "Úsalo en el carrito si continúa disponible. Comprueba el precio final antes de pagar."}</small>}
  </button>;
}
