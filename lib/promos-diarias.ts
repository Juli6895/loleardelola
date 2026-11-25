import { supabaseAdmin } from "./supabase";
import { registrar } from "./eventos";
import {
  clasificarPrenda,
  enColombia,
  precioDeVariantes,
  precioWoo,
  precioStorefront,
  encabezadosParaColombia,
  imagenStorefront,
  urlCatalogoStorefront,
  urlProductoStorefront,
  POR_PAGINA_STOREFRONT,
  type ProductoStorefront,
  PRECIOS_DE_COLOMBIA,
  sinEntidades,
  tiendasParaPromos,
  type ProductoWoo,
  type VarianteShopify,
} from "./catalogo-tiendas";

// =====================================================================
// Revisión diaria de promociones
// =====================================================================
// El buscador de cada tienda solo devuelve 10 o 20 prendas por palabra,
// así que el panel de promos dejaba por fuera la mayoría de rebajas.
// Esto lee el catálogo COMPLETO una vez al día y guarda en la tabla
// `promos` cada prenda rebajada más de 10% que tenga una talla
// disponible:
//
// - Shopify: /products.json, de a 250 productos por página, con el
//   precio, el precio "antes" y la disponibilidad de cada talla.
// - VTEX no deja bajar el catálogo entero, pero sí pedirlo ordenado de
//   mayor a menor descuento (O=OrderByBestDiscountDESC): se pide de a 50
//   hasta que la página ya no trae rebajas de más de 10%.
//
// Las tiendas se reparten en LOTES, uno por cron (ver vercel.json): una
// función de Vercel tiene 60 segundos, y las tiendas grandes tardan.
// =====================================================================

export const LOTES = 12;

// Más de esto (redondeado, como en la tarjeta) para ser promo.
const MINIMO_PORCENTAJE = 10;
// Tiempo de cada lote, con margen antes de los 60 s de la función.
const TIEMPO_MS = 45_000;
// VTEX no deja pedir más allá de este punto de la lista.
const VTEX_MAXIMO = 2500;

// Una talla disponible de la promo, con su precio (ver migracion-tallas).
export type TallaPromo = { t: string; p: number; a: number | null; q: string };

export type Fila = {
  url: string;
  dominio: string;
  tienda: string;
  titulo: string;
  imagen: string | null;
  tipo: string;
  precio_cop: number;
  // null solo en "Ver todo" (lib/catalogo-completo.ts): sin rebaja.
  precio_antes_cop: number | null;
  descuento: number;
  tallas: TallaPromo[] | null;
};

// ---------------------------------------------------------------- tallas
// Cada tienda las escribe a su manera: "06" y "6", "MD" (Maaji) y "M",
// "U" y "Única". Se unifican para que el filtro funcione en todas.
const SINONIMOS_TALLA: Record<string, string> = {
  XXS: "XXS", XS: "XS", S: "S", M: "M", L: "L", XL: "XL", XXL: "XXL", XXXL: "XXXL",
  "2XL": "XXL", "3XL": "XXXL", "XXG": "XXL",
  SM: "S", SMALL: "S", MD: "M", MED: "M", MEDIUM: "M", LG: "L", LARGE: "L",
  XSM: "XS", XLG: "XL", XXLG: "XXL",
  U: "Única", UNICA: "Única", "TALLA UNICA": "Única", TU: "Única", "ONE SIZE": "Única", OS: "Única", STD: "Única",
};

export function normalizarTalla(valor: unknown): string | null {
  if (typeof valor !== "string" && typeof valor !== "number") return null;
  const t = String(valor)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase()
    .replace(/^TALLA\s+/, "");
  if (!t) return null;
  if (SINONIMOS_TALLA[t]) return SINONIMOS_TALLA[t];
  // Números: "06" → "6"; "4-5", "36.5" se dejan como vienen.
  if (/^\d+$/.test(t)) return String(Number(t));
  if (/^\d+([.,-]\d+)?$/.test(t)) return t.replace(",", ".");
  return null;
}

const ES_OPCION_DE_TALLA = /talla|size|tamano|medida/i;

