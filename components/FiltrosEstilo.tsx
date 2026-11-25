"use client";

import { GRUPOS_ESTILO, type Estilo } from "@/lib/estilo-prenda";

/**
 * Los filtros de clima, momento y ocasión (lib/estilo-prenda.ts). Los usa
 * el panel de Promociones y los resultados de Buscar, con lo escogido
 * guardado para la visita (useEstilosFiltro en lib/filtros-promos.ts).
 * `cuantos`: cuántas prendas hay con cada uno; null = no se muestra.
 */
export default function FiltrosEstilo({
  estilos,
  onEstilos,
  cuantos = null,
  compacto = false,
}: {
  estilos: Estilo[];
  onEstilos: (e: Estilo[]) => void;
  cuantos?: Map<Estilo, number> | null;
  // En Buscar: los tres grupos en una sola fila que se desliza.
  compacto?: boolean;
}) {
  const alternar = (e: Estilo) => onEstilos(estilos.includes(e) ? estilos.filter((x) => x !== e) : [...estilos, e]);
  const chip = (activo: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
      activo ? "border-noche bg-noche text-white" : "border-rosa-200 bg-white text-noche/70 hover:border-rosa-400"
    }`;

  if (compacto) {
    return (
      <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
        <button type="button" onClick={() => onEstilos([])} aria-pressed={estilos.length === 0} className={chip(estilos.length === 0)}>
          Todo
        </button>
        {GRUPOS_ESTILO.map((g) => (
          <span key={g.grupo} className="flex shrink-0 items-center gap-2">
            <span className="shrink-0 pl-1 text-[11px] font-semibold uppercase tracking-wide text-noche/40">{g.nombre}</span>
            {g.opciones.map((o) => (
              <button key={o.estilo} type="button" onClick={() => alternar(o.estilo)} aria-pressed={estilos.includes(o.estilo)} className={chip(estilos.includes(o.estilo))}>
                {o.nombre}
              </button>
            ))}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {GRUPOS_ESTILO.map((g) => {
        const escogidosDelGrupo = g.opciones.filter((o) => estilos.includes(o.estilo));
        return (
          <div key={g.grupo}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-noche/50">{g.nombre}</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap">
              <button
                type="button"
                onClick={() => onEstilos(estilos.filter((x) => !g.opciones.some((o) => o.estilo === x)))}
                aria-pressed={escogidosDelGrupo.length === 0}
                className={chip(escogidosDelGrupo.length === 0)}
              >
                {g.grupo === "ocasion" ? "Todas" : "Todos"}
              </button>
              {g.opciones.map((o) => (
                <button key={o.estilo} type="button" onClick={() => alternar(o.estilo)} aria-pressed={estilos.includes(o.estilo)} className={chip(estilos.includes(o.estilo))}>
                  {o.nombre} {cuantos && <span className="opacity-60">{cuantos.get(o.estilo) ?? 0}</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-noche/40">
        Lo sabemos por el nombre de cada prenda en su tienda: una prenda que no lo dice no sale con estos filtros.
      </p>
    </div>
  );
}
