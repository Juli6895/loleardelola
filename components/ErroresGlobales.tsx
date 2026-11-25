"use client";

import { useEffect } from "react";
import { anotar } from "@/lib/use-evento";

/**
 * Cualquier error que la página tenga en el navegador de alguien (un
 * botón que falla, algo que no carga) queda anotado con la página donde
 * pasó y el mensaje, para verlo en el tablero. Como mucho 5 por visita,
 * y el mismo error una sola vez.
 */
// Errores que no son de la página y no se pueden arreglar aquí:
// - "Object Not Found Matching Id": el revisor de enlaces de Outlook (un
//   robot, no una persona) al abrir un enlace mandado por correo.
// - "Script error.": un script de otro sitio (una extensión del navegador)
//   que no deja ver el detalle.
const NO_ES_DE_LA_APP = [/Object Not Found Matching Id/i, /^Script error\.?$/i];

export default function ErroresGlobales() {
  useEffect(() => {
    const vistos = new Set<string>();
    const anotarError = (motivo: string) => {
      const clave = motivo.slice(0, 120);
      if (!clave || vistos.has(clave) || vistos.size >= 5) return;
      if (NO_ES_DE_LA_APP.some((re) => re.test(clave))) return;
      vistos.add(clave);
      anotar("pagina_error", { ruta: window.location.pathname, motivo: clave });
    };
    const alError = (e: ErrorEvent) => anotarError(e.message || String(e.error ?? ""));
    const alRechazo = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      anotarError(r instanceof Error ? `${r.name}: ${r.message}` : String(r ?? ""));
    };
    window.addEventListener("error", alError);
    window.addEventListener("unhandledrejection", alRechazo);
    return () => {
      window.removeEventListener("error", alError);
      window.removeEventListener("unhandledrejection", alRechazo);
    };
  }, []);
  return null;
}
