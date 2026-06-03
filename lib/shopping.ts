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
 * Construye la URL de Google Shopping combinando prenda + marca.
 * Ej: "jean azul wide leg" + "Zara" → busca "jean azul wide leg Zara"
 */
export function googleShoppingUrlConMarca(term: string, marca: string): string {
  const q = encodeURIComponent(`${term.trim()} ${marca.trim()}`);
  return `${BASE}?tbm=shop&q=${q}&${COLOMBIA_PARAMS}`;
}

/**
 * Abre una pestaña de Google Shopping por cada término del outfit.
 * Hay que llamarla SÍNCRONAMENTE desde un click handler para que el navegador
 * permita los múltiples window.open (popup blocker).
 */
export function abrirOutfitEnGoogleShopping(terms: string[]) {
  if (typeof window === "undefined") return;
  for (const term of terms) {
    window.open(googleShoppingUrl(term), "_blank", "noopener,noreferrer");
  }
}

/**
 * Abre una pestaña por prenda con la marca añadida al query.
 * Ej: si terms = ["jean azul", "camiseta blanca"] y marca = "Zara",
 * abre "jean azul Zara" y "camiseta blanca Zara" en pestañas separadas.
 */
export function abrirOutfitEnGoogleShoppingConMarca(
  terms: string[],
  marca: string
) {
  if (typeof window === "undefined") return;
  for (const term of terms) {
    window.open(
      googleShoppingUrlConMarca(term, marca),
      "_blank",
      "noopener,noreferrer"
    );
  }
}

// Marcas disponibles para filtrar la búsqueda
export const MARCAS_FAVORITAS = [
  "Zara",
  "H&M",
  "Naf Naf",
  "American Eagle",
  "Color Blue",
  "Bybla",
  "Gef",
] as const;

export type MarcaFavorita = (typeof MARCAS_FAVORITAS)[number];
