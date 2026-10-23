"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchConDispositivo } from "@/lib/device-id";
import { marcarSeguida } from "@/lib/use-avisos";

type Seguimiento = {
  url: string;
  titulo: string;
  tienda: string;
  imagen: string | null;
  precio_inicial: number;
  precio_ultimo: number;
  avisado_at: string | null;
};

const pesos = (n: number) => "$" + n.toLocaleString("es-CO");

/** Las prendas con "Avísame si baja", con el precio de cuando las marcó y el de hoy. */
export default function MisAvisos() {
  const [lista, setLista] = useState<Seguimiento[] | null>(null);
  const [puede, setPuede] = useState(false);

  useEffect(() => {
    fetchConDispositivo("/api/seguimientos")
      .then((r) => r.json())
      .then((j) => {
        setPuede(!!j.puede);
        setLista(j.seguimientos ?? []);
      })
      .catch(() => setLista([]));
  }, []);

  async function dejar(url: string) {
    await fetchConDispositivo(`/api/seguimientos?url=${encodeURIComponent(url)}`, { method: "DELETE" });
    setLista((l) => l?.filter((s) => s.url !== url) ?? null);
    marcarSeguida(url, false);
    toast("Ya no te avisamos de esta prenda");
  }

  if (!puede || !lista) return null;

  return (
    <section>
      <h2 className="font-display text-2xl text-noche">Te avisamos si bajan</h2>
      <p className="mt-1 text-sm text-noche/60">
        Revisamos su precio todos los días. Si baja 10% o más desde que la marcaste, te llega una
        notificación al celular.
      </p>
      {lista.length === 0 ? (
        <p className="mt-4 rounded-xl bg-rosa-50/60 p-4 text-sm text-noche/60">
          Toca la campanita en cualquier prenda de tienda (al buscar, en tu clóset o en Promo) y
          aparece acá.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-rosa-100 rounded-2xl border border-rosa-100 bg-white">
          {lista.map((s) => {
            const bajo = s.precio_ultimo < s.precio_inicial;
            return (
              <li key={s.url} className="flex items-center gap-3 p-3">
                {s.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imagen} alt="" className="h-16 w-12 shrink-0 rounded-lg bg-rosa-50 object-cover" />
                ) : (
                  <span className="h-16 w-12 shrink-0 rounded-lg bg-rosa-50" />
                )}
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-noche">{s.titulo}</p>
                  <p className="text-xs text-noche/50">{s.tienda}</p>
                  <p className="mt-0.5 text-xs tabular-nums">
                    <span className={bajo ? "font-semibold text-rosa-600" : "text-noche/70"}>
                      Hoy {pesos(s.precio_ultimo)}
                    </span>
                    {bajo && <span className="text-noche/40"> · la marcaste en {pesos(s.precio_inicial)}</span>}
                  </p>
                </a>
                <button
                  onClick={() => dejar(s.url)}
                  className="shrink-0 rounded-full border border-rosa-200 px-3 py-1 text-xs text-noche/60 transition hover:border-rosa-400 hover:text-noche"
                >
                  Dejar de seguir
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
