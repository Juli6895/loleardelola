import { supabaseAdmin } from "./supabase";
import { clasificarPrenda, precioDeVariantes, tiendasParaPromos, type VarianteShopify } from "./catalogo-tiendas";

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

type Fila = {
  url: string;
  dominio: string;
  tienda: string;
  titulo: string;
  imagen: string | null;
  tipo: string;
  precio_cop: number;
  precio_antes_cop: number;
  descuento: number;
};

type Tienda = ReturnType<typeof tiendasParaPromos>[number];

async function pedirJson(url: string, intento = 1): Promise<unknown> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: { "user-agent": "LoleardLola/1.0 (+https://loleardelola.vercel.app)", accept: "application/json" },
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    return await res.json();
  } catch (e) {
    // Studio F a veces responde 500 en una página y a la siguiente no.
    if (intento < 3) {
      await new Promise((listo) => setTimeout(listo, 700 * intento));
      return pedirJson(url, intento + 1);
    }
    throw e;
  }
}

// Páginas que se piden a la vez por tienda: Malva tiene miles de
// productos y de a una no alcanzaba en el minuto de la función.
const PAGINAS_A_LA_VEZ = 4;

/** La página, o null si no respondió ni reintentando. */
async function pagina<T>(url: string, sacar: (x: unknown) => T[]): Promise<T[] | null> {
  try {
    return sacar(await pedirJson(url));
  } catch (e) {
    console.warn(`[promos-diarias] ${url}:`, (e as Error).message);
    return null;
  }
}

const porcentaje = (precio: number, antes: number) => Math.round((1 - precio / antes) * 100);

// ---------------------------------------------------------------- Shopify
type ProductoShopify = {
  title?: string;
  handle?: string;
  product_type?: string;
  tags?: string[] | string;
  body_html?: string;
  variants?: VarianteShopify[];
  images?: Array<{ src?: string }>;
};

type Lectura = { filas: Fila[]; completa: boolean };

async function promosShopify(t: Tienda, hasta: number): Promise<Lectura> {
  const filas: Fila[] = [];
  for (let primera = 1; primera <= 80; primera += PAGINAS_A_LA_VEZ) {
    if (Date.now() > hasta) return { filas, completa: false };
    const leidas = await Promise.all(
      Array.from({ length: PAGINAS_A_LA_VEZ }, (_, i) =>
        pagina(`https://${t.host}/products.json?limit=250&page=${primera + i}`, (d) => (d as { products?: ProductoShopify[] }).products ?? [])
      )
    );
    // Si la primera página no responde, la tienda falló del todo.
    if (primera === 1 && leidas[0] === null) throw new Error("no respondió");
    const paginas = leidas.map((x) => x ?? []);
    for (const p of paginas.flat()) {
      if (!p.title || !p.handle || !p.variants?.length) continue;
      // Precios en pesos (no en centavos, como en <url>.js).
      const r = precioDeVariantes(p.variants, false);
      if (!r || !r.disponible || !r.precioAntesCop) continue;
      if (porcentaje(r.precioCop, r.precioAntesCop) <= MINIMO_PORCENTAJE) continue;
      const tags = Array.isArray(p.tags) ? p.tags : String(p.tags ?? "").split(",").map((x) => x.trim());
      const tipo = clasificarPrenda({
        dominio: t.dominio,
        titulo: p.title,
        clase: p.product_type ?? "",
        tags,
        descripcion: p.body_html ?? "",
      });
      const imagen = p.images?.[0]?.src ?? null;
      if (!tipo || !imagen) continue;
      filas.push({
        // Con ?variant= la tienda abre justo la talla de ese precio.
        url: `https://${t.host}/products/${p.handle}${r.varianteId && p.variants.length > 1 ? `?variant=${r.varianteId}` : ""}`,
        dominio: t.dominio,
        tienda: t.nombre,
        titulo: p.title.trim(),
        imagen,
        tipo,
        precio_cop: r.precioCop,
        precio_antes_cop: r.precioAntesCop,
        descuento: 1 - r.precioCop / r.precioAntesCop,
      });
    }
    // Una página que no respondió: lo leído se guarda, pero sin borrar
    // nada (no se sabe qué había en ella).
    if (leidas.some((x) => x === null)) return { filas, completa: false };
    // Una página incompleta es la última.
    if (paginas.some((productos) => productos.length < 250)) return { filas, completa: true };
  }
  return { filas, completa: true };
}

