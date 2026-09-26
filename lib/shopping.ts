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
// patrocinado. Por eso, cuando hay un filtro de marca activo, la búsqueda
// NO puede ir por esa pestaña.
//
// La que sí sirve es la pestaña de IMÁGENES (`udm=2`): respeta `site:` y
// muestra la prenda con foto y precio, sin que haya que entrar a cada
// enlace para ver de qué se trata. Sin filtro de marca se sigue usando
// `tbm=shop`, que ahí funciona bien.

import {
  ESTAMPADOS,
  TEXTURAS_DISTINTIVAS,
  normalizarDetalle,
  patronesDe,
} from "./detalles-distintivos";

const BASE = "https://www.google.com/search";

/**
 * Pone entre comillas lo que define la prenda: el tipo (la primera
 * palabra del término, "falda") y su estampado o textura ("cuadros",
 * "lentejuelas"). Sin comillas Google trata cada palabra como opcional
 * y, si no tiene faldas de cuadros, muestra faldas cualquiera. Con
 * comillas las exige: si no hay, no muestra otras.
 *
 * "Estampado" a secas no se exige: no dice cuál estampado.
 */
export function exigirDetalles(termino: string): string {
  const t = termino.trim();
  if (!t || t.includes('"')) return t;
  const n = normalizarDetalle(t);
  // Rangos [inicio, fin) del texto que va entre comillas.
  const rangos: Array<[number, number]> = [];
  const primera = t.search(/\s|$/);
  if (primera > 0) rangos.push([0, primera]);
  for (const d of [...ESTAMPADOS, ...TEXTURAS_DISTINTIVAS]) {
    if (d === "estampado") continue;
    for (const re of patronesDe(d)) {
      const g = new RegExp(re.source, "g");
      let m: RegExpExecArray | null;
      while ((m = g.exec(n))) rangos.push([m.index, m.index + m[0].length]);
    }
  }
  rangos.sort((a, b) => a[0] - b[0]);
  let salida = "";
  let hasta = 0;
  for (const [i, j] of rangos) {
    if (i < hasta) continue;
    salida += t.slice(hasta, i) + `"${t.slice(i, j)}"`;
    hasta = j;
  }
  return salida + t.slice(hasta);
}

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

  const termino = exigirDetalles(term);
  const fullQuery = siteFilter ? `${termino} ${siteFilter}` : termino;
  const q = encodeURIComponent(fullQuery);

  // Filtro `ppr_max` desactivado — combinado con las exclusiones por dominio
  // y queries largas dejaba 0-1 resultados. Si lo reactivamos, restaurar
  // `&tbs=mr:1,price:1,ppr_max:N` aquí.

  // Con filtro de marca: pestaña IMÁGENES (udm=2). Es la mejor de las
  // tres para esto: obedece site: igual que la búsqueda web —cosa que
  // la pestaña Shopping no hace, ver la nota de arriba— pero además
  // muestra la foto de cada prenda y, cuando la tienda la publica, el
  // precio. La búsqueda web devolvía lo mismo en una lista de enlaces
  // azules, donde tocaba entrar a cada uno para ver la prenda.
  //
  // Sin filtro de marca se mantiene la pestaña Shopping, que ahí sí
  // funciona y trae la grilla de productos con precio y vendedor.
  const pestana = siteFilter ? "udm=2&" : "tbm=shop&";

  return `${BASE}?${pestana}q=${q}&${COLOMBIA_PARAMS}`;
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
