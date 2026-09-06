"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { ClosetCategory, ClosetItem } from "@/types";

const CATEGORY_LABELS: Record<ClosetCategory, string> = {
  top: "Tops",
  bottom: "Bottoms",
  vestido: "Vestidos",
  abrigo: "Abrigos",
  calzado: "Calzado",
  accesorio: "Accesorios",
};

const CATEGORY_ORDER: ClosetCategory[] = [
  "top",
  "bottom",
  "vestido",
  "abrigo",
  "calzado",
  "accesorio",
];

type Props = {
  items: ClosetItem[];
  onDelete: (id: string) => void;
};

// Grilla del clóset: filtro por categoría + tarjetas con la foto, el nombre
// y los tags detectados por Claude.
export default function ClosetGrid({ items, onDelete }: Props) {
  const [filter, setFilter] = useState<ClosetCategory | "todas">("todas");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of items) c[it.category] = (c[it.category] ?? 0) + 1;
    return c;
  }, [items]);

  const visible =
    filter === "todas" ? items : items.filter((it) => it.category === filter);

  async function handleDelete(id: string) {
    if (!confirm("¿Quitar esta prenda de tu clóset?")) return;
    try {
      const res = await fetch(`/api/closet?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      onDelete(id);
      toast.success("Prenda eliminada");
    } catch {
      toast.error("No se pudo eliminar");
    }
  }

  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("todas")}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
            filter === "todas"
              ? "border-rosa-500 bg-rosa-500 text-white"
              : "border-rosa-200 bg-white text-noche hover:border-rosa-400 hover:bg-rosa-50"
          }`}
        >
          Todas ({items.length})
        </button>
        {CATEGORY_ORDER.filter((cat) => counts[cat]).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              filter === cat
                ? "border-rosa-500 bg-rosa-500 text-white"
                : "border-rosa-200 bg-white text-noche hover:border-rosa-400 hover:bg-rosa-50"
            }`}
          >
            {CATEGORY_LABELS[cat]} ({counts[cat]})
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((item) => (
          <article
            key={item.id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-rosa-100 bg-white shadow-sm transition hover:shadow-suave"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-rosa-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.label ?? "Prenda del clóset"}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <button
                onClick={() => handleDelete(item.id)}
                aria-label={`Quitar ${item.label ?? "prenda"} del clóset`}
                title="Quitar del clóset"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-noche/60 opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-white hover:text-rosa-600"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z" />
                </svg>
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-3">
              <p className="text-sm font-medium text-noche">
                {item.label ?? "Prenda sin nombre"}
              </p>
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-rosa-50 px-2 py-0.5 text-[10px] font-medium text-rosa-600"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
