'use client';
import { useState } from 'react';
import catalogue from '../../../data/tesla-catalogue.json';
import { validateCatalogue } from '../../../scripts/tesla-catalogue.mjs';
export default function CatalogueDraft() {
  const [text, setText] = useState(JSON.stringify(catalogue, null, 2));
  const [status, setStatus] = useState('');
  function download() {
    try {
      const candidate = JSON.parse(text); const errors = validateCatalogue(candidate);
      // Initial owner-provided URLs cannot be removed or rewritten by the draft editor.
      if (!catalogue.imports.every(entry => candidate.imports?.some((item: { originalUrl?: string }) => item.originalUrl === entry.originalUrl))) errors.push('Conserva íntegros los diez enlaces originales.');
      if (errors.length) { setStatus(errors.join('. ')); return; }
      const url = URL.createObjectURL(new Blob([JSON.stringify(candidate, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'tesla-catalogue-draft.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('Borrador validado y preparado para descargar. No se ha publicado ni guardado en el servidor.');
    } catch { setStatus('JSON inválido. Corrige el formato antes de descargar.'); }
  }
  return <><label>Importar un archivo JSON<input type="file" accept="application/json,.json" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 1_000_000) { setStatus('El archivo supera 1 MB.'); return; } setText(await file.text()); setStatus('Archivo cargado solo en este navegador.'); }} /></label><label>Contenido del borrador<textarea spellCheck={false} value={text} onChange={e => setText(e.target.value)} /></label><button type="button" onClick={download}>Validar y descargar borrador</button><p role="status">{status}</p></>;
}
