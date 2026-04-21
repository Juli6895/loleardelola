"use client";

import { googleShoppingUrl } from "@/lib/shopping";

// Chip clicable que abre Google Shopping con el término detectado
export default function TagChip({ term }: { term: string }) {
  return (
    <a
      href={googleShoppingUrl(term)}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-1.5 rounded-full border border-rosa-200 bg-white px-4 py-2 text-sm font-medium text-noche transition hover:border-rosa-400 hover:bg-rosa-50 hover:text-rosa-600"
      title={`Buscar "${term}" en Google Shopping`}
    >
      <span>{term}</span>
      <svg
        className="h-3.5 w-3.5 text-noche/40 transition group-hover:text-rosa-500"
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
  );
}
