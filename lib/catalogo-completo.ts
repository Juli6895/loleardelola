import { tiendasParaPromos, tipoNormalizado } from "./catalogo-tiendas";
import {
  filaShopify,
  filaVtex,
  pagina,
  tramoVtex,
  type Fila,
  type ProductoShopify,
  type ProductoVtex,
  type Tienda,
} from "./promos-diarias";
import type { Promo } from "./promos-guardadas";

// =====================================================================
// "Ver todo" en Promociones: todas las prendas de una marca
// =====================================================================
// No solo las rebajadas: lo que hay en la tienda, de lo más nuevo a lo
// más viejo, solo con talla disponible. Así la usuaria le da corazón a
// lo que le gusta y, si después baja de precio, le llega la
// notificación (app/api/revisar-precios).
//
// Se lee en vivo, de a una página de la tienda, cuando la usuaria llega
// a esa marca: guardar el catálogo entero de todas las tiendas cada día
// sería mucho más pesado que las promos. La respuesta queda media hora
// en la caché de Vercel (ver app/api/promos/todo).
// =====================================================================

const POR_PAGINA = 50;
// Con un filtro de prenda o talla, una página puede traer pocas: se
// siguen leyendo hasta juntar estas, sin pasar de PAGINAS_MAX.
const MINIMO = 12;
const PAGINAS_MAX = 4;
// VTEX no deja pedir más allá de este punto de la lista.
const VTEX_MAXIMO = 2500;

export type PaginaMarca = { prendas: Promo[]; siguiente: number | null };

async function paginaShopify(t: Tienda, n: number): Promise<ProductoShopify[] | null> {
  const sacar = (d: unknown) => (d as { products?: ProductoShopify[] }).products ?? [];
  // /products.json ya viene de lo más reciente a lo más viejo. (El de
  // /collections/all viene por orden alfabético y no hace caso a sort_by.)
  return pagina(`https://${t.host}/products.json?limit=${POR_PAGINA}&page=${n}`, sacar);
}

async function paginaVtex(t: Tienda, n: number): Promise<ProductoVtex[] | null> {
  const desde = (n - 1) * POR_PAGINA;
  if (desde >= VTEX_MAXIMO) return [];
  const tramo = await tramoVtex(t, desde, "OrderByReleaseDateDESC");
  return tramo ? tramo.productos : null;
}

/**
 * La fila como tarjeta, si pasa los filtros. Con talla, el precio y el
 * enlace son los de la talla escogida más económica, igual que en las
 * promos (lib/promos-guardadas.ts).
 */
function aPromo(f: Fila, tipos: Set<string>, tallas: Set<string>): Promo | null {
  if (tipos.size > 0 && !tipos.has(f.tipo)) return null;
  let precio = f.precio_cop;
  let antes = f.precio_antes_cop;
  let url = f.url;
  if (tallas.size > 0) {
    const sirven = (f.tallas ?? []).filter((t) => tallas.has(t.t));
    if (sirven.length === 0) return null;
    const t = sirven.reduce((x, y) => (y.p < x.p ? y : x));
    precio = t.p;
    antes = t.a;
    url = f.url.split("?")[0] + t.q;
  }
  return {
    url,
    dominio: f.dominio,
    tienda: f.tienda,
    titulo: f.titulo,
    imagen: f.imagen,
    tipo: f.tipo,
    precioCop: precio,
    precioAntesCop: antes,
  };
}

/** Las prendas de la marca desde la página `desde` de su tienda. */
export async function prendasDeLaMarca(
  dominio: string,
  desde: number,
  tipos: string[],
  tallas: string[]
): Promise<PaginaMarca> {
  const t = tiendasParaPromos().find((x) => x.dominio === dominio);
  if (!t) return { prendas: [], siguiente: null };
  const buscados = new Set(tipos.map(tipoNormalizado));
  const conTalla = new Set(tallas);
  const salida = new Map<string, Promo>();

  let n = desde;
  for (let leidas = 0; leidas < PAGINAS_MAX && salida.size < MINIMO; leidas++, n++) {
    const productos = t.plataforma === "shopify" ? await paginaShopify(t, n) : await paginaVtex(t, n);
    // La tienda no respondió: se muestra lo que alcanzó a llegar.
    if (!productos) return { prendas: Array.from(salida.values()), siguiente: null };
    for (const p of productos) {
      const f = t.plataforma === "shopify" ? filaShopify(t, p as ProductoShopify, null) : filaVtex(t, p as ProductoVtex, null);
      const promo = f && aPromo(f, buscados, conTalla);
      // VTEX repite prendas entre páginas.
      if (promo && !salida.has(promo.url.split("?")[0])) salida.set(promo.url.split("?")[0], promo);
    }
    // Una página incompleta es la última.
    if (productos.length < POR_PAGINA) return { prendas: Array.from(salida.values()), siguiente: null };
  }
  return { prendas: Array.from(salida.values()), siguiente: n };
}