/** Las tallas disponibles, una vez cada una, con el precio más bajo de esa talla. */
function juntarTallas(lista: Array<{ talla: string | null; precio: number; antes: number | null; q: string }>): TallaPromo[] | null {
  const porTalla = new Map<string, TallaPromo>();
  for (const x of lista) {
    if (!x.talla || !(x.precio > 0)) continue;
    const ya = porTalla.get(x.talla);
    if (!ya || x.precio < ya.p) {
      porTalla.set(x.talla, { t: x.talla, p: Math.round(x.precio), a: x.antes && x.antes > x.precio ? Math.round(x.antes) : null, q: x.q });
    }
  }
  return porTalla.size > 0 ? Array.from(porTalla.values()) : null;
}

export type Tienda = ReturnType<typeof tiendasParaPromos>[number];

export async function pedirJson(url: string, intento = 1): Promise<unknown> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "user-agent": "LoleardLola/1.0 (+https://www.loleardlola.com)",
        accept: "application/json",
        ...encabezadosParaColombia(url),
      },
    });
    if (!res.ok) {
      // "Demasiadas solicitudes": Shopify frena a los servidores (como el
      // de Vercel) que piden muchas páginas seguidas. Se espera lo que
      // pide, hasta 8 segundos.
      const espera = res.status === 429 ? Math.min(Number(res.headers.get("retry-after")) || 3, 8) * 1000 : 0;
      throw Object.assign(new Error(`http ${res.status}`), { espera });
    }
    return await res.json();
  } catch (e) {
    // Studio F a veces responde 500 en una página y a la siguiente no.
    if (intento < 3) {
      await new Promise((listo) => setTimeout(listo, (e as { espera?: number }).espera || 700 * intento));
      return pedirJson(url, intento + 1);
    }
    throw e;
  }
}

// Páginas que se piden a la vez por tienda: Malva tiene miles de
// productos y de a una no alcanzaba en el minuto de la función.
const PAGINAS_A_LA_VEZ = 4;
// Shopify frena por dirección de internet a quien pide muchas páginas
// seguidas (error 429), aunque sean de tiendas distintas: de a dos, con
// una pausa entre tandas.
const PAGINAS_SHOPIFY_A_LA_VEZ = 2;
const PAUSA_SHOPIFY_MS = 400;
const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

/** La página, o null si no respondió ni reintentando. */
// El último error de cada tienda, para que el tablero diga el motivo
// real ("http 429") y no solo "no respondió".
const ultimoError = new Map<string, string>();

export async function pagina<T>(url: string, sacar: (x: unknown) => T[]): Promise<T[] | null> {
  try {
    return sacar(await pedirJson(url));
  } catch (e) {
    console.warn(`[promos-diarias] ${url}:`, (e as Error).message);
    ultimoError.set(new URL(url).host, (e as Error).message);
    return null;
  }
}

const porcentaje = (precio: number, antes: number) => Math.round((1 - precio / antes) * 100);

// ---------------------------------------------------------------- Shopify
export type ProductoShopify = {
  title?: string;
  handle?: string;
  options?: Array<{ name?: string; position?: number }>;
  product_type?: string;
  tags?: string[] | string;
  body_html?: string;
  variants?: VarianteShopify[];
  images?: Array<{ src?: string }>;
};

// detalle: por qué se descartaron las prendas, cuando una tienda se leyó
// entera pero no quedó ninguna (queda en Errores del tablero).
type Lectura = { filas: Fila[]; completa: boolean; detalle?: string };

/**
 * Una prenda de Shopify como fila, o null si no sirve (agotada, sin foto,
 * de hombre...). Con `minimo`, solo si está rebajada más de eso; con
 * null, a cualquier precio ("Ver todo").
 */
