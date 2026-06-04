"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import QuizWizard from "@/components/QuizWizard";
import QuizResult, { type QuizResultData } from "@/components/QuizResult";
import type { QuizAnswers } from "@/lib/quiz-outfit";

// =====================================================================
// /personalizar — Página del cuestionario interactivo
// =====================================================================
// Estados:
//   - quiz: mostrando el QuizWizard (estado inicial).
//   - loading: enviando respuestas y esperando a Claude + gpt-image-1.
//   - result: outfit generado, mostrando QuizResult.
//   - error: algo falló, mostrar mensaje + opción a reintentar.
//
// Esta página NO depende de /buscar, /api/vision, ni del SearchResult.
// Es completamente independiente para no romper el flujo existente.
// =====================================================================

type Phase =
  | { kind: "quiz" }
  | { kind: "loading" }
  | { kind: "result"; data: QuizResultData }
  | { kind: "error"; message: string };

export default function PersonalizarPage() {
  const [phase, setPhase] = useState<Phase>({ kind: "quiz" });

  async function handleSubmit(answers: QuizAnswers) {
    setPhase({ kind: "loading" });
    try {
      const res = await fetch("/api/personalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "No pudimos generar el outfit");
      }
      setPhase({
        kind: "result",
        data: {
          imageUrl: data.imageUrl,
          result: {
            searchTerms: data.result.searchTerms ?? [],
            dominantColors: data.result.dominantColors ?? [],
            outfitSummary: data.result.outfitSummary ?? "",
          },
        },
      });
      toast.success("¡Tu outfit está listo!");
    } catch (e: any) {
      const message =
        e?.message ?? "Algo salió mal. Intenta de nuevo en un momento.";
      setPhase({ kind: "error", message });
      toast.error(message);
    }
  }

  function handleReset() {
    setPhase({ kind: "quiz" });
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-widest text-rosa-500">
          Personalizar
        </p>
        <h1 className="font-display text-4xl text-noche sm:text-5xl">
          Te diseñamos un outfit a la medida ✨
        </h1>
        <p className="max-w-2xl text-noche/60">
          Cuéntanos un poquito de ti y nuestra IA te arma un outfit completo
          sobre un avatar con tu estilo y medidas. Luego puedes buscar cada
          prenda en Google Shopping o en tus tiendas favoritas.
        </p>
      </header>

      {phase.kind === "quiz" && (
        <QuizWizard onSubmit={handleSubmit} loading={false} />
      )}

      {phase.kind === "loading" && (
        <div className="rounded-2xl border border-rosa-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse-rosa rounded-full bg-rosa-100" />
          <h2 className="font-display text-2xl text-noche">
            Diseñando tu outfit…
          </h2>
          <p className="mt-2 text-sm text-noche/60">
            Claude está pensando en las prendas y gpt-image-1 está renderizando
            tu avatar. Esto toma entre 20 y 40 segundos.
          </p>
          <div className="mx-auto mt-6 flex max-w-xs items-center justify-center gap-2 text-xs text-rosa-500">
            <span className="h-1.5 w-1.5 animate-pulse-rosa rounded-full bg-rosa-400" />
            <span>No cierres la pestaña 💕</span>
          </div>
        </div>
      )}

      {phase.kind === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6 text-center">
          <h2 className="font-display text-xl text-red-700">
            Algo salió mal 😔
          </h2>
          <p className="mt-2 text-sm text-red-600">{phase.message}</p>
          <button
            onClick={handleReset}
            className="mt-4 rounded-full bg-noche px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500"
          >
            Intentar de nuevo
          </button>
        </div>
      )}

      {phase.kind === "result" && (
        <QuizResult data={phase.data} onReset={handleReset} />
      )}
    </div>
  );
}
