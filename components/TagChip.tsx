"use client";

import { googleShoppingUrl } from "@/lib/shopping";

type Props = {
  term: string;
  onRemove?: () => void;
};

// Chip clicable que abre Google Shopping. Si onRemove está presente,
// muestra un botón ✕ para eliminar la prenda de la búsqueda.
export default function TagChip({ term, onRemove }: Props) {
  return (
    <span className="group inline-flex items-center gap-1 rounded-full border border-rosa-200 bg-white pl-4 pr-2 py-2 text-sm font-medium text-noche transition hover:border-rosa-400 hover:bg-rosa-50">
      <a
        href={googleShoppingUrl(term)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 hover:text-rosa-600 transition"
        title={`Buscar "${term}" en Google Shopping`}
      >
        <span>{term}</span>
        <svg
          className="h-3.5 w-3.5 text-noche/30 transition group-hover:text-rosa-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>

      {onRemove && (
        <button
          onClick={onRemove}
          title="Eliminar de la búsqueda"
          className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-noche/30 transition hover:bg-rosa-100 hover:text-rosa-500"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}
