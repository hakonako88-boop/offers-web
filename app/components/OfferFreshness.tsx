"use client";

import { useEffect, useState } from "react";
import { offerFreshness } from "../../scripts/offer-freshness.mjs";

export default function OfferFreshness({ date, fallback }: { date?: string; fallback: string }) {
  // Identical server/client first render; static exports must not freeze age.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const valid = date && Number.isFinite(Date.parse(date));
  if (!valid) return <span>{fallback}</span>;
  const exact = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", dateStyle: "long", timeStyle: "short" }).format(new Date(date));
  return <time className="offerFreshness" dateTime={date} title={`Publicada el ${exact} (hora de Madrid)`}>{now === null ? fallback : offerFreshness(date, now) || fallback}</time>;
}