export function filaShopify(t: Tienda, p: ProductoShopify, minimo: number | null): Fila | null {
  if (!p.title || !p.handle || !p.variants?.length) return null;
  // Precios en pesos (no en centavos, como en <url>.js).
  const r = precioDeVariantes(p.variants, false);
  if (!r || !r.disponible) return null;
  if (minimo !== null && (!r.precioAntesCop || porcentaje(r.precioCop, r.precioAntesCop) <= minimo)) return null;
  const tags = Array.isArray(p.tags) ? p.tags : String(p.tags ?? "").split(",").map((x) => x.trim());
  const tipo = clasificarPrenda({
    dominio: t.dominio,
    titulo: p.title,
    clase: p.product_type ?? "",
    tags,
    descripcion: p.body_html ?? "",
  });
  const imagen = p.images?.[0]?.src ?? null;
  if (!tipo || !imagen) return null;
  // La opción que es la talla ("Talla", "TALLA", "Sizes"...).
  const posicion = p.options?.find((o) => ES_OPCION_DE_TALLA.test(o.name ?? ""))?.position;
  const v = p.variants as Array<VarianteShopify & Record<string, unknown>>;
  const tallas = posicion
    ? juntarTallas(
        v
          .filter((x) => x.available !== false)
          .map((x) => ({
            talla: normalizarTalla(x[`option${posicion}`]),
            precio: Number(x.price),
            antes: x.compare_at_price ? Number(x.compare_at_price) : null,
            q: x.id ? `?variant=${x.id}` : "",
          }))
      )
    : null;
  return {
    // Con ?variant= la tienda abre justo la talla de ese precio.
    url: `https://${t.host}/products/${p.handle}${r.varianteId && p.variants.length > 1 ? `?variant=${r.varianteId}` : ""}`,
    dominio: t.dominio,
    tienda: t.nombre,
    titulo: p.title.trim(),
    imagen,
    tipo,
    precio_cop: r.precioCop,
    precio_antes_cop: r.precioAntesCop,
    descuento: r.precioAntesCop ? 1 - r.precioCop / r.precioAntesCop : 0,
    tallas,
  };
}

async function promosShopify(t: Tienda, hasta: number, aLaVez = PAGINAS_SHOPIFY_A_LA_VEZ): Promise<Lectura> {
  const filas: Fila[] = [];
  let incompleta = false;
  let tandasFallidas = 0;
  for (let primera = 1; primera <= 80; primera += aLaVez) {
    if (Date.now() > hasta) return { filas, completa: false };
    if (primera > 1) await esperar(PAUSA_SHOPIFY_MS);
    const leidas = await Promise.all(
      Array.from({ length: aLaVez }, (_, i) =>
        pagina(enColombia(`https://${t.host}/products.json?limit=250&page=${primera + i}`), (d) => (d as { products?: ProductoShopify[] }).products ?? [])
      )
    );
    // Si la primera página no responde, la tienda falló del todo.
    if (primera === 1 && leidas[0] === null) throw new Error(`no respondió (${ultimoError.get(t.host) ?? "sin detalle"})`);
    const paginas = leidas.filter((x): x is ProductoShopify[] => x !== null);
    for (const p of paginas.flat()) {
      const fila = filaShopify(t, p, MINIMO_PORCENTAJE);
      if (fila) filas.push(fila);
    }
    // Una página incompleta es la última.
    if (paginas.some((productos) => productos.length < 250)) return { filas, completa: !incompleta };
    // Una página que no respondió: se sigue con las demás (antes se
    // cortaba ahí y las rebajas de las páginas siguientes no llegaban),
    // pero sin borrar nada al final: no se sabe qué había en ella.
    if (paginas.length < leidas.length) {
      incompleta = true;
      if (++tandasFallidas >= 3) return { filas, completa: false };
      await esperar(5000);
    }
  }
  return { filas, completa: !incompleta };
}

