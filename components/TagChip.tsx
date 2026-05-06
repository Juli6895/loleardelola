"use client";

import { googleShoppingUrl } from "@/lib/shopping";

type Props = {
  term: string;
  // Opcional: presupuesto máximo en COP para esta prenda. Cuando viene,
  // mostramos el monto en el chip y filtramos la URL de Shopping.
  priceMaxCop?: number | null;
  // Lista de comercios excluidos (sin protocolo, sin www).
  excludeMerchants?: string[];
};

// Chip clicable que abre Google Shopping con el término detectado.
// Si hay priceMaxCop, lo muestra en el chip y aplica el filtro de precio.
export default function TagChip({
  term,
  priceMaxCop,
  excludeMerchants,
}: Props) {
  const hasBudget = !!priceMaxCop && priceMaxCop > 0;
  const priceLabel = hasBudget
    ? `hasta $${(priceMaxCop as number).toLocaleString("es-CO")}`
    : null;

  return (
    <a
      href={googleShoppingUrl(
        { q: term, priceMaxCop: priceMaxCop ?? null },
        { excludeMerchants }
      )}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-1.5 rounded-full border border-rosa-200 bg-white px-4 py-2 text-sm font-medium text-noche transition hover:border-rosa-400 hover:bg-rosa-50 hover:text-rosa-600"
      title={
        hasBudget
          ? `Buscar "${term}" en Google Shopping (${priceLabel})`
          : `Buscar "${term}" en Google Shopping`
      }
    >
      <span>{term}</span>
      {priceLabel && (
        <span className="rounded-full bg-rosa-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rosa-600">
          {priceLabel}
        </span>
      )}
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
