"use client";

import { useState } from "react";
import SearchBox, { type SearchResult as R } from "@/components/SearchBox";
import SearchResult from "@/components/SearchResult";
import Link from "next/link";
import { useAnotarUnaVez } from "@/lib/use-evento";

// Página donde se hace el análisis de outfit
export default function BuscarPage() {
  useAnotarUnaVez("buscar_visto");
  const [result, setResult] = useState<R | null>(null);
  // Las promos siguen lo que se detectó en la foto (vestido, blusa...).
  const tipos = Array.from(
    new Set((result?.result.prendas ?? []).map((p) => p.tipo).filter((t): t is string => !!t))
  );

  return (
    // Las promociones tienen su propia pestaña (/promociones). Aquí solo
    // queda el enlace a las de lo que se buscó.
    <div className="mx-auto max-w-6xl space-y-12">
    <div className="mx-auto min-w-0 max-w-4xl space-y-6">
      <header className="text-center">
        <h1 className="font-display text-4xl text-noche sm:text-5xl">
          Cuéntanos qué outfit te enamoró
        </h1>
        <p className="mt-3 text-noche/60">
          Pega un pin de Pinterest o sube una foto — nosotros nos encargamos.
        </p>
      </header>

      <SearchBox onResult={setResult} />

      {result && <SearchResult data={result} />}

      {tipos.length > 0 && (
        <Link
          href={`/promociones?tipos=${encodeURIComponent(tipos.join("|"))}`}
          className="flex items-center justify-between gap-3 rounded-2xl border border-rosa-200 bg-rosa-50/60 px-5 py-4 transition hover:border-rosa-400"
        >
          <span>
            <span className="block text-sm font-semibold text-noche">Mira las promociones de lo que buscaste</span>
            <span className="block text-xs text-noche/60">
              {tipos.join(", ")} con más del 10% de descuento, en tallas disponibles.
            </span>
          </span>
          <span className="shrink-0 text-sm font-medium text-rosa-600">Ver promociones →</span>
        </Link>
      )}
    </div>
    </div>
  );
}