// ---------------------------------------------------------- WooCommerce
/** Igual que filaShopify, para una prenda de WooCommerce. */
export function filaWoo(t: Tienda, p: ProductoWoo, minimo: number | null): Fila | null {
  if (!p.name || !p.permalink || !p.is_in_stock) return null;
  const { precio, antes } = precioWoo(p);
  if (!(precio > 0)) return null;
  if (minimo !== null && (!antes || porcentaje(precio, antes) <= minimo)) return null;
  const titulo = sinEntidades(p.name);
  const tipo = clasificarPrenda({
    dominio: t.dominio,
    titulo,
    clase: (p.categories ?? []).map((c) => c.name ?? "").join(" "),
    tags: (p.tags ?? []).map((x) => x.name ?? ""),
    descripcion: p.description ?? "",
  });
  const imagen = p.images?.[0]?.src ?? null;
  if (!tipo || !imagen) return null;
  // La API no dice el precio ni si hay de cada talla: todas al mismo precio.
  const atributo = p.attributes?.find((a) => ES_OPCION_DE_TALLA.test(a.name ?? ""));
  const tallas = atributo
    ? juntarTallas((atributo.terms ?? []).map((x) => ({ talla: normalizarTalla(x.name), precio, antes, q: "" })))
    : null;
  return {
    url: p.permalink,
    dominio: t.dominio,
    tienda: t.nombre,
    titulo,
    imagen,
    tipo,
    precio_cop: precio,
    precio_antes_cop: antes,
    descuento: antes ? 1 - precio / antes : 0,
    tallas,
  };
}

/** Igual que filaShopify, para una prenda de una tienda storefront. */
export function filaStorefront(t: Tienda, p: ProductoStorefront, minimo: number | null): Fila | null {
  if (!p.name || !p.slug) return null;
  // Sin ninguna talla a la venta, está agotada.
  if (Array.isArray(p.sizes) && p.sizes.length === 0) return null;
  const { precio, antes } = precioStorefront(p);
  if (!(precio > 0)) return null;
  if (minimo !== null && (!antes || porcentaje(precio, antes) <= minimo)) return null;
  const titulo = p.name.trim();
  const tipo = clasificarPrenda({ dominio: t.dominio, titulo, clase: "", tags: [], descripcion: p.description ?? "" });
  const imagen = imagenStorefront(t.host, p);
  if (!tipo || !imagen) return null;
  // La API no da el precio de cada talla: todas al mismo precio.
  const tallas = juntarTallas((p.sizes ?? []).map((x) => ({ talla: normalizarTalla(x), precio, antes, q: "" })));
  return {
    url: urlProductoStorefront(t.host, p.slug),
    dominio: t.dominio,
    tienda: t.nombre,
    titulo,
    imagen,
    tipo,
    precio_cop: precio,
    precio_antes_cop: antes,
    descuento: antes ? 1 - precio / antes : 0,
    tallas,
  };
}

/** Por qué una prenda storefront no quedó como promo (para el diagnóstico). */
function motivoStorefront(p: ProductoStorefront): string {
  if (!p.name || !p.slug) return "sin nombre";
  if (Array.isArray(p.sizes) && p.sizes.length === 0) return "sin tallas";
  if (p.currency && p.currency !== "COP") return `moneda ${p.currency}`;
  const { precio, antes } = precioStorefront(p);
  if (!(precio > 0)) return "sin precio";
  if (!antes) return "sin rebaja";
  return "rebaja de 10% o menos, sin tipo de prenda o sin foto";
}

async function promosStorefront(t: Tienda, hasta: number): Promise<Lectura> {
  const filas: Fila[] = [];
  const motivos = new Map<string, number>();
  let leidas = 0;
  const cerrar = (completa: boolean): Lectura => {
    // Se leyó la tienda pero no quedó nada: se dice por qué, para no
    // confundirlo con "la tienda no tiene rebajas" (Pepita Pérez, nov 2026).
    const detalle =
      filas.length === 0 && leidas > 0
        ? `${leidas} prendas leídas, ninguna quedó: ${Array.from(motivos, ([m, n]) => `${m} (${n})`).join(", ")}`
        : undefined;
    return { filas, completa, detalle };
  };
  for (let n = 1; n <= 40; n++) {
    if (Date.now() > hasta) return cerrar(false);
    const productos = await pagina(urlCatalogoStorefront(t.host, n), (d) => ((d as { products?: ProductoStorefront[] }).products ?? []));
    if (productos === null) {
      if (n === 1) throw new Error(`no respondió (${ultimoError.get(t.host) ?? "sin detalle"})`);
      return cerrar(false);
    }
    for (const p of productos) {
      leidas++;
      const fila = filaStorefront(t, p, MINIMO_PORCENTAJE);
      if (fila) filas.push(fila);
      else {
        const m = motivoStorefront(p);
        motivos.set(m, (motivos.get(m) ?? 0) + 1);
      }
    }
    if (productos.length < POR_PAGINA_STOREFRONT) return cerrar(true);
  }
  return cerrar(true);
}

