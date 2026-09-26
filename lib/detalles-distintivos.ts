// =====================================================================
// Lo que define cómo se ve una prenda, más allá del tipo y el color
// =====================================================================
// Una falda de cuadros sin cuadros no es "parecida", es otra falda. Lo
// mismo un vestido de lentejuelas sin lentejuelas. Estos detalles se
// exigen: en la búsqueda de Google (entre comillas) y en el catálogo de
// las tiendas. Si no hay ninguna prenda con ellos, es mejor no mostrar
// nada que mostrar otras.
//
// Vive aparte porque lo usan el navegador (el enlace a Google) y el
// servidor (el catálogo).
// =====================================================================

export const ESTAMPADOS = [
  "cuadros", "rayas", "lunares", "floral", "flores", "animal print", "leopardo",
  "cebra", "tie dye", "geometrico", "pata de gallo", "escoces", "tropical",
  "cachemir", "paisley", "tartan", "camuflado", "estampado",
];

export const TEXTURAS_DISTINTIVAS = [
  "lentejuelas", "encaje", "pedreria", "flecos", "plumas", "tul", "terciopelo",
  "velvet", "satin", "saten", "cuero", "denim", "crochet", "malla", "perlas",
  "brillos", "metalizado", "charol", "gamuza",
];

// Cómo más lo escriben las tiendas: "Chaqueta Jean", no "Chaqueta Denim".
const SINONIMOS_DETALLE: Record<string, string[]> = {
  denim: ["jean"],
  velvet: ["terciopelo"],
  terciopelo: ["velvet"],
  satin: ["saten", "satinado"],
  saten: ["satin", "satinado"],
  cuero: ["cuerina", "piel sintetica", "cuero sintetico"],
  floral: ["flores"],
  flores: ["floral"],
  brillos: ["brillante", "lurex"],
};

/** Minúsculas y sin tildes, para que "pedrería" empareje con "pedreria". */
export function normalizarDetalle(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Acepta masculino, femenino y plural ("estampada", "rayas", "flor"). */
export function patronDetalle(termino: string): RegExp {
  const palabras = termino
    .split(/\s+/)
    .filter(Boolean)
    .map((w) =>
      w.length > 3 && /[oa]$/.test(w)
        ? `${escapar(w.slice(0, -1))}[oa]s?`
        : `${escapar(w.replace(/(es|s)$/, ""))}(?:s|es)?`
    );
  return new RegExp(`\\b${palabras.join("\\s+")}\\b`);
}

/** Todas las formas en que una tienda puede escribir ese detalle. */
export function patronesDe(detalle: string): RegExp[] {
  return [detalle, ...(SINONIMOS_DETALLE[detalle] ?? [])].map(patronDetalle);
}

/**
 * Los detalles distintivos que nombra un texto. `estampado` a secas no
 * cuenta como concreto: "blusa estampada" no dice CUÁL estampado, y
 * exigirlo dejaría pasar cualquiera.
 */
export function detallesEn(texto: string): { estampados: string[]; texturas: string[] } {
  const n = normalizarDetalle(texto);
  return {
    estampados: ESTAMPADOS.filter((e) => e !== "estampado" && patronDetalle(e).test(n)),
    texturas: TEXTURAS_DISTINTIVAS.filter((t) => patronDetalle(t).test(n)),
  };
}
