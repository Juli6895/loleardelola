"use client";

import { useEffect, useState } from "react";
import ClosetUpload from "@/components/ClosetUpload";
import ClosetGrid from "@/components/ClosetGrid";
import { fetchConDispositivo } from "@/lib/device-id";
import type { ClosetItem } from "@/types";
import SubNavCuenta from "@/components/SubNavCuenta";
import { TOPES, TOPES_MES_MEMBRESIA } from "@/lib/planes";
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
  // Ver TOPES en lib/planes.ts: sin cuenta, 0 (hay que crearla).
  const TOPE_GRATIS = (usuario?.conSesion ? TOPES.gratis.prendasCloset : TOPES.anonimo.prendasCloset) ?? 1;
  const sinCuentaNiPrendas = !usuario?.conSesion && TOPE_GRATIS === 0;

  useEffect(() => {
    fetchConDispositivo("/api/closet")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => setItems([]));
  }, []);

  const count = items?.length ?? 0;
  // Con membresía el tope es de prendas nuevas al mes, no el de las 2
  // gratis: antes le salía "Ya subiste tus 2 prendas gratis" aunque
  // hubiera pagado.
  const atLimit = !conMembresia && count >= TOPE_GRATIS;

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
        {/* En el tope no se muestra el botón de subir: el servidor la
            rechazaría igual (ver revisarTope). */}
        {!atLimit && (
          <ClosetUpload
            onAdded={(item) => setItems((prev) => [item, ...(prev ?? [])])}
          />
        )}
        {sinCuentaNiPrendas ? (
          <div className="mt-3 rounded-xl border border-rosa-200 bg-rosa-50/60 p-4 text-center">
            <p className="text-sm font-medium text-noche">Para subir tus prendas, crea tu cuenta gratis.</p>
            <p className="mt-1 text-xs text-noche/60">
              Con tu cuenta subes {TOPES.gratis.prendasCloset} {TOPES.gratis.prendasCloset === 1 ? "prenda" : "prendas"} y te
              armamos {TOPES.gratis.combinacionesClosetGratis === 1 ? "una combinación" : `${TOPES.gratis.combinacionesClosetGratis} combinaciones`} con lo que tienes.
            </p>
            <a
              href="/entrar?volver=/mi-closet&motivo=Crea tu cuenta gratis para subir las prendas de tu clóset."
              className="mt-3 inline-block rounded-full bg-noche px-5 py-2 text-sm font-medium text-white transition hover:bg-rosa-500"
            >
              Crear mi cuenta gratis
            </a>
          </div>
        ) : atLimit ? (
          <div className="mt-3 rounded-xl border border-rosa-200 bg-rosa-50/60 p-4 text-center">
            <p className="text-sm font-medium text-noche">
              {TOPE_GRATIS === 1 ? "Ya subiste tu prenda gratis." : `Ya subiste tus ${TOPE_GRATIS} prendas gratis.`}
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
        ) : conMembresia ? (
          <p className="mt-2 text-center text-xs text-noche/40">
            Con tu membresía subes {TOPES_MES_MEMBRESIA.prendasCloset} prendas nuevas cada mes.
          </p>
        ) : (
          <p className="mt-2 text-center text-xs text-noche/40">
            {count}/{TOPE_GRATIS} {TOPE_GRATIS === 1 ? "prenda gratis" : "prendas gratis"}.
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
