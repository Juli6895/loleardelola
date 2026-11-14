"use client";

import { useEffect, useState } from "react";
import { guardarMarcas, useMarcasFavoritas } from "@/lib/marcas-favoritas";
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
 * "Mis marcas", en el menú: todas las marcas con una casilla. De las que
 * marque son las únicas promociones que le salen (ver
 * lib/marcas-favoritas.ts). Sin ninguna marcada, salen todas.
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

  // Sin ninguna escogida se ven todas: eso lo dice la casilla "Todas las
  // marcas", marcada. Cada marca se marca para escogerla: marcar dos o
  // tres deja ver solo esas. (En noviembre de 2026 las casillas salían
  // todas marcadas cuando no había filtro, y al tocar una marca para
  // escogerla se desmarcaba: se veían todas MENOS esa.)
  const todas = escogidas.length === 0;

  function cambiar(dominio: string, marcada: boolean) {
    guardarMarcas(marcada ? [...escogidas, dominio] : escogidas.filter((d) => d !== dominio));
  }

  const texto = oscuro ? "text-white" : "text-noche";
  const suave = oscuro ? "text-white/60" : "text-noche/60";

  return (
    <div>
      <p className={`text-xs ${suave}`}>
        {todas
          ? "Ahora ves todas las marcas. Marca las que te gustan y en Promociones (Solo promociones y Ver todo) solo te mostramos esas. En la búsqueda siguen apareciendo todas."
          : `En Promociones solo ves ${escogidas.length === 1 ? "1 marca" : `${escogidas.length} marcas`}. En la búsqueda siguen apareciendo todas.`}
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
        {!todas && (
          <button
            type="button"
            onClick={() => guardarMarcas([])}
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
                onChange={() => guardarMarcas([])}
                className="h-4 w-4 shrink-0 rounded border-rosa-300 text-rosa-500 focus:ring-rosa-400"
              />
              Todas las marcas
            </label>
          </li>
        )}
        {visibles.map((m) => {
          const marcada = escogidas.includes(m.dominio);
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
