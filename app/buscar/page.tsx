"use client";

import { useState } from "react";
import SearchBox, { type SearchResult as R } from "@/components/SearchBox";
import SearchResult from "@/components/SearchResult";
import Promociones from "@/components/Promociones";
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
    // La búsqueda arriba y las promociones debajo, a todo el ancho (antes
    // eran una columna angosta a la derecha).
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
    </div>
    <Promociones tipos={tipos} />
    </div>
  );
}
