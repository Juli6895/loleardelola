// Helpers para construir URLs de Google Shopping en Colombia
//
// Soporta dos features que se aplican por término:
//   - priceMaxCop: filtro de precio máximo en pesos colombianos
//   - excludeMerchants: dominios que se excluyen vía operador `-site:`

const BASE = "https://www.google.com/search";

// Geo + idioma Colombia
const COLOMBIA_PARAMS = "gl=co&hl=es-419";

export type ShoppingItem = {
  q: string;
  // Precio máximo en COP. null/undefined = sin filtro de precio.
  priceMaxCop?: number | null;
};

export type ShoppingOptions = {
  // Lista de dominios a excluir (sin protocolo, sin www).
  excludeMerchants?: string[];
};

/**
 * Construye la URL de Google Shopping para un término o ShoppingItem.
 *
 * Composición de la query:
 *   - Términos del usuario (ej: "jean azul oscuro")
 *   - Operadores `-site:dominio.com` por cada dominio excluido.
 *
 * Filtro de precio (si priceMaxCop > 0):
 *   - Param `tbs=mr:1,price:1,ppr_max:N` aplica el filtro "hasta $N" en la
 *     UI de Google Shopping. La moneda la deduce del geo (`gl=co` → COP).
 */
export function googleShoppingUrl(
  item: string | ShoppingItem,
  opts: ShoppingOptions = {}
): string {
  const term = typeof item === "string" ? item : item.q;
  const priceMax =
    typeof item === "string" ? null : item.priceMaxCop ?? null;

  const exclusions = (opts.excludeMerchants ?? [])
    .map((domain) => `-site:${domain}`)
    .join(" ");

  const fullQuery = exclusions ? `${term.trim()} ${exclusions}` : term.trim();
  const q = encodeURIComponent(fullQuery);

  let priceParam = "";
  if (priceMax && priceMax > 0) {
    priceParam = `&tbs=mr:1,price:1,ppr_max:${Math.round(priceMax)}`;
  }

  return `${BASE}?tbm=shop&q=${q}&${COLOMBIA_PARAMS}${priceParam}`;
}

/**
 * Abre una pestaña de Google Shopping por cada prenda del outfit.
 * Acepta tanto strings (caso simple, ej. outfits guardados sin presupuesto)
 * como ShoppingItem[] (caso con presupuesto, cada item con su priceMaxCop).
 *
 * Hay que llamarla SÍNCRONAMENTE desde un click handler para que el navegador
 * permita los múltiples window.open (popup blocker).
 *
 * Nota: combinar todos los términos con OR en una sola búsqueda da resultados
 * pobres (Google interpreta "(jean azul) OR (chaqueta)" como "chaqueta de
 * jean"). Por eso abrimos una pestaña por prenda — mejor para shopping real.
 */
export function abrirOutfitEnGoogleShopping(
  items: Array<string | ShoppingItem>,
  opts: ShoppingOptions = {}
) {
  if (typeof window === "undefined") return;
  for (const item of items) {
    window.open(
      googleShoppingUrl(item, opts),
      "_blank",
      "noopener,noreferrer"
    );
  }
}
