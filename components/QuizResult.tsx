"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useSession, signIn } from "next-auth/react";
import { googleShoppingUrl, googleShoppingUrlConMarca, MARCAS_FAVORITAS, type MarcaFavorita } from "@/lib/shopping";

// =====================================================================
// QuizResult — muestra el outfit personalizado generado
// =====================================================================
// Componente independiente (no comparte código con SearchResult). Se monta
// solo desde /personalizar cuando el endpoint /api/personalizar devuelve.
//
// UX consciente:
//   - La imagen es generada por IA, así que mostramos un disclaimer suave.
//   - Cada chip abre Google Shopping con el término (mismo helper que el
//     resto del app).
//   - Botón "Guardar outfit" reusa /api/outfits (que ya existe).
// =====================================================================

export type QuizResultData = {
  imageUrl: string;
  result: {
    searchTerms: string[];
    dominantColors: string[];
    outfitSummary: string;
  };
};

type Props = {
  data: QuizResultData;
  onReset: () => void;
};

export default function QuizResult({ data, onReset }: Props) {
  const { data: session } = useSession();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [marcaPanel, setMarcaPanel] = useState<MarcaFavorita | null>(null);
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());
  const [seqIdx, setSeqIdx] = useState(-1);

  const terms = data.result.searchTerms;

  function buscarSiguiente() {
    const idx = seqIdx < 0 ? 0 : seqIdx;
    if (idx >= terms.length) {
      setSeqIdx(-1);
      return;
    }
    window.open(
      googleShoppingUrl(terms[idx]),
      "_blank",
      "noopener,noreferrer"
    );
    setSeqIdx(idx + 1 >= terms.length ? -1 : idx + 1);
  }

  function labelBuscar() {
    if (seqIdx <= 0) return `Buscar todo el outfit (${terms.length})`;
    const prendaCorta =
      terms[seqIdx].length > 28
        ? terms[seqIdx].slice(0, 26) + "…"
        : terms[seqIdx];
    return `Siguiente → ${prendaCorta} (${seqIdx}/${terms.length})`;
  }

  function abrirMarca(marca: MarcaFavorita) {
    setMarcaPanel((prev) => (prev === marca ? null : marca));
    setAbiertos(new Set());
  }

  function marcarAbierto(i: number) {
    setAbiertos((prev) => new Set(prev).add(i));
  }

  async function saveOutfit() {
    if (!session) {
      toast("Entra con Pinterest pa' guardar tus outfits 💖");
      signIn("pinterest");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: data.imageUrl,
          tags: terms,
          pinterestUrl: null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      setSaved(true);
      toast.success("¡Outfit guardado en tu perfil!");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* ── Imagen del avatar ── */}
      <div className="lg:col-span-2">
        <div className="overflow-hidden rounded-2xl border border-rosa-100 bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.imageUrl}
            alt="Outfit personalizado generado por IA"
            className="h-auto w-full object-cover"
          />
        </div>
        <p className="mt-2 text-xs text-noche/40">
          ✨ Imagen generada con IA a partir de tus respuestas.
        </p>
      </div>

      {/* ── Panel ── */}
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-rosa-500">
            Tu outfit personalizado
          </p>
          <h2 className="mt-1 font-display text-2xl text-noche">
            Esto te armamos
          </h2>
          {data.result.outfitSummary && (
            <p className="mt-2 text-sm text-noche/70">
              {data.result.outfitSummary}
            </p>
          )}

          {terms.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {terms.map((t) => (
                <a
                  key={t}
                  href={googleShoppingUrl(t)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 rounded-full border border-rosa-200 bg-white px-4 py-2 text-sm font-medium text-noche transition hover:border-rosa-400 hover:bg-rosa-50 hover:text-rosa-600"
                  title={`Buscar "${t}" en Google Shopping`}
                >
                  <span>{t}</span>
                  <svg
                    className="h-3.5 w-3.5 text-noche/40 transition group-hover:text-rosa-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-rosa-50 p-4 text-sm text-noche/70">
              No se pudieron generar prendas. Intenta de nuevo con respuestas
              más específicas.
            </p>
          )}

          {data.result.dominantColors.length > 0 && (
            <p className="mt-4 text-xs text-noche/40">
              Colores dominantes: {data.result.dominantColors.join(", ")}
            </p>
          )}

          {/* Panel de marca (links directos) */}
          {marcaPanel && terms.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-rosa-300 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-rosa-100 bg-rosa-50/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-noche">
                    Buscar en {marcaPanel}
                  </span>
                  <span className="rounded-full bg-rosa-100 px-2 py-0.5 text-xs font-medium text-rosa-600">
                    {abiertos.size}/{terms.length}
                  </span>
                </div>
                <button
                  onClick={() => setMarcaPanel(null)}
                  className="rounded-full p-1 text-noche/30 transition hover:bg-rosa-100 hover:text-rosa-500"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="divide-y divide-rosa-50">
                {terms.map((t, i) => {
                  const yaAbierta = abiertos.has(i);
                  return (
                    <a
                      key={t}
                      href={googleShoppingUrlConMarca(t, marcaPanel)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => marcarAbierto(i)}
                      className={`group flex items-center justify-between px-4 py-3.5 text-sm transition ${
                        yaAbierta
                          ? "bg-green-50/60 text-noche/40"
                          : "bg-white text-noche hover:bg-rosa-50"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                            yaAbierta
                              ? "bg-green-100 text-green-600"
                              : "bg-rosa-100 text-rosa-500 group-hover:bg-rosa-500 group-hover:text-white"
                          }`}
                        >
                          {yaAbierta ? (
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            i + 1
                          )}
                        </span>
                        <span className={yaAbierta ? "line-through" : ""}>
                          {t} {marcaPanel}
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Buscar en tienda */}
          {terms.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-noche/50">
                Buscar en tienda
              </p>
              <div className="flex flex-wrap gap-2">
                {MARCAS_FAVORITAS.map((marca) => (
                  <button
                    key={marca}
                    onClick={() => abrirMarca(marca)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                      marcaPanel === marca
                        ? "border-rosa-500 bg-rosa-500 text-white"
                        : "border-rosa-200 bg-white text-noche hover:border-rosa-400 hover:bg-rosa-50 hover:text-rosa-600"
                    }`}
                  >
                    {marca}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="mt-6 flex flex-wrap gap-3">
            {terms.length > 0 && (
              <button
                onClick={buscarSiguiente}
                className={`rounded-full px-5 py-2.5 text-sm font-medium text-white transition ${
                  seqIdx > 0
                    ? "bg-rosa-500 hover:bg-rosa-600"
                    : "bg-noche hover:bg-rosa-500"
                }`}
              >
                {labelBuscar()}
              </button>
            )}
            <button
              onClick={saveOutfit}
              disabled={saving || saved || terms.length === 0}
              className="rounded-full border border-rosa-300 bg-white px-5 py-2.5 text-sm font-medium text-noche transition hover:border-rosa-400 hover:bg-rosa-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saved ? "Guardado ✓" : saving ? "Guardando..." : "Guardar outfit"}
            </button>
            <button
              onClick={onReset}
              className="rounded-full border border-rosa-200 bg-white px-5 py-2.5 text-sm font-medium text-noche/70 transition hover:bg-rosa-50"
            >
              ✨ Diseñar otro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