const POR_PAGINA_WOO = 100;

async function promosWoo(t: Tienda, hasta: number): Promise<Lectura> {
  const filas: Fila[] = [];
  for (let n = 1; n <= 50; n++) {
    if (Date.now() > hasta) return { filas, completa: false };
    // on_sale: solo lo rebajado, así se leen muchas menos páginas.
    const productos = await pagina(
      `https://${t.host}/wp-json/wc/store/v1/products?on_sale=true&per_page=${POR_PAGINA_WOO}&page=${n}&${PRECIOS_DE_COLOMBIA}`,
      (d) => (Array.isArray(d) ? (d as ProductoWoo[]) : [])
    );
    if (productos === null) {
      if (n === 1) throw new Error(`no respondió (${ultimoError.get(t.host) ?? "sin detalle"})`);
      return { filas, completa: false };
    }
    for (const p of productos) {
      const fila = filaWoo(t, p, MINIMO_PORCENTAJE);
      if (fila) filas.push(fila);
    }
    if (productos.length < POR_PAGINA_WOO) return { filas, completa: true };
  }
  return { filas, completa: true };
}

// ------------------------------------------------------------------- VTEX
export type ProductoVtex = {
  productName?: string;
  linkText?: string;
  description?: string;
  categories?: string[];
  items?: Array<{
    itemId?: string;
    // Los nombres de las variaciones ("Color", "Talla") y, con ese mismo
    // nombre como clave, su valor: item["Talla"] = ["M"].
    variations?: string[];
    images?: Array<{ imageUrl?: string }>;
    sellers?: Array<{ commertialOffer?: { Price?: number; ListPrice?: number; AvailableQuantity?: number } }>;
    [variacion: string]: unknown;
  }>;
};

/**
 * 50 prendas de la lista. Hay tiendas (Vélez, Studio F, Tennis) que
 * responden 500 siempre en los mismos tramos, seguramente por una prenda
 * dañada: ahí se pide de a 10 para saltarse solo ese pedazo. `fallo`
 * avisa que algo se quedó sin leer.
 */
export async function tramoVtex(
  t: Tienda,
  desde: number,
  orden = "OrderByBestDiscountDESC"
): Promise<{ productos: ProductoVtex[]; fallo: boolean } | null> {
  const url = (d: number, n: number) =>
    `https://${t.host}/api/catalog_system/pub/products/search?O=${orden}&_from=${d}&_to=${d + n - 1}`;
  const comoLista = (x: unknown) => (Array.isArray(x) ? (x as ProductoVtex[]) : []);
  const entero = await pagina(url(desde, 50), comoLista);
  if (entero) return { productos: entero, fallo: false };
  const pedazos = await Promise.all([0, 10, 20, 30, 40].map((i) => pagina(url(desde + i, 10), comoLista)));
  if (pedazos.every((p) => p === null)) return null;
  return { productos: pedazos.flatMap((p) => p ?? []), fallo: pedazos.some((p) => p === null) };
}

