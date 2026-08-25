"use client";

import { useState } from "react";

export default function CouponCopy({ code, compact = false }: { code: string; compact?: boolean }) {
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
    {!compact && <small>Úsalo en el carrito si continúa disponible.</small>}
  </button>;
}
