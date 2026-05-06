"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import toast from "react-hot-toast";
import OutfitCard from "@/components/OutfitCard";
import BoardsList from "@/components/BoardsList";
import type { Outfit } from "@/types";

// Página "Mis Outfits": muestra outfits guardados + boards de Pinterest
export default function MisOutfitsPage() {
  const { data: session, status } = useSession();
  const [outfits, setOutfits] = useState<Outfit[] | null>(null);
  // Lista de comercios excluidos (config editable). Se pasa a OutfitCard
  // para que las URLs de Google Shopping respeten las exclusiones.
  const [excludedMerchants, setExcludedMerchants] = useState<string[]>([]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/outfits")
      .then((r) => r.json())
      .then((j) => setOutfits(j.outfits ?? []))
      .catch(() => setOutfits([]));
  }, [status]);

  // Carga la lista de exclusiones una sola vez al montar (cacheable a nivel
  // de browser por /api/config/route.ts).
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((j) => setExcludedMerchants(j.excludedMerchants ?? []))
      .catch(() => setExcludedMerchants([]));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que quieres eliminar este outfit?")) return;
    try {
      const res = await fetch(`/api/outfits?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      setOutfits((prev) => prev?.filter((o) => o.id !== id) ?? null);
      toast.success("Outfit eliminado");
    } catch {
      toast.error("No se pudo eliminar");
    }
  }

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
          Conecta tu cuenta para guardar outfits y ver tus boards aquí.
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

  return (
    <div className="space-y-12">
      <header className="flex flex-col gap-1">
        <p className="text-sm uppercase tracking-widest text-rosa-500">
          Tu perfil
        </p>
        <h1 className="font-display text-4xl text-noche sm:text-5xl">
          Hola, {session.user?.name ?? "bonita"} 💕
        </h1>
      </header>

      <section>
        <h2 className="font-display text-2xl text-noche">
          Tus outfits guardados
        </h2>
        <p className="mt-1 text-sm text-noche/60">
          Todos los looks que has analizado y guardado.
        </p>

        {outfits === null ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse-rosa rounded-2xl bg-rosa-100"
              />
            ))}
          </div>
        ) : outfits.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-rosa-200 bg-white p-10 text-center">
            <p className="text-noche/60">
              Todavía no has guardado ningún outfit.
            </p>
            <a
              href="/buscar"
              className="mt-4 inline-block rounded-full bg-noche px-6 py-2.5 text-sm font-medium text-white hover:bg-rosa-500"
            >
              Buscar mi primer outfit
            </a>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {outfits.map((o) => (
              <OutfitCard
                key={o.id}
                outfit={o}
                onDelete={handleDelete}
                excludeMerchants={excludedMerchants}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl text-noche">
          Tus boards de Pinterest
        </h2>
        <p className="mt-1 text-sm text-noche/60">
          Importados directamente desde tu cuenta.
        </p>
        <div className="mt-6">
          <BoardsList />
        </div>
      </section>
    </div>
  );
}
