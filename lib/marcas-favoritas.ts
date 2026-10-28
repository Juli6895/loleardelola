"use client";

import { useEffect, useState } from "react";
import { fetchConDispositivo } from "./device-id";

// =====================================================================
// Mis marcas: las que cada quien escoge en el menú
// =====================================================================
// Si escogió alguna, en las PROMOCIONES solo le salen esas. En lo demás
// (prendas de la búsqueda, tiendas, Google) siguen saliendo todas, a
// pedido de Juliana. Sin ninguna escogida, salen todas.
//
// Se guarda en este navegador (localStorage) y también en la base
// (/api/marcas): de ahí sale lo que cuenta el tablero, y así quien entra
// con su correo en otro aparato las encuentra. Si la base falla, sigue
// funcionando solo con el navegador.
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

function guardarLocal(dominios: string[]): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(Array.from(new Set(dominios))));
  } catch {
    // Sin almacenamiento (modo privado): se queda sin filtro.
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function guardarMarcas(dominios: string[]): void {
  const unicas = Array.from(new Set(dominios));
  guardarLocal(unicas);
  fetchConDispositivo("/api/marcas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marcas: unicas }),
  }).catch(() => {});
}

// Si este navegador nunca escogió marcas, se traen las de la cuenta (o
// las que ya había guardado desde este navegador). Una vez por visita.
let sincronizada = false;
function traerDeLaCuenta(): void {
  if (sincronizada) return;
  sincronizada = true;
  let nunca = false;
  try {
    nunca = localStorage.getItem(CLAVE) === null;
  } catch {
    return;
  }
  if (!nunca) return;
  fetchConDispositivo("/api/marcas")
    .then((r) => r.json())
    .then((j) => {
      if (Array.isArray(j.marcas) && j.marcas.length > 0) guardarLocal(j.marcas);
    })
    .catch(() => {});
}

/** Los dominios escogidos (vacío = todas), al día en todos los componentes. */
export function useMarcasFavoritas(): string[] {
  const [marcas, setMarcas] = useState<string[]>([]);
  useEffect(() => {
    const actualizar = () => setMarcas(leer());
    actualizar();
    traerDeLaCuenta();
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
