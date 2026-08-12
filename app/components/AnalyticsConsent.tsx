"use client";

import { useEffect, useState } from "react";

const measurementId = "G-QWCTJ2MQZQ";
const preferenceKey = "chollosaldia-analytics-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function startAnalytics() {
  if (document.getElementById("google-analytics-tag")) return;
  const script = document.createElement("script");
  script.id = "google-analytics-tag";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.onload = () => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args) => { window.dataLayer?.push(args); };
    window.gtag("js", new Date());
    window.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted",
    });
    window.gtag("config", measurementId, { anonymize_ip: true });
  };
  document.head.appendChild(script);
}

export default function AnalyticsConsent() {
  const [preference, setPreference] = useState<"granted" | "denied" | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(preferenceKey);
    if (saved === "granted") {
      setPreference("granted");
      startAnalytics();
    } else {
      setPreference(saved === "denied" ? "denied" : null);
    }
  }, []);

  function choose(value: "granted" | "denied") {
    window.localStorage.setItem(preferenceKey, value);
    setPreference(value);
    if (value === "granted") startAnalytics();
  }

  if (preference !== null) return null;
  return (
    <aside className="analyticsConsent" aria-label="Preferencia de medición">
      <div>
        <strong>¿Nos ayudas a mejorar Chollos al Día?</strong>
        <p>Usamos Google Analytics para saber qué ofertas y páginas resultan más útiles. No activamos medición hasta que lo aceptes.</p>
      </div>
      <div className="analyticsConsentActions">
        <a href="/privacidad">Saber más</a>
        <button type="button" onClick={() => choose("denied")}>Rechazar</button>
        <button className="analyticsAccept" type="button" onClick={() => choose("granted")}>Aceptar medición</button>
      </div>
    </aside>
  );
}
