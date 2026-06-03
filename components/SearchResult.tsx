"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import TagChip from "./TagChip";
import {
  googleShoppingUrl,
  googleShoppingUrlConMarca,
  MARCAS_FAVORITAS,
  type MarcaFavorita,
} from "@/lib/shopping";
import { useSession, signIn } from "next-auth/react";
import type { SearchResult as Result } from "./SearchBox";

export default function SearchResult({ data }: { data: Result }) {
  const { data: session } = useSession();

  // ── Prendas (mutables) ───────────────────────────────────────────────
  const [terms, setTerms] = useState<string[]>(data.result.searchTerms);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Secuenciador "Buscar todo" ────────────────────────────────────────
  // seqIdx: índice de la PRÓXIMA prenda a abrir.
  // -1 = no iniciado / completado (muestra botón inicial)
  const [seqIdx, setSeqIdx] = useState(-1);

  function buscarSiguiente() {
    const idx = seqIdx < 0 ? 0 : seqIdx;
    if (idx >= terms.length) {
      setSeqIdx(-1);
      return;
    }
    window.open(googleShoppingUrl(terms[idx]), "_blank", "noopener,noreferrer");
    setSeqIdx(idx + 1 >= terms.length ? -1 : idx + 1);
  }

  // Etiqueta dinámica del botón secuenciador
  function labelBuscar() {
    if (seqIdx <= 0) return `Buscar todo el outfit (${terms.length})`;
    const prendaCorta = terms[seqIdx].length > 28
      ? terms[seqIdx].slice(0, 26) + "…"
      : terms[seqIdx];
    return `Siguiente → ${prendaCorta} (${seqIdx}/${terms.length})`;
  }

  // ── Panel de marcas ───────────────────────────────────────────────────
  const [marcaPanel, setMarcaPanel] = useState<MarcaFavorita | null>(null);
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());

  function abrirMarca(marca: MarcaFavorita) {
    setMarcaPanel((prev) => (prev === marca ? null : marca));
    setAbiertos(new Set());
  }

  function marcarAbierto(i: number) {
    setAbiertos((prev) => new Set(prev).add(i));
  }

  // ── Panel de agregar prenda ───────────────────────────────────────────
  const [panelAgregar, setPanelAgregar] = useState(false);
  const [textoPrenda, setTextoPrenda] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function removeTerm(term: string) {
    setTerms((prev) => prev.filter((t) => t !== term));
    setSeqIdx(-1);
  }

  function agregarPrenda() {
    const texto = textoPrenda.trim();
    if (!texto) return;
    if (terms.includes(texto)) { toast("Esa prenda ya está en la lista"); return; }
    setTerms((prev) => [...prev, texto]);
    setTextoPrenda("");
    setSeqIdx(-1);
    toast.success("¡Prenda agregada!");
    inputRef.current?.focus();
  }

  // ── Guardar outfit ────────────────────────────────────────────────────
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
          pinterestUrl: data.pinterestUrl ?? null,
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

      {/* ── Imagen ── */}
      <div className="lg:col-span-2">
        <div className="overflow-hidden rounded-2xl border border-rosa-100 bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.imageUrl} alt="Outfit analizado" className="h-auto w-full object-cover" />
        </div>
      </div>

      {/* ── Panel de resultados ── */}
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl text-noche">Esto fue lo que vimos en la foto</h2>
          <p className="mt-1 text-sm text-noche/60">
            Haz clic en cada prenda para buscarla · toca la ✕ para eliminarla.
          </p>

          {/* ── Chips ── */}
          {terms.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {terms.map((t) => (
                <TagChip key={t} term={t} onRemove={() => removeTerm(t)} />
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-rosa-50 p-4 text-sm text-noche/70">
              No hay prendas en la lista. Agrega una con el botón de abajo.
            </p>
          )}

          {data.result.dominantColors.length > 0 && (
            <p className="mt-4 text-xs text-noche/40">
              Colores dominantes: {data.result.dominantColors.join(", ")}
            </p>
          )}

          {/* ── Agregar prenda ── */}
          <div className="mt-4">
            {!panelAgregar ? (
              <button
                onClick={() => setPanelAgregar(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-rosa-300 bg-rosa-50/60 px-4 py-2 text-sm font-medium text-rosa-500 transition hover:border-rosa-400 hover:bg-rosa-50 hover:text-rosa-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar prenda o accesorio
              </button>
            ) : (
              <div className="rounded-2xl border border-rosa-200 bg-rosa-50/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-noche">¿Qué prenda quieres agregar?</p>
                  <button
                    onClick={() => { setPanelAgregar(false); setTextoPrenda(""); }}
                    className="rounded-full p-1 text-noche/30 transition hover:bg-rosa-100 hover:text-rosa-500"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); agregarPrenda(); }} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={textoPrenda}
                    onChange={(e) => setTextoPrenda(e.target.value)}
                    placeholder="ej: bolso negro cuero, gorra beige…"
                    autoFocus
                    className="flex-1 rounded-full border border-rosa-200 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-noche/30 focus:border-rosa-400"
                  />
                  <button
                    type="submit"
                    disabled={!textoPrenda.trim()}
                    className="rounded-full bg-rosa-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Agregar
                  </button>
                </form>
                <p className="mt-2 text-xs text-noche/40">Escribe el nombre y color. Presiona Enter o toca Agregar.</p>
              </div>
            )}
          </div>

          {/* ── Panel de marca (links directos) ── */}
          {marcaPanel && terms.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-rosa-300 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-rosa-100 bg-rosa-50/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-noche">Buscar en {marcaPanel}</span>
                  <span className="rounded-full bg-rosa-100 px-2 py-0.5 text-xs font-medium text-rosa-600">
                    {abiertos.size}/{terms.length}
                  </span>
                </div>
                <button
                  onClick={() => setMarcaPanel(null)}
                  className="rounded-full p-1 text-noche/30 transition hover:bg-rosa-100 hover:text-rosa-500"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
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
                        yaAbierta ? "bg-green-50/60 text-noche/40" : "bg-white text-noche hover:bg-rosa-50"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                          yaAbierta ? "bg-green-100 text-green-600" : "bg-rosa-100 text-rosa-500 group-hover:bg-rosa-500 group-hover:text-white"
                        }`}>
                          {yaAbierta
                            ? <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            : i + 1}
                        </span>
                        <span className={yaAbierta ? "line-through" : ""}>{t} {marcaPanel}</span>
                      </span>
                      {!yaAbierta && (
                        <span className="flex items-center gap-1 rounded-full bg-rosa-500 px-3 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                          Buscar
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
              {abiertos.size === terms.length && (
                <div className="flex items-center justify-center gap-2 border-t border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-600">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  ¡Buscaste todas las prendas en {marcaPanel}!
                </div>
              )}
            </div>
          )}

          {/* ── Buscar en tienda ── */}
          {terms.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-noche/50">Buscar en tienda</p>
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

          {/* ── Acciones ── */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
