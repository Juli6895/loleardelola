"use client";

import type { Outfit } from "@/types";
import TagChip from "./TagChip";
import { googleShoppingAllOutfitUrl } from "@/lib/shopping";

type Props = {
  outfit: Outfit;
  onDelete?: (id: string) => void;
};

// Tarjeta para mostrar un outfit guardado en "Mis outfits"
export default function OutfitCard({ outfit, onDelete }: Props) {
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
            <TagChip key={t} term={t} />
          ))}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <a
            href={googleShoppingAllOutfitUrl(outfit.tags)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-noche px-4 py-1.5 text-xs font-medium text-white transition hover:bg-rosa-500"
          >
            Buscar todo el outfit
          </a>
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
