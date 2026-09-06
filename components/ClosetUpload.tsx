"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { ClosetItem } from "@/types";

type Props = {
  onAdded: (item: ClosetItem) => void;
};

// Zona para agregar una prenda al clóset: subir archivo o pegar con Ctrl+V.
// Mismo patrón de interacción que el uploader de /buscar (SearchBox), pero
// llama a /api/closet en vez de /api/vision — clasifica UNA prenda, no un
// outfit completo.
export default function ClosetUpload({ onAdded }: Props) {
  const [loading, setLoading] = useState(false);

  async function analyzeFile(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("La imagen es muy grande (máx 8MB)");
      return;
    }
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/closet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
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
  }, [loading]);

  return (
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
        {loading ? "Agregando prenda..." : "Haz clic aquí y pega tu foto con Ctrl+V"}
      </span>
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
