"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import TagChip from "./TagChip";
import {
  abrirOutfitEnGoogleShopping,
  type ShoppingItem,
} from "@/lib/shopping";
import { colorAHex } from "@/lib/color-swatch";
import { useSession, signIn } from "next-auth/react";
import type { SearchResult as Result } from "./SearchBox";

// Renderiza los resultados del análisis: imagen, chips de búsqueda,
// botón "buscar todo el outfit" y botón "guardar outfit"
export default function SearchResult({ data }: { data: Result }) {
  const { data: session } = useSession();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  // Índices de prendas que la usuaria quitó con la "x" del chip.
  const [removed, setRemoved] = useState<Set<number>>(new Set());

  const terms = data.result.searchTerms;
  const prices = data.result.priceMaxCop ?? [];
  const tipos = data.result.tipoPrenda ?? [];
  const colores = data.result.colores ?? [];
  const detalles = data.result.detalles ?? [];
  const excluded = data.excludedMerchants ?? [];
  // Lista cerrada de comercios permitidos (ajuste de administración). Si
  // tiene datos, restringe la búsqueda y le gana a `excluded`.
  const allowed = data.allowedMerchants ?? [];

  // Índices visibles: todas las prendas detectadas menos las que se quitaron.
  const visibleIndices = terms
    .map((_, i) => i)
    .filter((i) => !removed.has(i));

  function removeTerm(index: number) {
    setRemoved((prev) => new Set(prev).add(index));
  }

  // Items para el opener multi-tab. Cada uno con su priceMaxCop si existe.
  const items: ShoppingItem[] = visibleIndices.map((i) => ({
    q: terms[i],
    priceMaxCop: prices[i] ?? null,
  }));

  // Total estimado por la IA (suma de los priceMaxCop de las prendas que
  // siguen visibles). Lo mostramos como confirmación visual del presupuesto.
  const totalEstimado: number = visibleIndices.reduce<number>(
    (acc, i) => (typeof prices[i] === "number" ? acc + (prices[i] as number) : acc),
    0
  );

  async function saveOutfit() {
    if (!session) {
      toast("Entra con Pinterest pa' guardar tus outfits 💖");
      signIn("pinterest");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: data.imageUrl,
          tags: items.map((it) => it.q),
          pinterestUrl: data.pinterestUrl ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      setSaved(true);
      toast.success("¡Outfit guardado en tu perfil!");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <div className="overflow-hidden rounded-2xl border border-rosa-100 bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.imageUrl}
            alt="Outfit analizado"
            className="h-auto w-full object-cover"
          />
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl text-noche">
            Esto fue lo que vimos en la foto
          </h2>
          <p className="mt-1 text-sm text-noche/60">
            Haz clic en cada chip para buscarlo en Google Shopping.
          </p>

          {terms.length === 0 ? (
            <p className="mt-5 rounded-xl bg-rosa-50 p-4 text-sm text-noche/70">
              No pudimos detectar prendas claras. Prueba con otra foto que
              enfoque mejor el outfit.
            </p>
          ) : visibleIndices.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-4">
              {visibleIndices.map((i) => {
                const tipo = tipos[i];
                const color = colores[i];
                const detalle = detalles[i];
                const tieneDetalle = tipo || color || detalle;
                return (
                  <div key={i} className="flex flex-col items-start gap-1.5">
                    <TagChip
                      term={terms[i]}
                      priceMaxCop={prices[i] ?? null}
                      excludeMerchants={excluded}
                      includeMerchants={allowed}
                      onRemove={() => removeTerm(i)}
                    />
                    {tieneDetalle && (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-1 text-[11px] text-noche/50">
                        {tipo && <span className="font-medium text-noche/70">{tipo}</span>}
                        {color && (
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-noche/10"
                              style={{ backgroundColor: colorAHex(color) }}
                              aria-hidden
                            />
                            {color}
                          </span>
                        )}
                        {detalle && <span>· {detalle}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-rosa-50 p-4 text-sm text-noche/70">
              Quitaste todas las prendas detectadas. Recarga la búsqueda si
              quieres empezar de nuevo.
            </p>
          )}

          {totalEstimado > 0 && (
            <p className="mt-4 text-xs text-rosa-600">
              Repartimos tu presupuesto: total estimado{" "}
              <strong>${totalEstimado.toLocaleString("es-CO")} COP</strong>.
            </p>
          )}

          {data.result.dominantColors.length > 0 && (
            <p className="mt-2 text-xs text-noche/40">
              Colores dominantes: {data.result.dominantColors.join(", ")}
            </p>
          )}

          {allowed.length > 0 ? (
            <p className="mt-1 text-xs text-noche/40">
              Buscando solo en: {allowed.join(", ")}
            </p>
          ) : (
            excluded.length > 0 && (
              <p className="mt-1 text-xs text-noche/40">
                Excluyendo: {excluded.join(", ")}
              </p>
            )
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {items.length > 0 && (
              <button
                onClick={() =>
                  abrirOutfitEnGoogleShopping(items, {
                    excludeMerchants: excluded,
                    includeMerchants: allowed,
                  })
                }
                className="rounded-full bg-noche px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500"
                title="Abre una pestaña por cada prenda detectada"
              >
                Buscar todo el outfit ({items.length})
              </button>
            )}
            <button
              onClick={saveOutfit}
              disabled={saving || saved || items.length === 0}
              className="rounded-full border border-rosa-300 bg-white px-5 py-2.5 text-sm font-medium text-noche transition hover:border-rosa-400 hover:bg-rosa-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saved ? "Guardado ✓" : saving ? "Guardando..." : "Guardar outfit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
