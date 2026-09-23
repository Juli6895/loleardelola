"use client";

import { useEffect, useState } from "react";
import ClosetUpload from "@/components/ClosetUpload";
import ClosetGrid from "@/components/ClosetGrid";
import { fetchConDispositivo } from "@/lib/device-id";
import type { ClosetItem } from "@/types";
import SubNavCuenta from "@/components/SubNavCuenta";
import { TOPES } from "@/lib/planes";

// El tope vive en lib/planes.ts, junto con los de búsquedas y outfits.
// Acá solo se muestra; quien lo hace cumplir es la API.
const TOPE_GRATIS = TOPES.gratis.prendasCloset ?? 2;

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
  const atLimit = count >= TOPE_GRATIS;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <SubNavCuenta />
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
        {atLimit ? (
          <div className="mt-3 rounded-xl border border-rosa-200 bg-rosa-50/60 p-4 text-center">
            <p className="text-sm font-medium text-noche">
              Ya subiste tus {TOPE_GRATIS} prendas gratis.
            </p>
            <p className="mt-1 text-xs text-noche/60">
              Con la membresía subes las que quieras y armamos tu manual de
              estilo completo.
            </p>
            <a
              href="/membresia"
              className="mt-3 inline-block rounded-full bg-noche px-5 py-2 text-sm font-medium text-white transition hover:bg-rosa-500"
            >
              Ver la membresía
            </a>
          </div>
        ) : (
          <p className="mt-2 text-center text-xs text-noche/40">
            {count}/{TOPE_GRATIS} prendas gratis.
          </p>
        )}
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