/** Igual que filaShopify, para una prenda de VTEX. */
export function filaVtex(t: Tienda, p: ProductoVtex, minimo: number | null): Fila | null {
  if (!p.productName || !p.linkText) return null;
  const ofertas = (p.items ?? []).map((i) => ({ item: i, o: i.sellers?.[0]?.commertialOffer }));
  // La talla disponible más económica.
  const disponibles = ofertas.filter(({ o }) => o?.Price && o.Price > 0 && (o.AvailableQuantity ?? 0) > 0);
  if (disponibles.length === 0) return null;
  const elegida = disponibles.reduce((a, b) => (b.o!.Price! < a.o!.Price! ? b : a));
  const precio = Math.round(elegida.o!.Price!);
  const antes = Math.round(elegida.o!.ListPrice ?? 0);
  const rebajada = antes > precio;
  if (minimo !== null && (!rebajada || porcentaje(precio, antes) <= minimo)) return null;
  const tipo = clasificarPrenda({
    dominio: t.dominio,
    titulo: p.productName,
    clase: (p.categories ?? []).join(" "),
    tags: [p.linkText],
    descripcion: p.description ?? "",
  });
  const imagen = elegida.item.images?.[0]?.imageUrl ?? p.items?.[0]?.images?.[0]?.imageUrl ?? null;
  if (!tipo || !imagen) return null;
  const conTalla = (p.items?.length ?? 0) > 1 && elegida.item.itemId ? `?skuId=${elegida.item.itemId}` : "";
  const tallas = juntarTallas(
    disponibles.map(({ item, o }) => {
      const clave = (item.variations ?? []).find((n) => ES_OPCION_DE_TALLA.test(n));
      const valor = clave ? (item[clave] as unknown[] | undefined)?.[0] : null;
      return {
        talla: normalizarTalla(valor),
        precio: o!.Price!,
        antes: o!.ListPrice ?? null,
        q: item.itemId ? `?skuId=${item.itemId}` : "",
      };
    })
  );
  return {
    url: `https://${t.host}/${p.linkText}/p${conTalla}`,
    dominio: t.dominio,
    tienda: t.nombre,
    titulo: p.productName.trim(),
    imagen,
    tipo,
    precio_cop: precio,
    precio_antes_cop: rebajada ? antes : null,
    descuento: rebajada ? 1 - precio / antes : 0,
    tallas,
  };
}

async function promosVtex(t: Tienda, hasta: number): Promise<Lectura> {
  const filas: Fila[] = [];
  // Alguna página no respondió: se sigue, pero sin borrar nada al final.
  let incompleta = false;
  for (let desde = 0; desde < VTEX_MAXIMO; desde += 50 * PAGINAS_A_LA_VEZ) {
    if (Date.now() > hasta) return { filas, completa: false };
    const leidas = await Promise.all(
      Array.from({ length: PAGINAS_A_LA_VEZ }, (_, i) => desde + i * 50)
        .filter((d) => d < VTEX_MAXIMO)
        .map((d) => tramoVtex(t, d))
    );
    if (desde === 0 && leidas[0] === null) throw new Error("no respondió");
    if (leidas.some((x) => x === null || x.fallo)) incompleta = true;
    const paginas = leidas.map((x) => x?.productos ?? []);
    const data = paginas.flat();
    if (data.length === 0 && leidas.every((x) => x !== null)) break;

    // La mejor rebaja de la última página que respondió, contando
    // también tallas agotadas: la tienda ordena así, y si ya no queda
    // ninguna de más de 10%, de ahí para abajo tampoco.
    let mejorDeLaPagina = 0;
    const ultima = new Set([...paginas].reverse().find((p) => p.length > 0) ?? []);
    for (const p of data) {
      const ofertas = (p.items ?? []).map((i) => ({ item: i, o: i.sellers?.[0]?.commertialOffer }));
      for (const { o } of ofertas) {
        if (ultima.has(p) && o?.Price && o.ListPrice && o.ListPrice > o.Price) {
          mejorDeLaPagina = Math.max(mejorDeLaPagina, porcentaje(o.Price, o.ListPrice));
        }
      }
      const fila = filaVtex(t, p, MINIMO_PORCENTAJE);
      if (fila) filas.push(fila);
    }
    if (ultima.size > 0 && mejorDeLaPagina <= MINIMO_PORCENTAJE) break;
    // Una página corta (sin fallas) es el final de la lista.
    if (leidas.some((x) => x !== null && !x.fallo && x.productos.length < 50)) break;
  }
  return { filas, completa: !incompleta };
}

