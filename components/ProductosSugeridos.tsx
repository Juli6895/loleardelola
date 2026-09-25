"use client";

import type { GrupoProductos } from "@/lib/use-catalogo";
import { anotarClicComercio } from "@/lib/use-evento";

// Prendas con foto sacadas del catálogo que publican las tiendas.
// Ver lib/catalogo-tiendas.ts para el porqué y sus límites: solo cubre
// las tiendas que publican catálogo, no Zara ni H&M.
//
// No busca nada por su cuenta: recibe ya hecho el resultado de
// lib/use-catalogo, que comparte con las tarjetas de Instagram.

const pesos = (n: number) =>
  "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 0 });

// Cuántas prendas se muestran por cada una detectada. El endpoint
// devuelve más de las que caben acá a propósito: las de sobra son las
// que alimentan las tarjetas de Instagram de cada tienda.
const POR_PRENDA = 8;

export default function ProductosSugeridos({
  grupos,
  cargando,
}: {
  grupos: GrupoProductos[];
  cargando: boolean;
}) {
  if (cargando) {
    return (
      <div className="rounded-2xl border border-rosa-100 bg-white p-6 text-sm text-noche/50 shadow-sm sm:p-8">
        Buscando prendas parecidas en las tiendas...
      </div>
    );
  }

  if (grupos.length === 0) return null;

  const variasPrendas = grupos.length > 1;

  return (
    <div className="rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="font-display text-2xl text-noche">Prendas parecidas, en tienda</h2>
      <p className="mt-1 text-sm text-noche/60">
        Salen del catálogo que estas tiendas publican, así que el precio y la
        foto son los de ellas. Haz clic para ir directo a la prenda.
      </p>

      <div className="mt-6 space-y-8">
        {grupos.map((g) => (
          <div key={g.etiqueta}>
            {variasPrendas && (
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-noche/50">
                {g.etiqueta}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {g.productos.slice(0, POR_PRENDA).map((p) => (
                <a
                  key={p.url}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => anotarClicComercio({ tienda: p.tienda, dominio: p.dominio, origen: "buscar" })}
                  className="group flex flex-col overflow-hidden rounded-xl border border-rosa-100 transition hover:border-rosa-300 hover:shadow-md"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-rosa-50">
                    {/* <img> normal y no next/image: las fotos vienen de
                        los CDN de cada tienda, y configurar cada dominio
                        en next.config obligaría a tocar el código cada
                        vez que se agrega una tienda. */}
                    {p.imagen && (
                      <img
                        src={p.imagen}
                        alt={p.titulo}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="line-clamp-2 text-xs leading-snug text-noche/80">
                      {p.titulo}
                    </p>
                    <p className="mt-auto text-sm font-medium text-noche">
                      {p.precioCop ? pesos(p.precioCop) : ""}
                    </p>
                    <p className="text-[11px] text-noche/40">{p.tienda}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
