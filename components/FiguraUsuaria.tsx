"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import SiluetaIcon from "@/components/SiluetaIcon";
import { fetchConDispositivo } from "@/lib/device-id";
import type { PerfilSilueta, Silueta } from "@/types";

type Estado = {
  figuraUrl: string | null;
  desactualizada?: boolean;
  puede: boolean;
  motivo: string | null;
};

/**
 * La figura de la usuaria en Mi perfil. Si ya tiene su ilustración
 * hecha con Gemini, se muestra esa; si no, la figura dibujada por código
 * con sus mismos rasgos, y el botón para crear la ilustración.
 */
export default function FiguraUsuaria({
  perfil,
}: {
  perfil: PerfilSilueta & { silueta: Silueta };
}) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [creando, setCreando] = useState(false);

  // Se vuelve a preguntar cuando cambia el perfil: si cambió la piel o
  // el pelo, la ilustración guardada queda desactualizada.
  const clave = JSON.stringify([
    perfil.silueta, perfil.tono_piel, perfil.color_cabello, perfil.largo_cabello,
    perfil.bust_cm, perfil.waist_cm, perfil.hip_cm, perfil.height_cm,
  ]);
  useEffect(() => {
    fetchConDispositivo("/api/perfil/figura")
      .then((r) => r.json())
      .then(setEstado)
      .catch(() => setEstado(null));
  }, [clave]);

  async function crear(otra: boolean) {
    setCreando(true);
    try {
      const res = await fetchConDispositivo("/api/perfil/figura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No pudimos crear tu ilustración.");
      setEstado((e) => ({ ...(e as Estado), figuraUrl: json.figuraUrl, desactualizada: false }));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreando(false);
    }
  }

  const mostrarIlustracion = estado?.figuraUrl && !estado.desactualizada;

  return (
    <div className="mx-auto flex w-[150px] flex-col items-center gap-3 sm:w-[170px]">
      {mostrarIlustracion ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={estado!.figuraUrl!}
          alt="Tu ilustración"
          className="h-[225px] w-[150px] rounded-xl object-contain sm:h-[255px] sm:w-[170px]"
        />
      ) : (
        <div className={creando ? "animate-pulse" : ""}>
          <SiluetaIcon
            silueta={perfil.silueta}
            tonoPiel={perfil.tono_piel}
            colorCabello={perfil.color_cabello}
            largoCabello={perfil.largo_cabello}
            medidas={{
              busto: perfil.bust_cm,
              cintura: perfil.waist_cm,
              cadera: perfil.hip_cm,
              estatura: perfil.height_cm,
            }}
            // El ancho va atado al alto (el lienzo es 150x340).
            className="h-60 w-[106px] sm:h-72 sm:w-[127px]"
          />
        </div>
      )}

      {estado?.puede && (
        <button
          type="button"
          onClick={() => crear(!!mostrarIlustracion)}
          disabled={creando}
          className="rounded-full border border-rosa-200 px-3 py-1.5 text-xs font-medium text-rosa-600 transition hover:border-rosa-400 hover:bg-rosa-50 disabled:opacity-50"
        >
          {creando
            ? "Dibujándote…"
            : mostrarIlustracion
              ? "Crear otra"
              : estado.desactualizada
                ? "Actualizar mi ilustración"
                : "Crear mi ilustración"}
        </button>
      )}
      {creando && <p className="text-center text-[11px] text-noche/40">Tarda unos segundos.</p>}
    </div>
  );
}
