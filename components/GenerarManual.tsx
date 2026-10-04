"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchConDispositivo } from "@/lib/device-id";

type Estado = {
  conMembresia: boolean;
  falta: string[];
  manual: unknown | null;
  desactualizado: boolean;
  formatoViejo?: boolean;
};

/**
 * El cierre de Mi perfil: con todo lo que llenó arriba, generar su
 * manual de estilo. Sin membresía el botón se ve, pero en gris: así
 * sabe que existe y qué tiene que hacer para usarlo.
 */
export default function GenerarManual() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    fetchConDispositivo("/api/manual")
      .then((r) => r.json())
      .then((j) => setEstado(typeof j?.conMembresia === "boolean" ? j : null))
      .catch(() => setEstado(null));
  }, []);

  async function generar() {
    setGenerando(true);
    try {
      const res = await fetchConDispositivo("/api/manual", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No pudimos armar tu manual");
      toast.success("¡Tu manual está listo!");
      router.push("/manual");
    } catch (e: any) {
      toast.error(e.message);
      setGenerando(false);
    }
  }

  const conMembresia = !!estado?.conMembresia;
  const falta = estado?.falta ?? [];
  const alDia = conMembresia && !!estado?.manual && !estado.desactualizado;

  return (
    <section className="rounded-2xl border border-rosa-100 bg-white p-6 text-center shadow-sm sm:p-8">
      <p className="text-xs font-medium uppercase tracking-widest text-rosa-500">Tu manual de estilo</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-noche/70">
        Todo lo que llenaste arriba, cruzado en un documento: tu figura, tu color, tu sello y lo que
        quieres proyectar, con outfits armados y fotos reales de tiendas.
      </p>

      {alDia ? (
        <Link
          href="/manual"
          className="mt-5 inline-block rounded-full bg-noche px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500"
        >
          Ver mi manual
        </Link>
      ) : (
        <button
          type="button"
          onClick={generar}
          disabled={!conMembresia || falta.length > 0 || generando}
          className={`mt-5 rounded-full px-6 py-2.5 text-sm font-medium transition ${
            conMembresia && falta.length === 0
              ? "bg-noche text-white hover:bg-rosa-500 disabled:opacity-50"
              : "cursor-not-allowed bg-noche/10 text-noche/40"
          }`}
        >
          {generando
            ? "Armando tu manual…"
            : estado?.desactualizado
              ? "Actualizar mi manual"
              : "Generar mi manual"}
        </button>
      )}

      {estado && !conMembresia && (
        <p className="mt-3 text-xs text-noche/50">
          Es parte de la membresía.{" "}
          <Link href="/membresia" className="font-medium text-rosa-600 underline">
            Ver la membresía
          </Link>
        </p>
      )}
      {conMembresia && falta.length > 0 && (
        <p className="mt-3 text-xs text-noche/50">Para armarlo nos falta {falta.join(", ")}.</p>
      )}
      {estado?.desactualizado && (
        <p className="mt-3 text-xs text-noche/50">
          {estado.formatoViejo
            ? "Hay una versión nueva de tu manual, armada como una asesoría completa. Actualizarlo no gasta de tus manuales del mes."
            : "Cambiaste algo de tu perfil: vuelve a armarlo con tus datos nuevos."}
        </p>
      )}
    </section>
  );
}
