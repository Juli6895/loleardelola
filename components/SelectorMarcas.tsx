"use client";

import { useEffect, useState } from "react";
import { alternarFavorita, guardarFavoritas, useMarcasFavoritas, type FiltroMarcas } from "@/lib/marcas-favoritas";
import SugerirComercio from "@/components/SugerirComercio";
import BanderaColombia from "@/components/BanderaColombia";
import { esColombiana } from "@/lib/marcas-colombianas";

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

const sinTildes = (t: string) => t.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function Corazon({ lleno, className = "h-5 w-5" }: { lleno: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={lleno ? "currentColor" : "none"} className={className} aria-hidden>
      <path
        d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.4 3.9 4.5 7 4.5c2 0 3.4 1.2 5 3 1.6-1.8 3-3 5-3 3.1 0 5.3 2.9 4.2 6.2C19.5 15.4 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * "Mis marcas favoritas", en el menú: cada marca con su corazón. No es un
 * filtro: en Promociones las favoritas salen primero (ver
 * lib/marcas-favoritas.ts). Las que tienen corazón van arriba de la lista.
 */
export default function SelectorMarcas({ oscuro = false }: { oscuro?: boolean }) {
  const [marcas, setMarcas] = useState<Marca[] | null>(null);
  const [buscar, setBuscar] = useState("");
  const favoritas = useMarcasFavoritas();

  useEffect(() => {
    cargarMarcas().then(setMarcas);
  }, []);

  const fav = new Set(favoritas);
  const visibles = (marcas ?? [])
    .filter((m) => sinTildes(m.nombre).includes(sinTildes(buscar)))
    .sort((a, b) => Number(fav.has(b.dominio)) - Number(fav.has(a.dominio)));

  const texto = oscuro ? "text-white" : "text-noche";
  const suave = oscuro ? "text-white/60" : "text-noche/60";

  return (
    <div>
      <p className={`text-xs ${suave}`}>
        {favoritas.length === 0
          ? "Toca el corazón de las marcas que te gustan: en Promociones te las mostramos primero."
          : `Tienes ${favoritas.length === 1 ? "1 favorita" : `${favoritas.length} favoritas`}. En Promociones salen primero.`}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="search"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar marca"
          aria-label="Buscar marca"
          className={`min-w-0 flex-1 rounded-full border px-3 py-1.5 text-sm outline-none ${
            oscuro
              ? "border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:border-rosa-300"
              : "border-rosa-200 bg-rosa-50/40 text-noche focus:border-rosa-400 focus:bg-white"
          }`}
        />
        {favoritas.length > 0 && (
          <button
            type="button"
            onClick={() => guardarFavoritas([])}
            className={`shrink-0 text-xs font-medium underline underline-offset-2 ${oscuro ? "text-rosa-300" : "text-rosa-600"}`}
          >
            Quitar todas
          </button>
        )}
      </div>
      <ul className="mt-2 max-h-72 space-y-0.5 overflow-y-auto pr-1">
        {marcas === null && <li className={`py-2 text-sm ${suave}`}>Cargando marcas...</li>}
        {visibles.map((m) => {
          const lleno = fav.has(m.dominio);
          return (
            <li key={m.dominio}>
              <button
                type="button"
                onClick={() => alternarFavorita(favoritas, m.dominio)}
                aria-pressed={lleno}
                aria-label={`${lleno ? "Quitar" : "Marcar"} ${m.nombre} como favorita`}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${texto} ${
                  oscuro ? "hover:bg-white/10" : "hover:bg-rosa-50"
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={lleno ? "font-semibold" : ""}>{m.nombre}</span>
                  {esColombiana(m.dominio) && <BanderaColombia />}
                </span>
                <span className={lleno ? "text-red-500" : oscuro ? "text-white/40" : "text-noche/30"}>
                  <Corazon lleno={lleno} />
                </span>
              </button>
            </li>
          );
        })}
        {marcas !== null && visibles.length === 0 && (
          <li className={`px-2 py-1.5 text-sm ${suave}`}>No tenemos esa marca todavía.</li>
        )}
      </ul>
      <p className={`mt-2 flex items-center gap-1.5 text-[11px] ${suave}`}>
        <BanderaColombia /> Marca colombiana
      </p>
      <div className={`mt-2 border-t pt-2 ${oscuro ? "border-white/10" : "border-rosa-100"}`}>
        <SugerirComercio forma="linea" origen="mis_marcas" oscuro={oscuro} />
      </div>
    </div>
  );
}

/**
 * El filtro de marcas del panel de Filtros de Promociones: todas
 * (favoritas primero), solo las favoritas, o escoger una por una con
 * "Seleccionar todas" y "Desactivar todas".
 */
export function FiltroDeMarcas({
  filtro,
  favoritas,
  onCambiar,
}: {
  filtro: FiltroMarcas;
  favoritas: string[];
  onCambiar: (f: FiltroMarcas) => void;
}) {
  const [marcas, setMarcas] = useState<Marca[] | null>(null);
  const [buscar, setBuscar] = useState("");
  const [abierta, setAbierta] = useState(filtro.modo === "algunas");
  useEffect(() => {
    cargarMarcas().then(setMarcas);
  }, []);

  const fav = new Set(favoritas);
  const todos = (marcas ?? []).map((m) => m.dominio);
  const marcadas = new Set(
    filtro.modo === "todas" ? todos : filtro.modo === "favoritas" ? favoritas : filtro.marcas
  );
  const visibles = (marcas ?? [])
    .filter((m) => sinTildes(m.nombre).includes(sinTildes(buscar)))
    .sort((a, b) => Number(fav.has(b.dominio)) - Number(fav.has(a.dominio)));

  function marcar(dominio: string, si: boolean) {
    const nuevas = new Set(marcadas);
    if (si) nuevas.add(dominio);
    else nuevas.delete(dominio);
    if (nuevas.size >= todos.length && todos.length > 0) onCambiar({ modo: "todas" });
    else onCambiar({ modo: "algunas", marcas: Array.from(nuevas) });
  }

  const opcion = (activa: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
      activa ? "border-noche bg-noche text-white" : "border-rosa-200 bg-white text-noche/70 hover:border-rosa-400"
    }`;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={filtro.modo === "todas"} onClick={() => onCambiar({ modo: "todas" })} className={opcion(filtro.modo === "todas")}>
          Todas
        </button>
        <button
          type="button"
          aria-pressed={filtro.modo === "favoritas"}
          onClick={() => onCambiar({ modo: "favoritas" })}
          disabled={favoritas.length === 0}
          className={`${opcion(filtro.modo === "favoritas")} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          Solo mis favoritas{favoritas.length > 0 ? ` (${favoritas.length})` : ""}
        </button>
        <button type="button" aria-expanded={abierta} onClick={() => setAbierta((v) => !v)} className={opcion(filtro.modo === "algunas")}>
          Escoger marcas{filtro.modo === "algunas" ? ` (${filtro.marcas.length})` : ""}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-noche/45">
        {favoritas.length === 0
          ? "Marca tus favoritas con el corazón en Mis marcas favoritas del menú y salen primero."
          : "Tus favoritas siempre salen primero."}
      </p>

      {abierta && (
        <div className="mt-3 rounded-xl border border-rosa-100 p-2">
          <div className="flex items-center gap-2 px-1">
            <input
              type="search"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar marca"
              aria-label="Buscar marca en el filtro"
              className="min-w-0 flex-1 rounded-full border border-rosa-200 bg-rosa-50/40 px-3 py-1.5 text-sm text-noche outline-none focus:border-rosa-400 focus:bg-white"
            />
          </div>
          <div className="mt-2 flex gap-3 px-1 text-xs font-medium">
            <button type="button" onClick={() => onCambiar({ modo: "todas" })} className="text-rosa-600 underline underline-offset-2">
              Seleccionar todas
            </button>
            <button type="button" onClick={() => onCambiar({ modo: "algunas", marcas: [] })} className="text-rosa-600 underline underline-offset-2">
              Desactivar todas
            </button>
          </div>
          <ul className="mt-2 max-h-60 space-y-0.5 overflow-y-auto pr-1">
            {marcas === null && <li className="px-2 py-1.5 text-sm text-noche/60">Cargando marcas...</li>}
            {visibles.map((m) => (
              <li key={m.dominio}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-noche hover:bg-rosa-50">
                  <input
                    type="checkbox"
                    checked={marcadas.has(m.dominio)}
                    onChange={(e) => marcar(m.dominio, e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-rosa-300 text-rosa-500 focus:ring-rosa-400"
                  />
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    {m.nombre}
                    {esColombiana(m.dominio) && <BanderaColombia />}
                  </span>
                  {fav.has(m.dominio) && (
                    <span className="text-red-500" title="Favorita">
                      <Corazon lleno className="h-4 w-4" />
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
