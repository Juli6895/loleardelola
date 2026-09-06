"use client";

import type { Outfit } from "@/types";
import TagChip from "./TagChip";
import { abrirOutfitEnGoogleShopping } from "@/lib/shopping";

type Props = {
  outfit: Outfit;
  onDelete?: (id: string) => void;
  // Ambas listas de comercios las pasa la página padre (que ya las trajo
  // una vez de /api/config) para no spamear el endpoint en cada card.
  excludeMerchants?: string[];
  // Lista cerrada de comercios permitidos (ajuste de administración). Si
  // viene con datos, gana sobre excludeMerchants.
  includeMerchants?: string[];
};

// Tarjeta para mostrar un outfit guardado en "Mis outfits"
export default function OutfitCard({
  outfit,
  onDelete,
  excludeMerchants,
  includeMerchants,
}: Props) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-rosa-100 bg-white shadow-sm transition hover:shadow-suave">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-rosa-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={outfit.image_url}
          alt="Outfit guardado"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {outfit.tags.slice(0, 5).map((t) => (
            <TagChip
              key={t}
              term={t}
              excludeMerchants={excludeMerchants}
              includeMerchants={includeMerchants}
            />
          ))}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <button
            onClick={() =>
              abrirOutfitEnGoogleShopping(outfit.tags, {
                excludeMerchants,
                includeMerchants,
              })
            }
            className="rounded-full bg-noche px-4 py-1.5 text-xs font-medium text-white transition hover:bg-rosa-500"
            title="Abre una pestaña por cada prenda"
          >
            Buscar todo el outfit
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(outfit.id)}
              className="rounded-full border border-rosa-200 px-3 py-1.5 text-xs text-noche/60 transition hover:border-rosa-400 hover:text-rosa-600"
            >
              Eliminar
            </button>
          )}
        </div>

        <p className="text-xs text-noche/40">
          Guardado el{" "}
          {new Date(outfit.created_at).toLocaleDateString("es-CO", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
    </article>
  );
}
