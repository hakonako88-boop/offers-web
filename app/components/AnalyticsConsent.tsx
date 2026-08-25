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
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args) => { window.dataLayer?.push(args); };
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  });
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { anonymize_ip: true });
  const viewEvent = window.location.pathname.startsWith("/guias/") || window.location.pathname.startsWith("/gta-vi-")
    ? "guide_view"
    : window.location.pathname.startsWith("/producto/") ? "product_view" : null;
  if (viewEvent && !document.documentElement.dataset.chollosViewTracked) {
    window.gtag("event", viewEvent, { page_path: window.location.pathname });
    document.documentElement.dataset.chollosViewTracked = "true";
  }
  const script = document.createElement("script");
  script.id = "google-analytics-tag";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
}

export default function AnalyticsConsent() {
  const [preference, setPreference] = useState<"granted" | "denied" | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(preferenceKey);
    if (saved === "granted") {
      queueMicrotask(() => setPreference("granted"));
      startAnalytics();
    } else {
      queueMicrotask(() => setPreference(saved === "denied" ? "denied" : null));
    }
    function trackClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest("a");
      if (!link || !window.gtag) return;
      const href = link.getAttribute("href") || "";
      const eventName = href.includes("t.me/aldiachollos")
        ? "telegram_click"
        : link.rel.includes("sponsored") ? "affiliate_click"
          : href.startsWith("/oferta/") ? "offer_click" : null;
      if (eventName) window.gtag("event", eventName, { link_url: link.href, link_text: link.textContent?.trim().slice(0, 100) });
    }
    document.addEventListener("click", trackClick);
    return () => document.removeEventListener("click", trackClick);
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
