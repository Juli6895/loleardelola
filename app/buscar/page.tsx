"use client";

import { useState } from "react";
import SearchBox, { type SearchResult as R } from "@/components/SearchBox";
import SearchResult from "@/components/SearchResult";
import PanelPromos from "@/components/PanelPromos";
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
    // En computador, la búsqueda al centro y "Promo" como columna a la
    // derecha; en el celular, Promo queda debajo como franja deslizable.
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
    <div className="min-w-0 space-y-6">
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
    </div>
    <div className="min-w-0 lg:self-start">
      <PanelPromos tipos={tipos} />
    </div>
    </div>
  );
}
