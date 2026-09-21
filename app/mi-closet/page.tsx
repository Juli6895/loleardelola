"use client";

import { useEffect, useState } from "react";
import ClosetUpload from "@/components/ClosetUpload";
import ClosetGrid from "@/components/ClosetGrid";
import { fetchConDispositivo } from "@/lib/device-id";
import type { ClosetItem } from "@/types";

const FREE_CLOSET_LIMIT = 15;

// Página "Mi Clóset": la usuaria sube fotos de sus prendas y las ve
// organizadas por categoría. Fase 1 del roadmap premium — base de datos
// que después usan el Manual de asesoría y el Avatar.
export default function MiClosetPage() {
  const [items, setItems] = useState<ClosetItem[] | null>(null);

  useEffect(() => {
    fetchConDispositivo("/api/closet")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => setItems([]));
  }, []);

  const count = items?.length ?? 0;
  const nearLimit = count >= FREE_CLOSET_LIMIT - 3 && count < FREE_CLOSET_LIMIT;
  const atLimit = count >= FREE_CLOSET_LIMIT;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="text-center">
        <h1 className="font-display text-4xl text-noche sm:text-5xl">
          Mi clóset
        </h1>
        <p className="mt-3 text-noche/60">
          Sube las prendas que ya tienes — nosotros las clasificamos y las
          dejamos listas para combinar.
        </p>
        <p className="mt-2 text-xs text-noche/40">
          Por ahora tu clóset se guarda en este dispositivo. Si borras los
          datos del navegador o entras desde otro celular, no lo vas a ver.
        </p>
      </header>

      <div className="mx-auto max-w-2xl">
        <ClosetUpload
          onAdded={(item) => setItems((prev) => [item, ...(prev ?? [])])}
        />
        <p className="mt-2 text-center text-xs text-noche/40">
          {atLimit
            ? `Llegaste al límite de ${FREE_CLOSET_LIMIT} prendas del plan gratis.`
            : nearLimit
              ? `${count}/${FREE_CLOSET_LIMIT} prendas del plan gratis.`
              : `Plan gratis: hasta ${FREE_CLOSET_LIMIT} prendas.`}
        </p>
      </div>

      {items === null ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse-rosa rounded-2xl bg-rosa-100"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rosa-200 bg-white p-10 text-center">
          <p className="text-noche/60">
            Todavía no has agregado ninguna prenda a tu clóset.
          </p>
        </div>
      ) : (
        <ClosetGrid
          items={items}
          onDelete={(id) =>
            setItems((prev) => prev?.filter((it) => it.id !== id) ?? null)
          }
        />
      )}
    </div>
  );
}
