"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
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

// Mientras un cambio va camino a la cuenta, no se trae la lista de la
// cuenta: llegaría la de antes y desharía lo que acaba de marcar.
let guardando = 0;
let ultimoCambio = 0;

export function guardarFavoritas(dominios: string[]): void {
  const unicas = limpiar(dominios);
  guardarFavoritasLocal(unicas);
  anotar("filtro_aplicado", { filtro: "marcas_favoritas", cantidad: unicas.length });
  guardando++;
  ultimoCambio = Date.now();
  fetchConDispositivo("/api/marcas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marcas: unicas }),
  })
    .then((r) => r.json())
    .then((j) => {
      if (!j?.ok) throw new Error("no se guardó");
    })
    .catch(() => {
      toast.error("No pudimos guardar tus marcas en tu cuenta. Revisa tu conexión e inténtalo de nuevo.", {
        id: "marcas-sin-guardar",
      });
    })
    .finally(() => {
      guardando--;
    });
}

/** Pone o quita el corazón de una marca. */
export function alternarFavorita(favoritas: string[], dominio: string): void {
  guardarFavoritas(favoritas.includes(dominio) ? favoritas.filter((d) => d !== dominio) : [...favoritas, dominio]);
}

// Al abrir la página y cada vez que vuelve a ella (otra pestaña, la app
// en segundo plano). Con la sesión iniciada, la cuenta manda: sus marcas
// reemplazan las de este navegador, así el celular y el computador ven
// lo mismo. Si la cuenta no tiene ninguna y el navegador sí, se suben las
// del navegador a la cuenta. Sin sesión, cada navegador guarda lo suyo.
let ultimaSincronizacion = 0;
function traerDeLaCuenta(): void {
  const ahora = Date.now();
  // Una sola consulta aunque varios componentes la pidan a la vez.
  if (ahora - ultimaSincronizacion < 2000) return;
  if (guardando > 0 || ahora - ultimoCambio < 3000) return;
  ultimaSincronizacion = ahora;
  const local = leerFavoritas();
  fetchConDispositivo("/api/marcas")
    .then((r) => r.json())
    .then((j) => {
      if (!j?.cuenta || guardando > 0 || Date.now() - ultimoCambio < 3000) return;
      const enCuenta = limpiar(j.marcas);
      if (enCuenta.length > 0) {
        const igual = enCuenta.length === local.length && enCuenta.every((d) => local.includes(d));
        if (!igual) guardarFavoritasLocal(enCuenta);
      } else if (local.length > 0) {
        fetchConDispositivo("/api/marcas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marcas: local }),
        }).catch(() => {});
      }
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
    // Vuelve a la página: pudo cambiarlas en el celular o en otro computador.
    const alVolver = () => {
      if (document.visibilityState === "visible") traerDeLaCuenta();
    };
    window.addEventListener(EVENTO_FAVORITAS, actualizar);
    // Si las cambia en otra pestaña.
    window.addEventListener("storage", actualizar);
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      window.removeEventListener(EVENTO_FAVORITAS, actualizar);
      window.removeEventListener("storage", actualizar);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
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
