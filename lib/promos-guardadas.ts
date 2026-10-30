import { supabaseAdmin } from "./supabase";
import { buscarPromos, tiendasParaPromos, tipoNormalizado, type ProductoTienda } from "./catalogo-tiendas";
import type { TallaPromo } from "./promos-diarias";

// =====================================================================
// Las promociones que dejó la revisión diaria (lib/promos-diarias.ts)
// =====================================================================
// Se leen todas de una vez y se guardan en memoria media hora: cambian
// una vez al día, y así cada visita no es una consulta a la base. Si la
// tabla todavía no existe o está vacía (antes de la primera revisión),
// se buscan en vivo como antes.
// =====================================================================

export type Promo = ProductoTienda & { tipo: string | null; tallas?: TallaPromo[] | null };

export type GrupoMarca = {
  dominio: string;
  tienda: string;
  total: number;
  // Las más rebajadas, para la vista previa de la marca.
  promos: Promo[];
};

const CACHE_MS = 30 * 60 * 1000;
let cache: { promos: Promo[]; expira: number } | null = null;

async function desdeLaBase(): Promise<Promo[]> {
  const sb = supabaseAdmin();
  const vigentes = new Set(tiendasParaPromos().map((t) => t.dominio));
  const promos: Promo[] = [];
  // Con las tallas; si la migración de tallas no se ha corrido, sin ellas.
  let columnas = "url, dominio, tienda, titulo, imagen, tipo, precio_cop, precio_antes_cop, tallas";
  for (let desde = 0; desde < 30_000; desde += 1000) {
    let { data, error } = await sb
      .from("promos")
      .select(columnas)
      .order("descuento", { ascending: false })
      .order("url", { ascending: true })
      .range(desde, desde + 999);
    if (error && /tallas/.test(error.message)) {
      columnas = "url, dominio, tienda, titulo, imagen, tipo, precio_cop, precio_antes_cop";
      ({ data, error } = await sb
        .from("promos")
        .select(columnas)
        .order("descuento", { ascending: false })
        .order("url", { ascending: true })
        .range(desde, desde + 999));
    }
    if (error) throw new Error(error.message);
    for (const f of (data ?? []) as any[]) {
      // Una tienda que se quitó de la lista deja de salir de una vez.
      if (!vigentes.has(f.dominio)) continue;
      promos.push({
        url: f.url,
        dominio: f.dominio,
        tienda: f.tienda,
        titulo: f.titulo,
        imagen: f.imagen,
        tipo: f.tipo,
        precioCop: f.precio_cop,
        precioAntesCop: f.precio_antes_cop,
        tallas: f.tallas ?? null,
      });
    }
    if (!data || data.length < 1000) break;
  }
  return promos;
}

/** Todas las promos, de la más rebajada a la menos. */
export async function todasLasPromos(): Promise<Promo[]> {
  if (cache && cache.expira > Date.now()) return cache.promos;
  let promos: Promo[] = [];
  try {
    promos = await desdeLaBase();
  } catch (e) {
    console.warn("[promos-guardadas] sin tabla de promos todavía:", (e as Error).message);
  }
  if (promos.length === 0) {
    // Antes de la primera revisión diaria: en vivo, como antes.
    promos = (await buscarPromos([], Infinity, 6)).map((p) => ({ ...p, tipo: null }));
    cache = { promos, expira: Date.now() + 5 * 60 * 1000 };
    return promos;
  }
  cache = { promos, expira: Date.now() + CACHE_MS };
  return promos;
}

/** Filtra por tipos de prenda (los de la búsqueda); sin tipos, todas. */
export function deLosTipos(promos: Promo[], tipos: string[]): Promo[] {
  if (tipos.length === 0) return promos;
  const buscados = new Set(tipos.map(tipoNormalizado));
  return promos.filter((p) => p.tipo && buscados.has(p.tipo));
}

/** Agrupadas por marca: las de más descuento primero. */
export function porMarca(promos: Promo[], vistaPrevia: number): GrupoMarca[] {
  const grupos = new Map<string, GrupoMarca>();
  for (const p of promos) {
    const g = grupos.get(p.dominio) ?? { dominio: p.dominio, tienda: p.tienda, total: 0, promos: [] };
    g.total++;
    if (g.promos.length < vistaPrevia) g.promos.push(p);
    grupos.set(p.dominio, g);
  }
  // Las promos ya vienen de la más rebajada a la menos, así que el orden
  // en que aparece cada marca es el de su mejor rebaja.
  return Array.from(grupos.values());
}

// ---------------------------------------------------------------------
// Filtros de la página de Promociones: tipo de prenda y talla
// ---------------------------------------------------------------------
const MINIMO = 10;
const porcentaje = (p: number, a: number) => Math.round((1 - p / a) * 100);

/**
 * Solo las de esos tipos (sin tipos, todas) y, si hay tallas, solo las
 * que tienen alguna de esas tallas disponible Y rebajada más de 10%. En
 * ese caso el precio y el enlace pasan a ser los de esa talla, para que
 * al entrar a la tienda se vea lo mismo.
 */
export function filtrar(promos: Promo[], tipos: string[], tallas: string[]): Promo[] {
  const conTipo = tipos.length > 0 ? deLosTipos(promos, tipos) : promos;
  if (tallas.length === 0) return conTipo;
  const buscadas = new Set(tallas);
  const salida: Promo[] = [];
  for (const p of conTipo) {
    const sirven = (p.tallas ?? []).filter((t) => buscadas.has(t.t) && t.a && porcentaje(t.p, t.a) > MINIMO);
    if (sirven.length === 0) continue;
    const t = sirven.reduce((x, y) => (y.p < x.p ? y : x));
    salida.push({ ...p, precioCop: t.p, precioAntesCop: t.a, url: p.url.split("?")[0] + t.q });
  }
  // El descuento pudo cambiar con la talla: de nuevo, de mayor a menor.
  const desc = (p: Promo) => (p.precioCop && p.precioAntesCop ? 1 - p.precioCop / p.precioAntesCop : 0);
  return salida.sort((a, b) => desc(b) - desc(a));
}

/**
 * Cuántas promos hay de cada tipo y de cada talla, para los botones del
 * filtro. Los tipos se cuentan con la talla escogida, y las tallas con
 * los tipos escogidos: así el número dice cuántas va a ver al tocarlo.
 */
export function facetas(promos: Promo[], tipos: string[], tallas: string[]) {
  const porTipo = new Map<string, number>();
  for (const p of filtrar(promos, [], tallas)) if (p.tipo) porTipo.set(p.tipo, (porTipo.get(p.tipo) ?? 0) + 1);
  const porTalla = new Map<string, number>();
  for (const p of filtrar(promos, tipos, [])) {
    for (const t of p.tallas ?? []) {
      if (t.a && porcentaje(t.p, t.a) > MINIMO) porTalla.set(t.t, (porTalla.get(t.t) ?? 0) + 1);
    }
  }
  return {
    tipos: Array.from(porTipo, ([tipo, n]) => ({ tipo, n })).sort((a, b) => b.n - a.n),
    tallas: Array.from(porTalla, ([talla, n]) => ({ talla, n })),
  };
}
