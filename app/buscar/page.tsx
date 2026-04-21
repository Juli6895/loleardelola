"use client";

import { useState } from "react";
import SearchBox, { type SearchResult as R } from "@/components/SearchBox";
import SearchResult from "@/components/SearchResult";

// Página donde se hace el análisis de outfit
export default function BuscarPage() {
  const [result, setResult] = useState<R | null>(null);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
  );
}
