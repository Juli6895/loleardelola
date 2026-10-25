import { precioDeVariantes, tiendaDeUrl, type VarianteShopify } from "./catalogo-tiendas";

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
      // El precio de la talla disponible más barata: "price" es el de la
      // talla más barata aunque esté agotada (ver precioDeVariantes).
      const p = (await res.json()) as { variants?: VarianteShopify[] };
      const r = precioDeVariantes(p.variants ?? [], true);
      return r ? { precioCop: r.precioCop, disponible: r.disponible } : null;
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
