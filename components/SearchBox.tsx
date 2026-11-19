"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchConDispositivo } from "@/lib/device-id";
import type { TiendaInstagram, VisionResult } from "@/types";

export type SearchResult = {
  imageUrl: string;
  result: VisionResult;
  pinterestUrl?: string;
  // Ambas listas de comercios vienen del servidor (config de administración,
  // no editable desde la UI): cuáles excluir y/o a cuáles restringir.
  excludedMerchants?: string[];
  allowedMerchants?: string[];
  // Directorio curado de tiendas que venden por Instagram (config admin).
  tiendasInstagram?: TiendaInstagram[];
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

// Feature flag: el flujo de presupuesto está temporalmente desactivado porque
// el filtro `ppr_max` en Google Shopping recortaba demasiado los resultados.
// Para reactivar: poner true y descomentar el wire en `postAnalysis`.
const BUDGET_ENABLED = false;

// Caja de búsqueda: subir o pegar una foto, o el link de un pin.
export default function SearchBox({ onResult }: Props) {
  const [pinUrl, setPinUrl] = useState("");
  // Mantenemos el budget como string para que el input se sienta natural
  // (vacío = sin presupuesto). Lo parseamos a número solo al enviar.
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState<"foto" | "link">("foto");

  function parseBudget(): number | null {
    const cleaned = budget.replace(/[^\d]/g, ""); // quita puntos, comas, $, etc.
    const n = parseInt(cleaned, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  async function postAnalysis(payload: Record<string, unknown>) {
    // Cuando reactivemos presupuesto, volver a leer parseBudget() y mandarlo.
    const budgetCop = BUDGET_ENABLED ? parseBudget() : null;
    // Con el header de dispositivo: sin él, quien no ha entrado con su
    // correo (o abre la app instalada sin sesión) no tiene cómo ser
    // identificada, y el tope de búsquedas la rechazaba.
    const res = await fetchConDispositivo("/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, budgetCop }),
    });
    const data = await res.json();
    // Sin cuenta no hay búsquedas: en vez de un aviso que se pierde, se
    // la lleva a crear su cuenta y vuelve aquí después.
    if (res.status === 402 && data.destrabaCon === "gratis") {
      window.location.href = `/entrar?volver=/buscar&motivo=${encodeURIComponent(data.error ?? "Crea tu cuenta gratis para buscar tu outfit.")}`;
      throw new Error(data.error ?? "Crea tu cuenta gratis para buscar tu outfit.");
    }
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

  // Permite pegar una imagen copiada (Ctrl+V) desde cualquier parte de la
  // página — captura de pantalla, imagen copiada de Pinterest, etc. — sin
  // tener que guardarla primero y subirla como archivo.
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

  const pestana = (activa: boolean) =>
    `flex-1 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-medium transition sm:text-sm ${
      activa ? "bg-noche text-white shadow-sm" : "text-noche/60 hover:text-noche"
    }`;

  return (
    <div className="rounded-2xl border border-rosa-100 bg-white/95 p-4 shadow-sm backdrop-blur sm:p-6">
      {/* Dos formas de buscar: la foto va primero porque es la que más se usa
          en el celular. Pegar una imagen con Ctrl+V funciona en las dos. */}
      <div role="group" aria-label="Cómo quieres buscar" className="flex gap-1 rounded-full bg-rosa-50 p-1">
        <button type="button" aria-pressed={modo === "foto"} onClick={() => setModo("foto")} className={pestana(modo === "foto")}>
          Subir foto
        </button>
        <button type="button" aria-pressed={modo === "link"} onClick={() => setModo("link")} className={pestana(modo === "link")}>
          Link de Pinterest
        </button>
      </div>

      {/* Bloque de presupuesto: aplica tanto a "buscar pin" como a "subir foto". */}
      {BUDGET_ENABLED && (
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
      )}


      {loading ? (
        <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-2xl bg-rosa-50/60 px-4 py-10 text-center">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 animate-pulse-rosa rounded-full bg-rosa-400" />
            <span className="h-2.5 w-2.5 animate-pulse-rosa rounded-full bg-rosa-400 [animation-delay:150ms]" />
            <span className="h-2.5 w-2.5 animate-pulse-rosa rounded-full bg-rosa-400 [animation-delay:300ms]" />
          </span>
          <span className="text-sm font-medium text-noche" role="status">
            Buscando cada prenda...
          </span>
        </div>
      ) : modo === "foto" ? (
        /* Toda la caja es tocable: en el celular abre la cámara o la galería. */
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rosa-200 bg-rosa-50/50 px-4 py-9 text-center outline-none transition hover:border-rosa-400 hover:bg-rosa-50 focus-within:border-rosa-400 focus-within:bg-rosa-50 focus-within:ring-2 focus-within:ring-rosa-200">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={loading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) analyzeFile(f);
              e.target.value = "";
            }}
          />
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-rosa-500 shadow-sm">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2.5M12 4v11m0-11-4 4m4-4 4 4" />
            </svg>
          </span>
          <span className="text-sm font-semibold text-noche">Toca para subir tu foto</span>
          <span className="text-xs text-noche/50">
            <span className="hidden sm:inline">o pégala con Ctrl+V · </span>Mejor de cuerpo entero y con buena luz
          </span>
        </label>
      ) : (
        <form onSubmit={analyzePinterestUrl} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="pin-url" className="sr-only">
            Link del pin de Pinterest
          </label>
          <input
            id="pin-url"
            type="url"
            value={pinUrl}
            onChange={(e) => setPinUrl(e.target.value)}
            placeholder="Pega aquí el link del pin"
            disabled={loading}
            className="flex-1 rounded-full border border-rosa-200 bg-rosa-50/40 px-5 py-3 text-sm outline-none transition placeholder:text-noche/35 focus:border-rosa-400 focus:bg-white disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !pinUrl.trim()}
            className="rounded-full bg-noche px-6 py-3 text-sm font-medium text-white transition hover:bg-rosa-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Buscar
          </button>
        </form>
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
