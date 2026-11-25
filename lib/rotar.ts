"use client";

// =====================================================================
// Un orden distinto en cada visita
// =====================================================================
// Las promos llegan siempre de la más rebajada a la menos, y las marcas
// en el mismo orden: quien entraba veía siempre las mismas prendas de
// primeras (pedido de Juliana, Black Friday de noviembre de 2026). Cada
// visita tiene su "semilla" (al azar, guardada mientras dure la visita):
// con ella se mezcla el orden de las marcas y se escogen cuáles prendas
// de cada una se ven. Dentro de la misma visita no cambia, para que la
// página no salte al recargar o al tocar un filtro.
// =====================================================================

const CLAVE = "loleardelola:semilla-visita";

/** El número al azar de esta visita (el mismo hasta cerrar la pestaña). */
export function semillaDeVisita(): number {
  try {
    const guardada = Number(sessionStorage.getItem(CLAVE));
    if (Number.isFinite(guardada) && guardada > 0) return guardada;
    const nueva = Math.floor(Math.random() * 2 ** 31) + 1;
    sessionStorage.setItem(CLAVE, String(nueva));
    return nueva;
  } catch {
    return Math.floor(Math.random() * 2 ** 31) + 1;
  }
}

/** Generador de números al azar a partir de una semilla (mulberry32). */
function azar(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Una copia mezclada de la lista; la misma semilla da el mismo orden. */
export function mezclar<T>(lista: T[], semilla: number): T[] {
  const r = azar(semilla);
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Un número estable a partir de un texto, para variar la semilla por marca. */
export function numeroDe(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
}
