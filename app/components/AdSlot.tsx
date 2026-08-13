"use client";

import { useEffect } from "react";
import { adsenseClientId } from "../lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

type AdSlotProps = {
  slot: string;
  placement?: "content" | "offer";
};

export default function AdSlot({ slot, placement = "content" }: AdSlotProps) {
  const configured = Boolean(adsenseClientId && /^\d+$/.test(slot));

  useEffect(() => {
    if (!configured) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // Consent, blockers or a temporary network failure must never break the page.
    }
  }, [configured, slot]);

  if (!configured) return null;

  return (
    <aside className={`adPlacement adPlacement--${placement}`} aria-label="Publicidad">
      <span>Publicidad</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adsenseClientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
