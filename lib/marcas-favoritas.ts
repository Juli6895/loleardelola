"use client";

import { useEffect, useState } from "react";

// =====================================================================
// Mis marcas: las que cada quien escoge en el menú
// =====================================================================
// Si escogió alguna, en las PROMOCIONES solo le salen esas. En lo demás
// (prendas de la búsqueda, tiendas, Google) siguen saliendo todas, a
// pedido de Juliana. Sin ninguna escogida, salen todas.
//
// Se guarda en este navegador (localStorage). Es una preferencia de
// quien está mirando, no un dato de la cuenta.
// =====================================================================

const CLAVE = "loleardelola:marcas";
const EVENTO = "loleardelola:marcas-cambiaron";

function leer(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function guardarMarcas(dominios: string[]): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(Array.from(new Set(dominios))));
  } catch {
    // Sin almacenamiento (modo privado): se queda sin filtro.
  }
  window.dispatchEvent(new Event(EVENTO));
}

/** Los dominios escogidos (vacío = todas), al día en todos los componentes. */
export function useMarcasFavoritas(): string[] {
  const [marcas, setMarcas] = useState<string[]>([]);
  useEffect(() => {
    const actualizar = () => setMarcas(leer());
    actualizar();
    window.addEventListener(EVENTO, actualizar);
    // Si las cambia en otra pestaña.
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener(EVENTO, actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);
  return marcas;
}

/** ¿Este dominio pasa el filtro? Sin marcas escogidas, todos pasan. */
export function esDeMisMarcas(marcas: string[], dominio: string | null | undefined): boolean {
  if (marcas.length === 0) return true;
  if (!dominio) return false;
  const d = dominio.toLowerCase().replace(/^www\./, "");
  return marcas.includes(d);
}

/** Para mandarle al servidor: "a.com,b.co", o "" si son todas. */
export function marcasParaUrl(marcas: string[]): string {
  return [...marcas].sort().join(",");
}
