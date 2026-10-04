"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchConDispositivo } from "@/lib/device-id";
import type { ClosetCategory, ClosetItem } from "@/types";

// Para fotos donde una persona lleva varias prendas puestas: así la IA
// sabe cuál mirar. Es opcional — sin marcar, la IA decide.
const PISTAS: Array<{ valor: ClosetCategory; nombre: string }> = [
  { valor: "top", nombre: "Arriba" },
  { valor: "bottom", nombre: "Abajo" },
  { valor: "vestido", nombre: "Vestido" },
  { valor: "abrigo", nombre: "Abrigo / chaqueta" },
  { valor: "calzado", nombre: "Calzado" },
  { valor: "accesorio", nombre: "Accesorio" },
];

type Props = {
  onAdded: (item: ClosetItem) => void;
  // Con cuenta, cada prenda sale en foto de catálogo (Gemini) y tarda más.
  conCuenta?: boolean;
};

// Zona para agregar una prenda al clóset: subir archivo o pegar con Ctrl+V.
// Mismo patrón de interacción que el uploader de /buscar (SearchBox), pero
// llama a /api/closet en vez de /api/vision — clasifica UNA prenda, no un
// outfit completo.
export default function ClosetUpload({ onAdded, conCuenta }: Props) {
  const [loading, setLoading] = useState(false);
  const [pista, setPista] = useState<ClosetCategory | null>(null);

  async function analyzeFile(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("La imagen es muy grande (máx 8MB)");
      return;
    }
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetchConDispositivo("/api/closet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, pista }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error ?? "No pudimos agregar la prenda al clóset"
        );
      }
      onAdded(json.item);
      toast.success(`¡Agregada! ${json.item.label}`);
    } catch (err: any) {
      toast.error(err.message ?? "Algo salió mal");
    } finally {
      setLoading(false);
    }
  }

  // Pegar una foto copiada (Ctrl+V) desde cualquier parte de la página.
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (loading) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            analyzeFile(file);
          }
          break;
        }
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, pista]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-noche/60">¿Qué prenda vas a subir?</span>
        {PISTAS.map((p) => (
          <button
            key={p.valor}
            type="button"
            onClick={() => setPista(pista === p.valor ? null : p.valor)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              pista === p.valor
                ? "border-rosa-500 bg-rosa-500 text-white"
                : "border-rosa-200 bg-white text-noche/70 hover:border-rosa-400"
            }`}
          >
            {p.nombre}
          </button>
        ))}
        <span className="text-[11px] text-noche/40">
          Opcional: ayuda cuando en la foto se ven varias prendas.
        </span>
      </div>
      <div
        tabIndex={0}
        onClick={(e) => e.currentTarget.focus()}
        className="flex cursor-text flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rosa-200 bg-rosa-50/50 px-4 py-8 text-center outline-none transition hover:border-rosa-400 hover:bg-rosa-50 focus:border-rosa-400 focus:bg-rosa-50 focus:ring-2 focus:ring-rosa-200"
      >
        <svg
          className="h-8 w-8 text-rosa-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 16.5V21h4.5M3 7.5V3h4.5M21 7.5V3h-4.5M21 16.5V21h-4.5M12 8v8m-4-4h8"
          />
        </svg>
        <span className="text-sm font-medium text-noche">
          {loading
            ? conCuenta
              ? "Dejando tu prenda en foto de catálogo y leyéndola…"
              : "Agregando prenda..."
            : "Haz clic aquí y pega tu foto con Ctrl+V"}
        </span>
        {loading && conCuenta && (
          <span className="text-[11px] text-noche/40">Tarda unos 30 segundos.</span>
        )}
        <span className="text-xs text-noche/50">
          o{" "}
          <label className="cursor-pointer font-medium text-rosa-600 underline-offset-2 hover:underline">
            sube un archivo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={loading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) analyzeFile(f);
                e.target.value = "";
              }}
            />
          </label>{" "}
          · PNG, JPG hasta 8MB
        </span>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
