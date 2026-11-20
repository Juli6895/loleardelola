import { precioDeVariantes, precioWoo, PRECIOS_DE_COLOMBIA, tiendaDeUrl, type ProductoWoo, type VarianteShopify } from "./catalogo-tiendas";

// =====================================================================
// El precio de HOY de una prenda puntual (para los avisos de rebaja)
// =====================================================================
// Solo para prendas de las tiendas de la lista (lib/catalogo-tiendas):
// con cualquier otra URL no se pregunta nada. Así el revisor diario no
// sale a pedir páginas que alguien haya inventado.
//
// - Shopify publica cada producto en "<url>.js", con el precio en
//   centavos y si está disponible.
// - VTEX lo responde en su API de catálogo, buscando por el linkText de
//   la URL (".../<linkText>/p").
// =====================================================================

export type PrecioHoy = { precioCop: number; disponible: boolean };

/** Cuánto tiene que bajar para avisar: 10% desde que le dio corazón. */
export const REBAJA_MINIMA = 0.1;

/**
 * Con el precio de hoy, ¿hay que avisar? Y cómo queda guardado. Si el
 * precio volvió a subir, se olvida el aviso anterior: así, si vuelve a
 * bajar, se avisa otra vez (antes solo se avisaba la primera rebaja).
 */
export function compararPrecio(
  s: { precio_inicial: number; precio_avisado: number | null },
  hoy: PrecioHoy
): { avisar: boolean; cambios: Record<string, unknown> } {
  const umbral = s.precio_inicial * (1 - REBAJA_MINIMA);
  const ahora = new Date().toISOString();
  const bajo = hoy.disponible && hoy.precioCop <= umbral && hoy.precioCop < (s.precio_avisado ?? Infinity);
  const cambios: Record<string, unknown> = { precio_ultimo: hoy.precioCop, revisado_at: ahora };
  if (bajo) Object.assign(cambios, { precio_avisado: hoy.precioCop, avisado_at: ahora });
  else if (s.precio_avisado !== null && hoy.precioCop > umbral) cambios.precio_avisado = null;
  return { avisar: bajo, cambios };
}

async function pedir(url: string): Promise<Response> {
  return fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

export async function precioActual(url: string): Promise<PrecioHoy | null> {
  const tienda = tiendaDeUrl(url);
  if (!tienda) return null;

  try {
    if (tienda.plataforma === "shopify") {
      const limpia = url.split(/[?#]/)[0].replace(/\/$/, "");
      const res = await pedir(`${limpia}.js`);
      if (!res.ok) return null;
      // La talla del enlace (?variant=) si viene; si no, la disponible
      // más económica. "price" es el de la talla más barata aunque esté
      // agotada (ver precioDeVariantes).
      const p = (await res.json()) as { variants?: VarianteShopify[] };
      const pedida = Number(new URL(url).searchParams.get("variant"));
      const deLaTalla = (p.variants ?? []).filter((v) => v.id === pedida);
      const r = precioDeVariantes(deLaTalla.length > 0 ? deLaTalla : (p.variants ?? []), true);
      return r ? { precioCop: r.precioCop, disponible: r.disponible } : null;
    }

    if (tienda.plataforma === "woo") {
      // /producto/<slug>/ → la prenda por su slug.
      const { origin, pathname } = new URL(url);
      const slug = pathname.split("/").filter(Boolean).pop();
      if (!slug) return null;
      const res = await pedir(`${origin}/wp-json/wc/store/v1/products?slug=${encodeURIComponent(slug)}&${PRECIOS_DE_COLOMBIA}`);
      if (!res.ok) return null;
      const p = ((await res.json()) as ProductoWoo[])?.[0];
      if (!p) return null;
      const { precio } = precioWoo(p);
      return precio > 0 ? { precioCop: precio, disponible: !!p.is_in_stock } : null;
    }

    const { origin, pathname } = new URL(url);
    const linkText = pathname.replace(/^\//, "").replace(/\/p\/?$/, "");
    if (!linkText) return null;
    const res = await pedir(`${origin}/api/catalog_system/pub/products/search/${encodeURIComponent(linkText)}/p`);
    if (!res.ok) return null;
    const lista = (await res.json()) as Array<{
      items?: Array<{ sellers?: Array<{ commertialOffer?: { Price?: number; AvailableQuantity?: number } }> }>;
    }>;
    // La primera talla disponible; si ninguna lo está, la primera.
    const ofertas = (lista?.[0]?.items ?? []).map((i) => i.sellers?.[0]?.commertialOffer).filter(Boolean);
    const oferta = ofertas.find((o) => (o!.AvailableQuantity ?? 1) > 0) ?? ofertas[0];
    if (!oferta || typeof oferta.Price !== "number" || oferta.Price <= 0) return null;
    return { precioCop: Math.round(oferta.Price), disponible: (oferta.AvailableQuantity ?? 1) > 0 };
  } catch {
    return null;
  }
}
