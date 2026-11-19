"use client";

import { useEffect, useState } from "react";
import SearchBox, { type SearchResult as R } from "@/components/SearchBox";
import SearchResult from "@/components/SearchResult";
import Link from "next/link";
import { tieneMembresia, useUsuario } from "@/lib/use-usuario";
import { CUPOS_MEMBRESIA, TOPES } from "@/lib/planes";
import { fetchConDispositivo } from "@/lib/device-id";
import { useAnotarUnaVez } from "@/lib/use-evento";

// Página donde se busca un outfit. Corta a propósito: arriba el título,
// la caja para subir la foto o pegar el pin, y los tres pasos en íconos.
// Lo demás (cupos, tips) va en una línea.

const PASOS: Array<{ titulo: string; icono: React.ReactNode }> = [
  {
    titulo: "Sube la foto o el pin",
    icono: <path d="M4 16.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2.5M12 4v11m0-11-4 4m4-4 4 4" />,
  },
  {
    titulo: "Reconocemos cada prenda",
    icono: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-4.5-4.5" />
      </>
    ),
  },
  {
    titulo: "Te mostramos dónde comprar",
    icono: <path d="M5 8h14l-1.2 11a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 8Zm4 0V6.5a3 3 0 0 1 6 0V8" />,
  },
];

export default function BuscarPage() {
  useAnotarUnaVez("buscar_visto");
  const { usuario } = useUsuario();
  const conMembresia = tieneMembresia(usuario);
  // Guardar outfits: sin cuenta no se puede (TOPES.anonimo.outfits = 0).
  const puedeGuardar = (TOPES[usuario?.plan ?? "anonimo"].outfits ?? 1) > 0;
  const [result, setResult] = useState<R | null>(null);
  // Las promos siguen lo que se detectó en la foto (vestido, blusa...).
  const tipos = Array.from(
    new Set((result?.result.prendas ?? []).map((p) => p.tipo).filter((t): t is string => !!t))
  );

  // Con membresía: cuántas búsquedas lleva, en una sola línea.
  const [saldo, setSaldo] = useState<{ usadas: number; tope: number | null; extra: number } | null>(null);
  useEffect(() => {
    if (!conMembresia) return;
    fetchConDispositivo("/api/membresia/saldo")
      .then((r) => r.json())
      .then((j) => setSaldo(j.saldo ?? null))
      .catch(() => setSaldo(null));
  }, [conMembresia, result]);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="mx-auto min-w-0 max-w-4xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rosa-100 via-white to-rosa-200 px-5 pb-6 pt-10 shadow-suave sm:px-10 sm:pt-12">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-rosa-300 opacity-30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-rosa-400 opacity-20 blur-3xl" />

          <div className="relative text-center">
            <h1 className="font-display text-4xl leading-tight text-noche sm:text-5xl">
              Cuéntanos qué outfit <span className="italic text-rosa-500">te enamoró</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-noche/65">
              Te mostramos dónde comprar cada prenda en tiendas de Colombia.
            </p>
          </div>

          <div className="relative mt-7">
            <SearchBox onResult={setResult} />
          </div>

          {/* Cupos en una línea: cuánto lleva, o qué da la membresía. */}
          <p className="relative mt-4 text-center text-xs text-noche/55">
            {conMembresia ? (
              saldo && (
                <>
                  Llevas {saldo.tope === null ? saldo.usadas : `${Math.min(saldo.usadas, saldo.tope)} de ${saldo.tope}`} búsquedas
                  {saldo.extra > 0 ? ` · ${saldo.extra} adicionales` : ""}
                </>
              )
            ) : (
              <>
                Buscar es parte de la membresía: {CUPOS_MEMBRESIA.mensual.busquedas} búsquedas al mes o{" "}
                {CUPOS_MEMBRESIA.anual.busquedas} al año.{" "}
                <Link href="/membresia" className="font-medium text-rosa-600 underline-offset-2 hover:underline">
                  Ver planes
                </Link>
              </>
            )}
          </p>
        </section>

        {/* Cómo funciona, en íconos. Se esconde cuando ya hay un resultado. */}
        {!result && (
          <ol aria-label="Cómo funciona" className="grid grid-cols-3 gap-2 sm:gap-6">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="flex flex-col items-center gap-2 text-center">
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-rosa-500 shadow-sm ring-1 ring-rosa-100 sm:h-14 sm:w-14">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                    aria-hidden
                  >
                    {p.icono}
                  </svg>
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-noche text-[10px] font-semibold text-white">
                    {i + 1}
                  </span>
                </span>
                <span className="text-xs font-medium leading-snug text-noche/75 sm:text-sm">{p.titulo}</span>
              </li>
            ))}
          </ol>
        )}

        {result && <SearchResult data={result} />}

        {tipos.length > 0 && (
          <Link
            href={`/promociones?tipos=${encodeURIComponent(tipos.join("|"))}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-rosa-200 bg-rosa-50/60 px-5 py-4 transition hover:border-rosa-400"
          >
            <span>
              <span className="block text-sm font-semibold text-noche">Mira las promociones de lo que buscaste</span>
              <span className="block text-xs text-noche/60">{tipos.join(", ")} con descuento, en tallas disponibles.</span>
            </span>
            <span className="shrink-0 text-sm font-medium text-rosa-600">Ver →</span>
          </Link>
        )}

        {puedeGuardar && (
          <p className="text-center">
            <Link href="/mis-outfits" className="text-sm font-medium text-rosa-600 underline-offset-2 hover:underline">
              Ver mis outfits guardados →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
