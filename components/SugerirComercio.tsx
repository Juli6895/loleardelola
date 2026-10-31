"use client";

import { anotar } from "@/lib/use-evento";
import { ENLACE_SUGERIR } from "@/lib/sugerir-comercio";

// "Escríbenos y envíanos la página web": para tener cada vez más
// comercios (ver lib/sugerir-comercio.ts).

type Props = {
  // "tarjeta": recuadro con título; "linea": una frase corta (listas, paneles).
  forma?: "tarjeta" | "linea";
  // Dónde se mostró, para el tablero.
  origen: string;
  oscuro?: boolean;
};

export default function SugerirComercio({ forma = "tarjeta", origen, oscuro = false }: Props) {
  const alTocar = () => anotar("comercio_sugerido", { origen });

  if (forma === "linea") {
    return (
      <p className={`text-xs ${oscuro ? "text-white/60" : "text-noche/60"}`}>
        ¿No está la tienda que te gusta?{" "}
        <a
          href={ENLACE_SUGERIR}
          onClick={alTocar}
          className={`font-medium underline underline-offset-2 ${oscuro ? "text-rosa-300" : "text-rosa-600"}`}
        >
          Escríbenos y envíanos su página web
        </a>
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-rosa-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-display text-lg text-noche">¿Qué comercio te gustaría tener aquí?</p>
        <p className="mt-0.5 text-sm text-noche/60">
          Escríbenos y envíanos su página web. Lo revisamos y, si tiene catálogo en línea, lo agregamos con
          sus promociones.
        </p>
      </div>
      <a
        href={ENLACE_SUGERIR}
        onClick={alTocar}
        className="shrink-0 rounded-full bg-noche px-4 py-2 text-sm font-medium text-white hover:bg-noche/85"
      >
        Escríbenos
      </a>
    </div>
  );
}
