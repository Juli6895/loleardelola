"use client";

import { useEffect, useState } from "react";
import { fetchConDispositivo } from "./device-id";
import { anotar } from "./use-evento";

// =====================================================================
// Marcas favoritas y filtro de marcas: dos cosas distintas
// =====================================================================
// 1. Favoritas (corazón, en "Mis marcas favoritas" del menú): lo que le
//    gusta. NO filtra: en Promociones y en "Ver todo" sus favoritas salen
//    primero y después las demás. Se guardan en este navegador y en la
//    base (/api/marcas), de donde sale lo que cuenta el tablero.
// 2. Filtro de marcas (panel de Filtros de Promociones): qué marcas se
//    ven. "Todas" (por defecto, favoritas primero), "Solo mis favoritas" o
//    las que escoja una por una. Se guarda solo en este navegador.
// =====================================================================

const CLAVE_FAVORITAS = "loleardelola:marcas";
const CLAVE_FILTRO = "loleardelola:filtro-marcas";
const EVENTO_FAVORITAS = "loleardelola:marcas-cambiaron";
const EVENTO_FILTRO = "loleardelola:filtro-marcas-cambio";

/**
 * Antes las favoritas eran el filtro y se guardaba "ninguna" cuando
 * desmarcaba todas. Se sigue leyendo así para no confundir datos viejos:
 * "ninguna" es lo mismo que no tener favoritas.
 */
const VIEJO_NINGUNA = "ninguna";
const limpiar = (marcas: unknown): string[] =>
  Array.isArray(marcas)
    ? Array.from(new Set(marcas.filter((x): x is string => typeof x === "string" && x !== VIEJO_NINGUNA)))
    : [];

function leerFavoritas(): string[] {
  try {
    return limpiar(JSON.parse(localStorage.getItem(CLAVE_FAVORITAS) ?? "[]"));
  } catch {
    return [];
  }
}

function guardarFavoritasLocal(dominios: string[]): void {
  try {
    localStorage.setItem(CLAVE_FAVORITAS, JSON.stringify(limpiar(dominios)));
  } catch {
    // Sin almacenamiento (modo privado): se quedan solo en esta visita.
  }
  window.dispatchEvent(new Event(EVENTO_FAVORITAS));
}

export function guardarFavoritas(dominios: string[]): void {
  const unicas = limpiar(dominios);
  guardarFavoritasLocal(unicas);
  anotar("filtro_aplicado", { filtro: "marcas_favoritas", cantidad: unicas.length });
  fetchConDispositivo("/api/marcas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marcas: unicas }),
  }).catch(() => {});
}

/** Pone o quita el corazón de una marca. */
export function alternarFavorita(favoritas: string[], dominio: string): void {
  guardarFavoritas(favoritas.includes(dominio) ? favoritas.filter((d) => d !== dominio) : [...favoritas, dominio]);
}

// Si este navegador nunca guardó favoritas, se traen las de la cuenta (o
// las que ya había guardado desde este navegador). Una vez por visita.
let sincronizada = false;
function traerDeLaCuenta(): void {
  if (sincronizada) return;
  sincronizada = true;
  let nunca = false;
  try {
    nunca = localStorage.getItem(CLAVE_FAVORITAS) === null;
  } catch {
    return;
  }
  if (!nunca) return;
  fetchConDispositivo("/api/marcas")
    .then((r) => r.json())
    .then((j) => {
      const marcas = limpiar(j.marcas);
      if (marcas.length > 0) guardarFavoritasLocal(marcas);
    })
    .catch(() => {});
}

/** Las marcas con corazón, al día en todos los componentes. */
export function useMarcasFavoritas(): string[] {
  const [marcas, setMarcas] = useState<string[]>([]);
  useEffect(() => {
    const actualizar = () => setMarcas(leerFavoritas());
    actualizar();
    traerDeLaCuenta();
    window.addEventListener(EVENTO_FAVORITAS, actualizar);
    // Si las cambia en otra pestaña.
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener(EVENTO_FAVORITAS, actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);
  return marcas;
}

// ---------------------------------------------------------------------
// Filtro de marcas de Promociones
// ---------------------------------------------------------------------
export type FiltroMarcas = { modo: "todas" } | { modo: "favoritas" } | { modo: "algunas"; marcas: string[] };

const TODAS: FiltroMarcas = { modo: "todas" };

function leerFiltro(): FiltroMarcas {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_FILTRO) ?? "null");
    if (v?.modo === "favoritas") return { modo: "favoritas" };
    if (v?.modo === "algunas") return { modo: "algunas", marcas: limpiar(v.marcas) };
  } catch {
    // Se queda con todas.
  }
  return TODAS;
}

export function guardarFiltroMarcas(filtro: FiltroMarcas): void {
  try {
    localStorage.setItem(CLAVE_FILTRO, JSON.stringify(filtro));
  } catch {
    // Sin almacenamiento: dura lo que dure la visita.
  }
  window.dispatchEvent(new Event(EVENTO_FILTRO));
  anotar("filtro_aplicado", {
    filtro: "marcas",
    modo: filtro.modo,
    cantidad: filtro.modo === "algunas" ? filtro.marcas.length : 0,
  });
}

export function useFiltroMarcas(): FiltroMarcas {
  const [filtro, setFiltro] = useState<FiltroMarcas>(TODAS);
  useEffect(() => {
    const actualizar = () => setFiltro(leerFiltro());
    actualizar();
    window.addEventListener(EVENTO_FILTRO, actualizar);
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener(EVENTO_FILTRO, actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);
  return filtro;
}

/**
 * Las marcas que deja ver el filtro: null = todas. Una lista vacía es que
 * no quiere ver ninguna (desactivó todas o no tiene favoritas).
 */
export function marcasDelFiltro(filtro: FiltroMarcas, favoritas: string[]): string[] | null {
  if (filtro.modo === "todas") return null;
  if (filtro.modo === "favoritas") return favoritas;
  return filtro.marcas;
}

/** Cuánto suma el filtro de marcas al número del botón de Filtros. */
export function cuantasEnFiltro(filtro: FiltroMarcas, favoritas: string[]): number {
  const marcas = marcasDelFiltro(filtro, favoritas);
  return marcas === null ? 0 : Math.max(marcas.length, 1);
}

/** Para mandarle al servidor: "a.com,b.co", "" si son todas, o una que no existe si ninguna. */
export function marcasParaUrl(marcas: string[] | null): string {
  if (marcas === null) return "";
  if (marcas.length === 0) return VIEJO_NINGUNA;
  return [...marcas].sort().join(",");
}

/** Las favoritas primero, sin cambiar el orden de lo demás. */
export function favoritasPrimero<T>(lista: T[], favoritas: string[], dominio: (x: T) => string): T[] {
  if (favoritas.length === 0) return lista;
  const fav = new Set(favoritas);
  return [...lista.filter((x) => fav.has(dominio(x))), ...lista.filter((x) => !fav.has(dominio(x)))];
}
