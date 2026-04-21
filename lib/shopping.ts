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
 * Construye una URL que busca todas las prendas del outfit de una.
 * Usa un OR entre términos: mostrará resultados mixtos.
 */
export function googleShoppingAllOutfitUrl(terms: string[]): string {
  const joined = terms.map((t) => `(${t})`).join(" OR ");
  return googleShoppingUrl(joined);
}
