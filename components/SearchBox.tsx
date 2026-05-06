"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { VisionResult } from "@/types";

export type SearchResult = {
  imageUrl: string;
  result: VisionResult;
  pinterestUrl?: string;
  // Lista de comercios excluidos viene del servidor (config editable).
  excludedMerchants?: string[];
};

type Props = {
  onResult: (r: SearchResult) => void;
};

// Sugerencias rápidas de presupuesto en COP. La usuaria también puede teclear
// un valor libre en el input.
const QUICK_BUDGETS = [
  { label: "$150k", value: 150000 },
  { label: "$300k", value: 300000 },
  { label: "$500k", value: 500000 },
  { label: "$1M", value: 1000000 },
];

// Caja de búsqueda: admite URL de Pinterest o archivo subido + presupuesto.
export default function SearchBox({ onResult }: Props) {
  const [pinUrl, setPinUrl] = useState("");
  // Mantenemos el budget como string para que el input se sienta natural
  // (vacío = sin presupuesto). Lo parseamos a número solo al enviar.
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);

  function parseBudget(): number | null {
    const cleaned = budget.replace(/[^\d]/g, ""); // quita puntos, comas, $, etc.
    const n = parseInt(cleaned, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  async function postAnalysis(payload: Record<string, unknown>) {
    const budgetCop = parseBudget();
    const res = await fetch("/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, budgetCop }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error analizando la imagen");
    return data as SearchResult;
  }

  async function analyzePinterestUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!pinUrl.trim()) return;
    setLoading(true);
    try {
      const data = await postAnalysis({ pinterestUrl: pinUrl.trim() });
      onResult({ ...data, pinterestUrl: pinUrl.trim() });
      toast.success("¡Outfit analizado!");
    } catch (err: any) {
      toast.error(err.message ?? "Algo salió mal");
    } finally {
      setLoading(false);
    }
  }

  async function analyzeFile(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("La imagen es muy grande (máx 8MB)");
      return;
    }
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const data = await postAnalysis({ imageBase64: base64 });
      onResult(data);
      toast.success("¡Outfit analizado!");
    } catch (err: any) {
      toast.error(err.message ?? "Algo salió mal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm sm:p-8">
      <form onSubmit={analyzePinterestUrl} className="flex flex-col gap-3">
        <label htmlFor="pin-url" className="text-sm font-medium text-noche/80">
          Pega el link de un pin de Pinterest
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="pin-url"
            type="url"
            value={pinUrl}
            onChange={(e) => setPinUrl(e.target.value)}
            placeholder="https://www.pinterest.com/pin/..."
            disabled={loading}
            className="flex-1 rounded-full border border-rosa-200 bg-rosa-50/40 px-5 py-3 text-sm outline-none transition placeholder:text-noche/30 focus:border-rosa-400 focus:bg-white disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !pinUrl.trim()}
            className="rounded-full bg-noche px-6 py-3 text-sm font-medium text-white transition hover:bg-rosa-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Analizando..." : "Buscar"}
          </button>
        </div>
      </form>

      {/* Bloque de presupuesto: aplica tanto a "buscar pin" como a "subir foto". */}
      <div className="mt-5 rounded-xl border border-rosa-100 bg-rosa-50/40 p-4">
        <label htmlFor="budget" className="text-sm font-medium text-noche/80">
          Presupuesto total <span className="text-noche/40">(opcional)</span>
        </label>
        <p className="mt-0.5 text-xs text-noche/50">
          Repartimos el monto entre las prendas y filtramos Google Shopping
          para que no te muestre cosas fuera de tu rango.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-noche/40">
              $
            </span>
            <input
              id="budget"
              type="text"
              inputMode="numeric"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="300.000"
              disabled={loading}
              className="w-full rounded-full border border-rosa-200 bg-white py-2.5 pl-8 pr-4 text-sm outline-none transition placeholder:text-noche/30 focus:border-rosa-400 disabled:opacity-50"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_BUDGETS.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() =>
                  setBudget(b.value.toLocaleString("es-CO"))
                }
                disabled={loading}
                className="rounded-full border border-rosa-200 bg-white px-3 py-1.5 text-xs text-noche/70 transition hover:border-rosa-400 hover:text-rosa-600 disabled:opacity-50"
              >
                {b.label}
              </button>
            ))}
            {budget && (
              <button
                type="button"
                onClick={() => setBudget("")}
                disabled={loading}
                className="rounded-full px-3 py-1.5 text-xs text-noche/40 transition hover:text-rosa-600 disabled:opacity-50"
              >
                limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-noche/30">
        <span className="h-px flex-1 bg-rosa-100" />
        <span>o</span>
        <span className="h-px flex-1 bg-rosa-100" />
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rosa-200 bg-rosa-50/50 px-4 py-8 text-center transition hover:border-rosa-400 hover:bg-rosa-50">
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
          Sube una foto de tu inspiración
        </span>
        <span className="text-xs text-noche/50">PNG, JPG hasta 8MB</span>
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
      </label>

      {loading && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-rosa-600">
          <span className="h-2 w-2 animate-pulse-rosa rounded-full bg-rosa-400" />
          <span>Detectando prendas...</span>
        </div>
      )}
    </div>
  );
}

// Convierte un File a base64 data URL
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