// --------------------------------------------------------------- guardar
async function guardar(dominio: string, { filas, completa }: Lectura, inicio: string): Promise<void> {
  const sb = supabaseAdmin();
  // La misma prenda puede salir dos veces (VTEX la repite entre páginas).
  const unicas = Array.from(new Map(filas.map((f) => [f.url, { ...f, vista_at: inicio }])).values());
  for (let i = 0; i < unicas.length; i += 500) {
    const lote = unicas.slice(i, i + 500);
    let { error } = await sb.from("promos").upsert(lote, { onConflict: "url" });
    // Sin la migración de tallas, la columna no existe: se guarda sin ellas.
    if (error && /tallas/.test(error.message)) {
      ({ error } = await sb.from("promos").upsert(lote.map(({ tallas: _t, ...resto }) => resto), { onConflict: "url" }));
    }
    if (error) throw new Error(error.message);
  }
  // Lo que ya no está rebajado (o se agotó) no vino hoy: se borra. Solo
  // si se alcanzó a leer la tienda entera: si se acabó el tiempo a mitad
  // de camino, lo de las páginas que faltaron sigue hasta mañana. Y si
  // la tienda falló, ni se llega aquí.
  if (!completa) return;
  const { error } = await sb.from("promos").delete().eq("dominio", dominio).lt("vista_at", inicio);
  if (error) throw new Error(error.message);
}

export type ResumenTienda = { tienda: string; promos: number; ok: boolean; completa?: boolean; error?: string; detalle?: string };

/** Revisa las tiendas de un lote (todas a la vez) y guarda sus promos. */
export async function actualizarLote(lote: number): Promise<ResumenTienda[]> {
  const inicio = new Date().toISOString();
  const hasta = Date.now() + TIEMPO_MS;
  const tiendas = tiendasParaPromos().filter((_, i) => i % LOTES === lote);
  return Promise.all(
    tiendas.map(async (t): Promise<ResumenTienda> => {
      const leer = (aLaVez?: number) =>
        t.plataforma === "shopify"
          ? promosShopify(t, hasta, aLaVez)
          : t.plataforma === "woo"
            ? promosWoo(t, hasta)
            : t.plataforma === "storefront"
              ? promosStorefront(t, hasta)
              : promosVtex(t, hasta);
      ultimoError.delete(t.host);
      try {
        let lectura: Lectura;
        try {
          lectura = await leer();
        } catch (primero) {
          // Una tienda que no respondió (o que frena varias páginas a la
          // vez) se intenta otra vez, de a una página, si queda tiempo.
          // Casa Precis tenía promos pero nunca quedaba guardada.
          if (Date.now() > hasta - 10_000) throw primero;
          await new Promise((listo) => setTimeout(listo, 2000));
          lectura = await leer(1);
        }
        await guardar(t.dominio, lectura, inicio);
        // Se leyó solo una parte porque la tienda frenó: queda en Errores.
        const frenada = ultimoError.get(t.host);
        if (!lectura.completa && frenada) {
          await registrar("promos_tienda_error", {}, { tienda: t.nombre, motivo: `${t.nombre}: lectura incompleta (${frenada})` });
        }
        if (lectura.detalle) {
          await registrar("promos_tienda_error", {}, { tienda: t.nombre, motivo: `${t.nombre}: ${lectura.detalle}`.slice(0, 300) });
        }
        return { tienda: t.nombre, promos: lectura.filas.length, ok: true, completa: lectura.completa, detalle: lectura.detalle };
      } catch (e) {
        console.error(`[promos-diarias] ${t.nombre}:`, e);
        const error = String((e as Error).message ?? e).slice(0, 120);
        // Queda en Errores del tablero: qué tienda y por qué no se pudo.
        await registrar("promos_tienda_error", {}, { tienda: t.nombre, motivo: `${t.nombre}: ${error}` });
        return { tienda: t.nombre, promos: 0, ok: false, error };
      }
    })
  );
}

/** Lee las promos de una tienda sin guardar nada (para revisar a mano). */
export async function leerPromosDeTienda(dominio: string): Promise<Lectura | null> {
  const t = tiendasParaPromos().find((x) => x.dominio === dominio);
  if (!t) return null;
  const hasta = Date.now() + TIEMPO_MS;
  return t.plataforma === "shopify"
    ? promosShopify(t, hasta)
    : t.plataforma === "woo"
      ? promosWoo(t, hasta)
      : t.plataforma === "storefront"
        ? promosStorefront(t, hasta)
        : promosVtex(t, hasta);
}
