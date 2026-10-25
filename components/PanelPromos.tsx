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

// Cada lista puede traer decenas: de entrada se ven estas, el resto con
// "Ver más".
const A_LA_VISTA = 8;

function usePromos(tipos: string | null): ProductoTienda[] | null {
  const [promos, setPromos] = useState<ProductoTienda[] | null>(null);
  useEffect(() => {
    if (tipos === null) return;
    let vigente = true;
    setPromos(null);
    fetch(`/api/promos?tipos=${encodeURIComponent(tipos)}`)
      .then((r) => r.json())
      .then((j) => vigente && setPromos(j.promos ?? []))
      .catch(() => vigente && setPromos([]));
    return () => {
      vigente = false;
    };
  }, [tipos]);
  return promos;
}

/**
 * "Promo": prendas rebajadas (10% o más) de las tiendas de la lista. En
 * computador va como columna a la derecha; en el celular, como franjas
 * que se deslizan de lado. Arriba, las de lo que buscó (los tipos que se
 * detectaron en la foto); abajo, "otros descuentos" de todo tipo.
 */
export default function PanelPromos({ tipos }: { tipos: string[] }) {
  const clave = tipos.join("|");
  const relacionadas = usePromos(clave ? clave : null);
  const generales = usePromos("");

  // Las que ya salen arriba no se repiten abajo.
  const yaArriba = new Set((relacionadas ?? []).map((p) => p.url));
  const otras = generales?.filter((p) => !yaArriba.has(p.url)) ?? null;

  const sinNada = (!clave || relacionadas?.length === 0) && otras?.length === 0;
  if (sinNada) return null;

  return (
    <aside aria-label="Promociones" className="rounded-2xl border border-rosa-100 bg-white p-4 shadow-sm">
      <h2 className="font-display text-xl text-noche">Promo</h2>
      <p className="mt-0.5 text-xs text-noche/50">Precios de cada tienda, con 10% o más de descuento.</p>

      {clave && relacionadas?.length !== 0 && (
        <Bloque titulo="De lo que buscaste" promos={relacionadas} />
      )}

      {otras?.length !== 0 && (
        <Bloque titulo={clave ? "Otros descuentos" : "Descuentos de hoy"} promos={otras} />
      )}
    </aside>
  );
}

function Bloque({ titulo, promos }: { titulo: string; promos: ProductoTienda[] | null }) {
  const [verTodas, setVerTodas] = useState(false);
  const visibles = promos && !verTodas ? promos.slice(0, A_LA_VISTA) : promos;
  return (
    <section className="mt-4 first-of-type:mt-3">
      <h3 className="text-sm font-semibold text-noche">{titulo}</h3>
      <div className="-mx-4 mt-2 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0">
        {promos === null
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] w-32 shrink-0 animate-pulse rounded-xl bg-rosa-50 lg:w-auto" />
            ))
          : visibles!.map((p) => <Tarjeta key={p.url} p={p} />)}
      </div>
      {promos && promos.length > A_LA_VISTA && (
        <button
          type="button"
          onClick={() => setVerTodas((v) => !v)}
          className="mt-2 text-xs font-medium text-rosa-600 underline-offset-2 hover:underline"
        >
          {verTodas ? "Ver menos" : `Ver más (${promos.length})`}
        </button>
      )}
    </section>
  );
}

function Tarjeta({ p }: { p: ProductoTienda }) {
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => anotarClicComercio({ tienda: p.tienda, dominio: p.dominio, origen: "promo", prenda: p.titulo })}
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
  );
}
