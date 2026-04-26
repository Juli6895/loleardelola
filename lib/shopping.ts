// Helpers para construir URLs de Google Shopping en Colombia

const BASE = "https://www.google.com/search";

// Geo + idioma Colombia
const COLOMBIA_PARAMS = "gl=co&hl=es-419";

/**
 * Construye la URL de Google Shopping para un término dado.
 * tbm=shop abre la pestaña "Shopping".
 */
export function googleShoppingUrl(term: string): string {
  const q = encodeURIComponent(term.trim());
  return `${BASE}?tbm=shop&q=${q}&${COLOMBIA_PARAMS}`;
}

/**
 * Abre una pestaña de Google Shopping por cada término del outfit.
 * Hay que llamarla SÍNCRONAMENTE desde un click handler para que el navegador
 * permita los múltiples window.open (popup blocker).
 *
 * Nota: combinar todos los términos con OR en una sola búsqueda da resultados
 * pobres (Google interpreta "(jean azul) OR (chaqueta)" como "chaqueta de jean").
 * Mejor abrir una pestaña por prenda — más útil para el shopping real.
 */
export function abrirOutfitEnGoogleShopping(terms: string[]) {
  if (typeof window === "undefined") return;
  for (const term of terms) {
    window.open(googleShoppingUrl(term), "_blank", "noopener,noreferrer");
  }
}
