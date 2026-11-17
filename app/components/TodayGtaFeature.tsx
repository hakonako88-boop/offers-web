"use client";

import { useEffect, useState } from "react";

const startsAt = Date.parse("2026-11-17T00:00:00+01:00");
const endsAt = Date.parse("2026-11-18T00:00:00+01:00");

export default function TodayGtaFeature() {
  const [visible, setVisible] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  useEffect(() => {
    const now = Date.now();
    if (now < startsAt || now >= endsAt) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), endsAt - now);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <aside aria-label="Destacado de hoy" style={{ maxWidth: "76rem", margin: "0.75rem auto", padding: "0 1rem" }}>
      <div style={{ background: "#063c37", color: "#fff", borderRadius: "1rem", padding: "1rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <img src="https://ae-pic-a1.aliexpress-media.com/kf/E5fe89577962c4d739b12a3fae8d68d30K.png" width="84" height="84" alt="Portada de GTA VI para PS5" style={{ objectFit: "contain", borderRadius: "0.5rem", background: "#fff" }} />
        <div style={{ flex: "1 1 13rem" }}>
          <small style={{ color: "#ffbb72", fontWeight: 800 }}>DESTACADO DE HOY · ALIEXPRESS</small>
          <h2 style={{ color: "inherit", margin: "0.15rem 0", fontSize: "clamp(1.15rem,3vw,1.65rem)" }}>GTA VI para PS5 · Edición Estándar</h2>
          <p style={{ margin: 0 }}><strong style={{ color: "#ffbb72", fontSize: "1.25rem" }}>54,10 € con cupón</strong> · <code>IFPYJKWQ</code></p>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.55rem", margin: "0.55rem 0" }}>
            <code style={{ color: "#18231e", background: "#fff", borderRadius: "0.4rem", padding: "0.35rem 0.55rem", fontWeight: 800, userSelect: "all" }}>IFPYJKWQ</code>
            <button type="button" onClick={async () => {
              try {
                await navigator.clipboard.writeText("IFPYJKWQ");
                setCopyStatus("Cupón copiado");
              } catch {
                setCopyStatus("Selecciona el código para copiarlo manualmente");
              }
            }}>Copiar cupón</button>
            <span role="status">{copyStatus}</span>
          </div>
          <p style={{ margin: 0 }}>Copia el código, abre AliExpress y pégalo en la cesta. Comprueba que el total baje a 54,10 € antes de pagar.</p>
          <p style={{ margin: 0 }}>Edición Estándar: caja con código de descarga, sin disco. La precarga no permite jugar antes del lanzamiento.</p>
        </div>
        <a href="https://s.click.aliexpress.com/e/_EI7SCxM" rel="sponsored noopener noreferrer" target="_blank" style={{ background: "#ffbb72", color: "#19201c", padding: "0.65rem 0.9rem", borderRadius: "0.55rem", fontWeight: 800 }}>Ver en AliExpress</a>
      </div>
    </aside>
  );
}
