"use client";

import { googleShoppingUrl } from "@/lib/shopping";

type Props = {
  term: string;
  // Opcional: presupuesto máximo en COP para esta prenda. Cuando viene,
  // mostramos el monto en el chip y filtramos la URL de Shopping.
  priceMaxCop?: number | null;
  // Lista de comercios excluidos (sin protocolo, sin www).
  excludeMerchants?: string[];
  // Lista cerrada de comercios permitidos (ajuste de administración). Si
  // viene con datos, gana sobre excludeMerchants — ver lib/shopping.ts.
  includeMerchants?: string[];
  // Si viene, muestra una "x" para quitar esta prenda de los resultados.
  onRemove?: () => void;
};

// Chip clicable que abre Google Shopping con el término detectado.
// Si hay priceMaxCop, lo muestra en el chip y aplica el filtro de precio.
// Con onRemove, agrega una "x" para descartar prendas mal detectadas.
export default function TagChip({
  term,
  priceMaxCop,
  excludeMerchants,
  includeMerchants,
  onRemove,
}: Props) {
  const hasBudget = !!priceMaxCop && priceMaxCop > 0;
  const priceLabel = hasBudget
    ? `hasta $${(priceMaxCop as number).toLocaleString("es-CO")}`
    : null;

  return (
    <span className="group inline-flex items-center gap-1 rounded-full border border-rosa-200 bg-white py-1.5 pl-4 pr-1.5 text-sm font-medium text-noche transition hover:border-rosa-400 hover:bg-rosa-50">
      <a
        href={googleShoppingUrl(
          { q: term, priceMaxCop: priceMaxCop ?? null },
          { excludeMerchants, includeMerchants }
        )}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 hover:text-rosa-600"
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
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-noche/30 transition hover:bg-rosa-100 hover:text-rosa-600"
          aria-label={`Quitar "${term}" de la lista`}
          title={`Quitar "${term}"`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
            <path d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z" />
          </svg>
        </button>
      )}
    </span>
  );
}
