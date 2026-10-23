"use client";

import type { ClosetCategory, TiendaInstagram } from "@/types";
import type { ProductoTienda } from "@/lib/use-catalogo";
import { prendaDeTienda, type GrupoProductos } from "@/lib/use-catalogo";
import { anotarClicComercio } from "@/lib/use-evento";

type Props = {
  tiendas: TiendaInstagram[];
  // Categorías de las prendas que se detectaron en la foto.
  categorias: ClosetCategory[];
  // Prendas encontradas en los catálogos. De Instagram no se pueden
  // sacar fotos, pero si la tienda tiene web con catálogo, se muestra
  // una prenda suya de verdad — la más parecida a la de la foto.
  grupos: GrupoProductos[];
  // Del mismo tipo y color pero sin exigir el estampado: si la tienda no
  // tiene nada idéntico, igual se muestra una prenda suya de ese tipo.
  flexibles: GrupoProductos[];
};

type Tarjeta = {
  clave: string;
  nombre: string;
  handle: string | null;
  ciudad: string | null;
  dominio: string | null;
  prenda: ProductoTienda | null;
};

// Las tiendas donde vale la pena buscar este tipo de prenda. Antes solo
// salían las del directorio de Instagram; las tiendas que solo tienen
// página web (y de las que sí tenemos el catálogo) quedaban por fuera
// aunque tuvieran justo una prenda parecida. Ahora salen las dos:
// - las de Instagram, con su Instagram y, si tienen, su página;
// - las de catálogo que trajeron una prenda parecida, con su página.
// No afirma que tengan esa prenda exacta en stock: el copy lo dice.
export default function TiendasInstagram({ tiendas, categorias, grupos, flexibles }: Props) {
  if (categorias.length === 0) return null;

  const deInstagram: Tarjeta[] = tiendas
    .filter((t) => t.categorias.some((c) => categorias.includes(c)))
    .map((t) => ({
      clave: t.handle,
      nombre: t.nombre,
      handle: t.handle,
      ciudad: t.ciudad,
      dominio: t.dominio,
      prenda: prendaDeTienda(grupos, t.dominio) ?? prendaDeTienda(flexibles, t.dominio),
    }));

  // Una por tienda: primero lo que encontró la búsqueda estricta (lo más
  // parecido), después la flexible.
  const yaEstan = new Set(deInstagram.map((t) => t.dominio).filter(Boolean));
  const soloWeb = new Map<string, Tarjeta>();
  for (const g of [...grupos, ...flexibles]) {
    for (const p of g.productos) {
      if (yaEstan.has(p.dominio) || soloWeb.has(p.dominio)) continue;
      soloWeb.set(p.dominio, {
        clave: p.dominio,
        nombre: p.tienda,
        handle: null,
        ciudad: null,
        dominio: p.dominio,
        prenda: p,
      });
    }
  }

  const tarjetas = [...deInstagram, ...Array.from(soloWeb.values())];
  if (tarjetas.length === 0) return null;

  return (
    <div className="mt-8 border-t border-rosa-100 pt-6">
      <h3 className="font-display text-xl text-noche">Tiendas para chismosear</h3>
      <p className="mt-1 text-xs text-noche/50">
        Venden este tipo de prendas, en Instagram o en su página. No sabemos si tienen justo esta,
        pero vale la pena mirarlas.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {tarjetas.map((t) => {
          const pagina = t.prenda?.url ?? (t.dominio ? `https://${t.dominio}` : null);
          return (
            <div
              key={t.clave}
              className="flex items-center gap-3 rounded-xl border border-rosa-100 bg-white px-4 py-3"
            >
              {t.prenda?.imagen ? (
                // La foto es de su catálogo web, no de Instagram — de ahí
                // no se pueden sacar imágenes. Es una prenda suya de
                // verdad, parecida a la de la foto.
                <span className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-rosa-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.prenda.imagen}
                    alt={t.prenda.titulo}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </span>
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rosa-300 to-rosa-500 text-sm font-semibold text-white">
                  {t.nombre.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-noche">{t.nombre}</span>
                <span className="block truncate text-xs text-noche/50">
                  {t.handle ? `@${t.handle}` : t.dominio}
                  {t.ciudad && ` · ${t.ciudad}`}
                </span>
                {t.prenda && (
                  <span className="mt-0.5 block truncate text-xs text-rosa-500">{t.prenda.titulo}</span>
                )}
                <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  {t.handle && (
                    <a
                      href={`https://www.instagram.com/${t.handle}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        anotarClicComercio({ tienda: t.nombre, dominio: t.dominio ?? t.handle!, origen: "instagram" })
                      }
                      className="text-xs font-medium text-rosa-600 underline-offset-2 hover:underline"
                    >
                      Instagram
                    </a>
                  )}
                  {pagina && (
                    <a
                      href={pagina}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        anotarClicComercio({ tienda: t.nombre, dominio: t.dominio ?? t.nombre, origen: "pagina" })
                      }
                      className="text-xs font-medium text-rosa-600 underline-offset-2 hover:underline"
                    >
                      {t.prenda ? "Ver la prenda" : "Ver la página"}
                    </a>
                  )}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
