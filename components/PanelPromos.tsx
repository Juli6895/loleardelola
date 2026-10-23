"use client";

import { useEffect, useState } from "react";
import type { ProductoTienda } from "@/lib/use-catalogo";
import { anotarClicComercio } from "@/lib/use-evento";
import BotonAvisame from "@/components/BotonAvisame";

const pesos = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 0 });

function descuento(p: ProductoTienda): number | null {
  if (!p.precioCop || !p.precioAntesCop) return null;
  return Math.round((1 - p.precioCop / p.precioAntesCop) * 100);
}

/**
 * "Promo": prendas rebajadas de las tiendas de la lista. En computador
 * va como columna a la derecha; en el celular, como una franja que se
 * desliza de lado. Con `tipos` (lo que se detectó en la foto) muestra
 * promos de esas prendas; sin ellos, una mezcla general.
 */
export default function PanelPromos({ tipos }: { tipos: string[] }) {
  const [promos, setPromos] = useState<ProductoTienda[] | null>(null);
  const clave = tipos.join("|");

  useEffect(() => {
    let vigente = true;
    setPromos(null);
    fetch(`/api/promos?tipos=${encodeURIComponent(clave)}`)
      .then((r) => r.json())
      .then((j) => vigente && setPromos(j.promos ?? []))
      .catch(() => vigente && setPromos([]));
    return () => {
      vigente = false;
    };
  }, [clave]);

  if (promos !== null && promos.length === 0) return null;

  return (
    <aside aria-label="Promociones" className="rounded-2xl border border-rosa-100 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl text-noche">Promo</h2>
        <span className="text-[11px] text-noche/40">{clave ? "De lo que buscaste" : "Rebajas de hoy"}</span>
      </div>
      <p className="mt-0.5 text-xs text-noche/50">Precios de cada tienda, con 20% o más de descuento.</p>

      <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0">
        {promos === null
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] w-32 shrink-0 animate-pulse rounded-xl bg-rosa-50 lg:w-auto" />
            ))
          : promos.map((p) => (
              <a
                key={p.url}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => anotarClicComercio({ tienda: p.tienda, dominio: p.dominio, origen: "promo" })}
                className="group relative flex w-32 shrink-0 flex-col overflow-hidden rounded-xl border border-rosa-100 transition hover:border-rosa-300 hover:shadow-md lg:w-auto"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-rosa-50">
                  {p.imagen && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imagen}
                      alt={p.titulo}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  )}
                  {descuento(p) && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-noche px-2 py-0.5 text-[10px] font-semibold text-white">
                      -{descuento(p)}%
                    </span>
                  )}
                  <BotonAvisame prenda={{ url: p.url, titulo: p.titulo, imagen: p.imagen, precioCop: p.precioCop }} />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 p-2">
                  <p className="line-clamp-2 text-[11px] leading-snug text-noche/80">{p.titulo}</p>
                  {p.precioCop && (
                    <p className="mt-auto text-xs font-semibold text-noche">
                      {pesos(p.precioCop)}{" "}
                      {p.precioAntesCop && (
                        <span className="text-[10px] font-normal text-noche/40 line-through">{pesos(p.precioAntesCop)}</span>
                      )}
                    </p>
                  )}
                  <p className="text-[10px] text-noche/40">{p.tienda}</p>
                </div>
              </a>
            ))}
      </div>
    </aside>
  );
}
