"use client";

import { useEffect, useState } from "react";
import { fetchConDispositivo } from "./device-id";

// =====================================================================
// "Mi talla" en las promociones
// =====================================================================
// Las tallas que escoge en el filtro de Promociones se guardan para la
// próxima vez, y las puede cambiar cuando quiera desde ese mismo filtro.
// Igual que Mis marcas favoritas: en el navegador (localStorage) y en la
// base (/api/tallas), para el tablero y para que la encuentre en otro
// aparato si entra con su correo.
// =====================================================================

const CLAVE = "loleardelola:tallas";
const EVENTO = "loleardelola:tallas-cambiaron";

function leer(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function guardarLocal(tallas: string[]): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(Array.from(new Set(tallas))));
  } catch {
    // Sin almacenamiento (modo privado): se queda sin filtro.
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function guardarTallas(tallas: string[]): void {
  const unicas = Array.from(new Set(tallas));
  guardarLocal(unicas);
  fetchConDispositivo("/api/tallas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tallas: unicas }),
  }).catch(() => {});
}

// Si este navegador nunca escogió talla, se trae la de la cuenta.
let sincronizada = false;
function traerDeLaCuenta(): void {
  if (sincronizada) return;
  sincronizada = true;
  try {
    if (localStorage.getItem(CLAVE) !== null) return;
  } catch {
    return;
  }
  fetchConDispositivo("/api/tallas")
    .then((r) => r.json())
    .then((j) => {
      if (Array.isArray(j.tallas) && j.tallas.length > 0) guardarLocal(j.tallas);
    })
    .catch(() => {});
}

/** Las tallas escogidas (vacío = todas), al día en todos los componentes. */
export function useTallasFavoritas(): string[] {
  const [tallas, setTallas] = useState<string[]>([]);
  useEffect(() => {
    const actualizar = () => setTallas(leer());
    actualizar();
    traerDeLaCuenta();
    window.addEventListener(EVENTO, actualizar);
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener(EVENTO, actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);
  return tallas;
}

// Orden de los botones: de la más pequeña a la más grande, luego la
// única, y después los números (ropa y zapatos) de menor a mayor.
const ORDEN_LETRAS = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "Única"];

export function ordenarTallas(tallas: string[]): string[] {
  const peso = (t: string) => {
    const i = ORDEN_LETRAS.indexOf(t);
    if (i >= 0) return i;
    const n = parseFloat(t);
    return Number.isFinite(n) ? 100 + n : 10_000;
  };
  return [...tallas].sort((a, b) => peso(a) - peso(b) || a.localeCompare(b));
}

export function esTallaDeLetra(t: string): boolean {
  return ORDEN_LETRAS.includes(t);
}
