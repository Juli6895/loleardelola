"use client";

import { useEffect, useState } from "react";
import { NINGUNA, esNinguna, guardarMarcas, useMarcasFavoritas } from "@/lib/marcas-favoritas";
import SugerirComercio from "@/components/SugerirComercio";

export type Marca = { dominio: string; nombre: string };

// La lista sale de /api/config; se pide una vez por visita.
let pedida: Promise<Marca[]> | null = null;
export function cargarMarcas(): Promise<Marca[]> {
  pedida ??= fetch("/api/config")
    .then((r) => r.json())
    .then((j) => (j.marcas ?? []) as Marca[])
    .catch(() => {
      pedida = null;
      return [];
    });
  return pedida;
}

/**
 * "Mis marcas", en el menú: todas las marcas con una casilla. Las
 * casillas marcadas son exactamente las marcas que salen en Promociones
 * (ver lib/marcas-favoritas.ts): con "Todas las marcas" quedan todas
 * marcadas, y con "Desmarcar todas" ninguna, para marcar solo las que
 * quiera.
 */
export default function SelectorMarcas({ oscuro = false }: { oscuro?: boolean }) {
  const [marcas, setMarcas] = useState<Marca[] | null>(null);
  const [filtro, setFiltro] = useState("");
  const escogidas = useMarcasFavoritas();

  useEffect(() => {
    cargarMarcas().then(setMarcas);
  }, []);

  const sinTildes = (t: string) => t.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const visibles = (marcas ?? []).filter((m) => sinTildes(m.nombre).includes(sinTildes(filtro)));

  // Lo marcado es lo que se ve. Guardado: [] = todas (lo de siempre),
  // [NINGUNA] = ninguna, o la lista de las escogidas.
  const todas = escogidas.length === 0;
  const ninguna = esNinguna(escogidas);
  const marcadas = new Set(todas ? (marcas ?? []).map((m) => m.dominio) : ninguna ? [] : escogidas);

  function cambiar(dominio: string, marcada: boolean) {
    if (!marcas) return;
    const nuevas = new Set(marcadas);
    if (marcada) nuevas.add(dominio);
    else nuevas.delete(dominio);
    if (nuevas.size === 0) guardarMarcas([NINGUNA]);
    else if (nuevas.size >= marcas.length) guardarMarcas([]);
    else guardarMarcas(Array.from(nuevas));
  }

  const texto = oscuro ? "text-white" : "text-noche";
  const suave = oscuro ? "text-white/60" : "text-noche/60";

  return (
    <div>
      <p className={`text-xs ${suave}`}>
        {todas
          ? "Ves todas las marcas. Para ver solo algunas, toca Desmarcar todas y marca las que te gustan. En la búsqueda siguen apareciendo todas."
          : ninguna
            ? "No tienes ninguna marca marcada: marca las que te gustan y en Promociones (Solo promociones y Ver todo) solo te mostramos esas."
            : `En Promociones solo ves ${marcadas.size === 1 ? "1 marca" : `${marcadas.size} marcas`}. En la búsqueda siguen apareciendo todas.`}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="search"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar marca"
          aria-label="Buscar marca"
          className={`min-w-0 flex-1 rounded-full border px-3 py-1.5 text-sm outline-none ${
            oscuro
              ? "border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:border-rosa-300"
              : "border-rosa-200 bg-rosa-50/40 text-noche focus:border-rosa-400 focus:bg-white"
          }`}
        />
        {!ninguna && (
          <button
            type="button"
            onClick={() => guardarMarcas([NINGUNA])}
            className={`shrink-0 text-xs font-medium underline underline-offset-2 ${oscuro ? "text-rosa-300" : "text-rosa-600"}`}
          >
            Desmarcar todas
          </button>
        )}
      </div>
      <ul className="mt-2 max-h-72 space-y-0.5 overflow-y-auto pr-1">
        {marcas === null && <li className={`py-2 text-sm ${suave}`}>Cargando marcas...</li>}
        {marcas !== null && !filtro && (
          <li>
            <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-semibold ${texto} ${oscuro ? "hover:bg-white/10" : "hover:bg-rosa-50"}`}>
              <input
                type="checkbox"
                checked={todas}
                onChange={(e) => guardarMarcas(e.target.checked ? [] : [NINGUNA])}
                className="h-4 w-4 shrink-0 rounded border-rosa-300 text-rosa-500 focus:ring-rosa-400"
              />
              Todas las marcas
            </label>
          </li>
        )}
        {visibles.map((m) => {
          const marcada = marcadas.has(m.dominio);
          return (
            <li key={m.dominio}>
              <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${texto} ${oscuro ? "hover:bg-white/10" : "hover:bg-rosa-50"}`}>
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={(e) => cambiar(m.dominio, e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-rosa-300 text-rosa-500 focus:ring-rosa-400"
                />
                {m.nombre}
              </label>
            </li>
          );
        })}
        {marcas !== null && visibles.length === 0 && (
          <li className={`px-2 py-1.5 text-sm ${suave}`}>No tenemos esa marca todavía.</li>
        )}
      </ul>
      <div className={`mt-2 border-t pt-2 ${oscuro ? "border-white/10" : "border-rosa-100"}`}>
        <SugerirComercio forma="linea" origen="mis_marcas" oscuro={oscuro} />
      </div>
    </div>
  );
}
