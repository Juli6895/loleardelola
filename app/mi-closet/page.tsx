"use client";

import { useEffect, useState } from "react";
import ClosetUpload from "@/components/ClosetUpload";
import ClosetGrid from "@/components/ClosetGrid";
import { fetchConDispositivo } from "@/lib/device-id";
import type { ClosetItem } from "@/types";
import SubNavCuenta from "@/components/SubNavCuenta";
import EncabezadoSeccion from "@/components/EncabezadoSeccion";
import { CUPOS_MEMBRESIA, TOPES } from "@/lib/planes";
import { esAdmin } from "@/lib/admin-correos";
import { useAnotarUnaVez } from "@/lib/use-evento";
import { useUsuario } from "@/lib/use-usuario";

// El tope vive en lib/planes.ts, junto con los de búsquedas y outfits.
// Acá solo se muestra; quien lo hace cumplir es la API.

// Página "Mi Clóset": la usuaria sube fotos de sus prendas y las ve
// organizadas por categoría. Fase 1 del roadmap premium — base de datos
// que después usan el Manual de asesoría y el Avatar.
export default function MiClosetPage() {
  useAnotarUnaVez("closet_visto");
  const [items, setItems] = useState<ClosetItem[] | null>(null);
  const { usuario } = useUsuario();
  const conMembresia = usuario?.plan === "membresia";

  useEffect(() => {
    fetchConDispositivo("/api/closet")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => setItems([]));
  }, []);

  // Subir prendas es parte de la membresía (ver TOPES en lib/planes.ts).
  // Sin membresía: una prenda gratis en total (ver TOPES). Mientras carga, o
  // si ya la borró, se deja intentar y el servidor decide (revisarTope).
  const atLimit = !conMembresia && !esAdmin(usuario?.email) && (items?.length ?? 0) >= (TOPES.gratis.prendasCloset ?? 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <SubNavCuenta />
      <EncabezadoSeccion titulo="Mi" destacado="clóset" frase="Sube tus prendas: las clasificamos y te armamos combinaciones." />

      <div className="mx-auto max-w-2xl">
        {/* En el tope no se muestra el botón de subir: el servidor la
            rechazaría igual (ver revisarTope). */}
        {!atLimit && (
          <ClosetUpload
            onAdded={(item) => setItems((prev) => [item, ...(prev ?? [])])}
          />
        )}
        {atLimit ? (
          <div className="mt-3 rounded-xl border border-rosa-200 bg-rosa-50/60 p-4 text-center">
            <p className="text-sm font-medium text-noche">Ya subiste tu prenda gratis. Subir más es parte de la membresía.</p>
            <p className="mt-1 text-xs text-noche/60">
              Con la mensual subes {CUPOS_MEMBRESIA.mensual.prendasCloset} prendas y con la anual{" "}
              {CUPOS_MEMBRESIA.anual.prendasCloset}, y te armamos combinaciones con lo que tienes.
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
            Con la membresía mensual subes {CUPOS_MEMBRESIA.mensual.prendasCloset} prendas y con la anual{" "}
            {CUPOS_MEMBRESIA.anual.prendasCloset}.
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
