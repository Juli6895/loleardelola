import { tiendaDeUrl } from "./catalogo-tiendas";

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
      const p = (await res.json()) as { price?: number; available?: boolean };
      if (typeof p.price !== "number" || p.price <= 0) return null;
      return { precioCop: Math.round(p.price / 100), disponible: p.available !== false };
    }

    const { origin, pathname } = new URL(url);
    const linkText = pathname.replace(/^\//, "").replace(/\/p\/?$/, "");
    if (!linkText) return null;
    const res = await pedir(`${origin}/api/catalog_system/pub/products/search/${encodeURIComponent(linkText)}/p`);
    if (!res.ok) return null;
    const lista = (await res.json()) as Array<{
      items?: Array<{ sellers?: Array<{ commertialOffer?: { Price?: number; AvailableQuantity?: number } }> }>;
    }>;
    const oferta = lista?.[0]?.items?.[0]?.sellers?.[0]?.commertialOffer;
    if (!oferta || typeof oferta.Price !== "number" || oferta.Price <= 0) return null;
    return { precioCop: Math.round(oferta.Price), disponible: (oferta.AvailableQuantity ?? 1) > 0 };
  } catch {
    return null;
  }
}