// ------------------------------------------------------------------- VTEX
type ProductoVtex = {
  productName?: string;
  linkText?: string;
  description?: string;
  categories?: string[];
  items?: Array<{
    itemId?: string;
    images?: Array<{ imageUrl?: string }>;
    sellers?: Array<{ commertialOffer?: { Price?: number; ListPrice?: number; AvailableQuantity?: number } }>;
  }>;
};

/**
 * 50 prendas de la lista. Hay tiendas (Vélez, Studio F, Tennis) que
 * responden 500 siempre en los mismos tramos, seguramente por una prenda
 * dañada: ahí se pide de a 10 para saltarse solo ese pedazo. `fallo`
 * avisa que algo se quedó sin leer.
 */
async function tramoVtex(t: Tienda, desde: number): Promise<{ productos: ProductoVtex[]; fallo: boolean } | null> {
  const url = (d: number, n: number) =>
    `https://${t.host}/api/catalog_system/pub/products/search?O=OrderByBestDiscountDESC&_from=${d}&_to=${d + n - 1}`;
  const comoLista = (x: unknown) => (Array.isArray(x) ? (x as ProductoVtex[]) : []);
  const entero = await pagina(url(desde, 50), comoLista);
  if (entero) return { productos: entero, fallo: false };
  const pedazos = await Promise.all([0, 10, 20, 30, 40].map((i) => pagina(url(desde + i, 10), comoLista)));
  if (pedazos.every((p) => p === null)) return null;
  return { productos: pedazos.flatMap((p) => p ?? []), fallo: pedazos.some((p) => p === null) };
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
      if (!p.productName || !p.linkText) continue;
      // La talla disponible más económica.
      const disponibles = ofertas.filter(({ o }) => o?.Price && o.Price > 0 && (o.AvailableQuantity ?? 0) > 0);
      if (disponibles.length === 0) continue;
      const elegida = disponibles.reduce((a, b) => (b.o!.Price! < a.o!.Price! ? b : a));
      const precio = Math.round(elegida.o!.Price!);
      const antes = Math.round(elegida.o!.ListPrice ?? 0);
      if (!(antes > precio) || porcentaje(precio, antes) <= MINIMO_PORCENTAJE) continue;
      const tipo = clasificarPrenda({
        dominio: t.dominio,
        titulo: p.productName,
        clase: (p.categories ?? []).join(" "),
        tags: [p.linkText],
        descripcion: p.description ?? "",
      });
      const imagen = elegida.item.images?.[0]?.imageUrl ?? p.items?.[0]?.images?.[0]?.imageUrl ?? null;
      if (!tipo || !imagen) continue;
      const conTalla = (p.items?.length ?? 0) > 1 && elegida.item.itemId ? `?skuId=${elegida.item.itemId}` : "";
      filas.push({
        url: `https://${t.host}/${p.linkText}/p${conTalla}`,
        dominio: t.dominio,
        tienda: t.nombre,
        titulo: p.productName.trim(),
        imagen,
        tipo,
        precio_cop: precio,
        precio_antes_cop: antes,
        descuento: 1 - precio / antes,
      });
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
    const { error } = await sb.from("promos").upsert(unicas.slice(i, i + 500), { onConflict: "url" });
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

export type ResumenTienda = { tienda: string; promos: number; ok: boolean; completa?: boolean; error?: string };

/** Revisa las tiendas de un lote (todas a la vez) y guarda sus promos. */
export async function actualizarLote(lote: number): Promise<ResumenTienda[]> {
  const inicio = new Date().toISOString();
  const hasta = Date.now() + TIEMPO_MS;
  const tiendas = tiendasParaPromos().filter((_, i) => i % LOTES === lote);
  return Promise.all(
    tiendas.map(async (t): Promise<ResumenTienda> => {
      try {
        const lectura = t.plataforma === "shopify" ? await promosShopify(t, hasta) : await promosVtex(t, hasta);
        await guardar(t.dominio, lectura, inicio);
        return { tienda: t.nombre, promos: lectura.filas.length, ok: true, completa: lectura.completa };
      } catch (e) {
        console.error(`[promos-diarias] ${t.nombre}:`, e);
        return { tienda: t.nombre, promos: 0, ok: false, error: String((e as Error).message ?? e).slice(0, 120) };
      }
    })
  );
}

/** Lee las promos de una tienda sin guardar nada (para revisar a mano). */
export async function leerPromosDeTienda(dominio: string): Promise<Lectura | null> {
  const t = tiendasParaPromos().find((x) => x.dominio === dominio);
  if (!t) return null;
  const hasta = Date.now() + TIEMPO_MS;
  return t.plataforma === "shopify" ? promosShopify(t, hasta) : promosVtex(t, hasta);
}
