// Helpers para construir URLs de Google Shopping en Colombia
//
// Soporta dos features que se aplican por término:
//   - priceMaxCop: filtro de precio máximo en pesos colombianos
//     ⚠️ DESACTIVADO temporalmente: el filtro `ppr_max` recortaba demasiado
//        los resultados (Google devolvía 0-1 productos). Se mantiene el tipo
//        para no romper callers, pero `googleShoppingUrl` lo ignora.
//   - excludeMerchants / includeMerchants: dominios a excluir o a los que
//     restringir la búsqueda, vía operadores `-site:` / `site:`.
//
// ⚠️ IMPORTANTE sobre `tbm=shop` (la pestaña "Shopping" de Google):
// el carrusel de "Productos Patrocinados" que aparece ahí es INVENTARIO
// PAGO de Google Ads y ignora por completo los operadores `site:`/`-site:`
// — confirmado en vivo: restringir a Zara/H&M/Mango igual mostró Shein
// patrocinado. Por eso, cuando hay un filtro de marca activo, esta función
// arma la URL de búsqueda web normal (sin `tbm=shop`), que sí respeta esos
// operadores de forma confiable. Sin filtro, se mantiene `tbm=shop` para
// conservar la grilla visual de productos con imagen y precio.

const BASE = "https://www.google.com/search";

// Geo + idioma Colombia
const COLOMBIA_PARAMS = "gl=co&hl=es-419";

// Cuántos dominios caben en UNA búsqueda restringida.
//
// Google deja de tener en cuenta la parte de la consulta que pasa de
// cierto largo (del orden de 32 palabras). Cada "site:tienda.com" y cada
// "OR" cuentan como palabra, así que N tiendas gastan 2N-1 palabras más
// las del término. Con 12 quedan ~28 palabras contando la prenda, que
// entra con margen.
//
// Pasado ese tope NO se recorta la lista a las primeras 12 —eso dejaría
// a las últimas tiendas del archivo sin aparecer nunca—: se escoge un
// subconjunto distinto según la prenda que se busca. Mismo término,
// mismas tiendas (el enlace no cambia si vuelves a buscar lo mismo),
// pero prendas distintas reparten el catálogo entre todas.
const MAX_SITIOS_POR_BUSQUEDA = 12;

/** Hash estable de un texto. Solo para escoger tiendas, no es seguridad. */
function semilla(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h * 31 + texto.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function escogerSitios(dominios: string[], termino: string): string[] {
  if (dominios.length <= MAX_SITIOS_POR_BUSQUEDA) return dominios;
  const inicio = semilla(termino) % dominios.length;
  // Recorre la lista en círculo desde un punto que depende del término.
  return Array.from(
    { length: MAX_SITIOS_POR_BUSQUEDA },
    (_, i) => dominios[(inicio + i) % dominios.length]
  );
}

export type ShoppingItem = {
  q: string;
  // Precio máximo en COP. null/undefined = sin filtro de precio.
  priceMaxCop?: number | null;
};

export type ShoppingOptions = {
  // Lista de dominios a excluir (sin protocolo, sin www).
  excludeMerchants?: string[];
  // Si viene con al menos un dominio, restringe la búsqueda SOLO a esos
  // comercios (equivalente a "(site:a OR site:b OR ...)"). Tiene prioridad
  // sobre excludeMerchants: no tiene sentido excluir dominios de una
  // búsqueda que ya está restringida a una lista cerrada.
  includeMerchants?: string[];
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

  const includeList = escogerSitios(opts.includeMerchants ?? [], term);
  // Restringir a una lista cerrada gana sobre excluir: si ya dijiste "solo
  // estas tiendas", excluir otras de por fuera de esa lista no aporta nada.
  const siteFilter =
    includeList.length > 0
      ? `(${includeList.map((domain) => `site:${domain}`).join(" OR ")})`
      : (opts.excludeMerchants ?? [])
          .map((domain) => `-site:${domain}`)
          .join(" ");

  const fullQuery = siteFilter ? `${term.trim()} ${siteFilter}` : term.trim();
  const q = encodeURIComponent(fullQuery);

  // Filtro `ppr_max` desactivado — combinado con las exclusiones por dominio
  // y queries largas dejaba 0-1 resultados. Si lo reactivamos, restaurar
  // `&tbs=mr:1,price:1,ppr_max:N` aquí.

  // Sin filtro de marca: pestaña Shopping (grilla con imagen + precio).
  // Con filtro de marca: búsqueda web normal, porque es la única que
  // realmente obedece site:/-site: — ver nota arriba sobre Shopping Ads.
  const tbm = siteFilter ? "" : "tbm=shop&";

  return `${BASE}?${tbm}q=${q}&${COLOMBIA_PARAMS}`;
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
