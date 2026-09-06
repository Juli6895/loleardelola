"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import ClosetUpload from "@/components/ClosetUpload";
import ClosetGrid from "@/components/ClosetGrid";
import type { ClosetItem } from "@/types";

const FREE_CLOSET_LIMIT = 15;

// Página "Mi Clóset": la usuaria sube fotos de sus prendas y las ve
// organizadas por categoría. Fase 1 del roadmap premium — base de datos
// que después usan el Manual de asesoría y el Avatar.
export default function MiClosetPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<ClosetItem[] | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/closet")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => setItems([]));
  }, [status]);

  if (status === "loading") {
    return (
      <div className="mx-auto mt-20 h-8 w-40 animate-pulse-rosa rounded-full bg-rosa-100" />
    );
  }

  if (!session) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-3xl border border-rosa-100 bg-white p-10 text-center shadow-suave">
        <h1 className="font-display text-3xl text-noche">
          Entra con Pinterest
        </h1>
        <p className="mt-3 text-noche/60">
          Conecta tu cuenta para armar tu clóset digital.
        </p>
        <button
          onClick={() => signIn("pinterest")}
          className="mt-6 rounded-full bg-noche px-6 py-3 text-sm font-medium text-white transition hover:bg-rosa-500"
        >
          Entrar con Pinterest
        </button>
      </div>
    );
  }

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
