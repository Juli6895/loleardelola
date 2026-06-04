"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type {
  QuizAnswers,
  QuizGender,
  QuizBodyType,
  QuizClima,
} from "@/lib/quiz-outfit";

// =====================================================================
// QuizWizard — Multi-step form para personalizar un outfit
// =====================================================================
// Aislado del resto del app. Se monta solo desde /personalizar.
//
// Pasos:
//   1) Cuerpo: género (obligatorio), estatura, tipo de cuerpo.
//   2) Estilo: estilos preferidos (multi) + colores favoritos (multi).
//   3) Ocasión: ocasión (obligatoria) + clima.
//   4) Algo más: texto libre opcional. Confirmar y enviar.
//
// Al terminar, llama onSubmit(answers) — el padre se encarga del fetch.
// =====================================================================

const GENDERS: { value: QuizGender; label: string; emoji: string }[] = [
  { value: "mujer", label: "Mujer", emoji: "👩" },
  { value: "hombre", label: "Hombre", emoji: "👨" },
  { value: "niña", label: "Niña", emoji: "👧" },
  { value: "niño", label: "Niño", emoji: "👦" },
];

const BODY_TYPES: { value: QuizBodyType; label: string }[] = [
  { value: "delgada", label: "Delgada / slim" },
  { value: "atletica", label: "Atlética" },
  { value: "curvilinea", label: "Curvilínea" },
  { value: "plus_size", label: "Plus size" },
  { value: "no_especifica", label: "Prefiero no decir" },
];

const STYLES = [
  "casual",
  "minimalista",
  "elegante",
  "deportivo",
  "vintage",
  "romántico",
  "streetwear",
  "bohemio",
  "preppy",
  "grunge",
  "femenino",
  "andrógino",
];

const COLORS = [
  "negro",
  "blanco",
  "beige",
  "café",
  "vinotinto",
  "azul",
  "azul marino",
  "verde olivo",
  "rojo",
  "rosa",
  "lila",
  "amarillo",
  "mostaza",
  "gris",
];

const OCCASIONS = [
  "salida casual",
  "oficina",
  "fiesta",
  "cita romántica",
  "brunch",
  "gym / deportivo",
  "viaje",
  "evento formal",
  "playa",
  "concierto",
];

const CLIMATES: { value: QuizClima; label: string; emoji: string }[] = [
  { value: "calido", label: "Cálido", emoji: "☀️" },
  { value: "templado", label: "Templado", emoji: "🌤️" },
  { value: "frio", label: "Frío", emoji: "❄️" },
];

type Props = {
  onSubmit: (answers: QuizAnswers) => Promise<void>;
  loading: boolean;
};

export default function QuizWizard({ onSubmit, loading }: Props) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Estado de cada respuesta
  const [gender, setGender] = useState<QuizGender | null>(null);
  const [heightCm, setHeightCm] = useState<string>("");
  const [bodyType, setBodyType] = useState<QuizBodyType>("no_especifica");

  const [styles, setStyles] = useState<string[]>([]);
  const [favoriteColors, setFavoriteColors] = useState<string[]>([]);

  const [occasion, setOccasion] = useState<string>("");
  const [climate, setClimate] = useState<QuizClima | undefined>(undefined);

  const [freeText, setFreeText] = useState<string>("");

  function toggle(arr: string[], v: string) {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function canAdvance(): boolean {
    if (step === 1) return !!gender;
    if (step === 3) return !!occasion.trim();
    return true;
  }

  function handleNext() {
    if (!canAdvance()) {
      if (step === 1) toast("Selecciona tu género para continuar 💕");
      if (step === 3) toast("Elige una ocasión para continuar ✨");
      return;
    }
    if (step < totalSteps) setStep((s) => s + 1);
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  async function handleFinish() {
    if (!gender) return;
    if (!occasion.trim()) return;

    const answers: QuizAnswers = {
      gender,
      heightCm: heightCm ? parseInt(heightCm, 10) : null,
      bodyType,
      styles,
      favoriteColors,
      occasion: occasion.trim(),
      climate,
      freeText: freeText.trim() || undefined,
    };
    await onSubmit(answers);
  }

  return (
    <div className="rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm sm:p-8">
      {/* Progreso */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-widest text-rosa-500">
          <span>Paso {step} de {totalSteps}</span>
          <span className="text-noche/40">
            {step === 1 && "Tu cuerpo"}
            {step === 2 && "Tu estilo"}
            {step === 3 && "La ocasión"}
            {step === 4 && "Detalles finales"}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-rosa-100">
          <div
            className="h-full bg-rosa-400 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Paso 1 */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl text-noche">
              Cuéntanos un poquito de ti
            </h2>
            <p className="mt-1 text-sm text-noche/60">
              Es para que el outfit que diseñemos te quede como anillo al dedo.
            </p>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-noche/80">
              ¿Para quién es el outfit? <span className="text-rosa-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {GENDERS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGender(g.value)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-5 text-sm font-medium transition ${
                    gender === g.value
                      ? "border-rosa-500 bg-rosa-50 text-rosa-600"
                      : "border-rosa-100 bg-white text-noche/70 hover:border-rosa-300 hover:bg-rosa-50/50"
                  }`}
                >
                  <span className="text-2xl">{g.emoji}</span>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="height"
              className="mb-2 block text-sm font-medium text-noche/80"
            >
              Estatura <span className="text-noche/40">(opcional)</span>
            </label>
            <div className="relative max-w-xs">
              <input
                id="height"
                type="text"
                inputMode="numeric"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value.replace(/\D/g, ""))}
                placeholder="165"
                className="w-full rounded-full border border-rosa-200 bg-white px-5 py-2.5 pr-12 text-sm outline-none transition placeholder:text-noche/30 focus:border-rosa-400"
              />
              <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm text-noche/40">
                cm
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-noche/80">
              Tipo de cuerpo <span className="text-noche/40">(opcional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {BODY_TYPES.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setBodyType(b.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    bodyType === b.value
                      ? "border-rosa-500 bg-rosa-500 text-white"
                      : "border-rosa-200 bg-white text-noche/70 hover:border-rosa-400 hover:bg-rosa-50"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paso 2 */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl text-noche">
              ¿Cuál es tu vibra?
            </h2>
            <p className="mt-1 text-sm text-noche/60">
              Escoge varios estilos y colores que te encanten. No hay un tope.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-noche/80">
              Estilos preferidos
              {styles.length > 0 && (
                <span className="ml-2 text-noche/40">
                  ({styles.length} elegidos)
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyles((prev) => toggle(prev, s))}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    styles.includes(s)
                      ? "border-rosa-500 bg-rosa-500 text-white"
                      : "border-rosa-200 bg-white text-noche/70 hover:border-rosa-400 hover:bg-rosa-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-noche/80">
              Colores favoritos
              {favoriteColors.length > 0 && (
                <span className="ml-2 text-noche/40">
                  ({favoriteColors.length} elegidos)
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setFavoriteColors((prev) => toggle(prev, c))
                  }
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    favoriteColors.includes(c)
                      ? "border-rosa-500 bg-rosa-500 text-white"
                      : "border-rosa-200 bg-white text-noche/70 hover:border-rosa-400 hover:bg-rosa-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paso 3 */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl text-noche">
              ¿Para qué lo necesitas?
            </h2>
            <p className="mt-1 text-sm text-noche/60">
              Elige una ocasión y el clima al que sales.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-noche/80">
              Ocasión <span className="text-rosa-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOccasion(o)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    occasion === o
                      ? "border-rosa-500 bg-rosa-500 text-white"
                      : "border-rosa-200 bg-white text-noche/70 hover:border-rosa-400 hover:bg-rosa-50"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={
                OCCASIONS.includes(occasion) ? "" : occasion
              }
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="o escribe tu propia ocasión…"
              className="mt-3 w-full rounded-full border border-rosa-200 bg-white px-5 py-2.5 text-sm outline-none transition placeholder:text-noche/30 focus:border-rosa-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-noche/80">
              Clima <span className="text-noche/40">(opcional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CLIMATES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() =>
                    setClimate(climate === c.value ? undefined : c.value)
                  }
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    climate === c.value
                      ? "border-rosa-500 bg-rosa-500 text-white"
                      : "border-rosa-200 bg-white text-noche/70 hover:border-rosa-400 hover:bg-rosa-50"
                  }`}
                >
                  <span>{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paso 4 */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl text-noche">
              ¿Algo más que debamos saber?
            </h2>
            <p className="mt-1 text-sm text-noche/60">
              Detalles extra: si tienes una pieza que quieres incluir, un
              referente, una vibe específica… o déjalo en blanco.
            </p>
          </div>

          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Ej: quiero algo cómodo pero que se vea pulido. Me encanta el estilo escandinavo."
            rows={5}
            className="w-full rounded-2xl border border-rosa-200 bg-white px-5 py-3 text-sm outline-none transition placeholder:text-noche/30 focus:border-rosa-400"
          />

          {/* Resumen del quiz */}
          <div className="rounded-2xl border border-rosa-100 bg-rosa-50/40 p-5 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-rosa-500">
              Tu pedido
            </p>
            <ul className="space-y-1.5 text-noche/80">
              <li>
                <strong>Para:</strong>{" "}
                {GENDERS.find((g) => g.value === gender)?.label ?? "—"}
                {heightCm && ` (${heightCm} cm)`}
                {bodyType !== "no_especifica" &&
                  `, ${
                    BODY_TYPES.find((b) => b.value === bodyType)?.label
                  }`}
              </li>
              {styles.length > 0 && (
                <li>
                  <strong>Estilo:</strong> {styles.join(", ")}
                </li>
              )}
              {favoriteColors.length > 0 && (
                <li>
                  <strong>Colores:</strong> {favoriteColors.join(", ")}
                </li>
              )}
              <li>
                <strong>Ocasión:</strong> {occasion || "—"}
                {climate &&
                  `, clima ${
                    CLIMATES.find((c) => c.value === climate)?.label.toLowerCase()
                  }`}
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Navegación */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1 || loading}
          className="rounded-full border border-rosa-200 bg-white px-5 py-2.5 text-sm font-medium text-noche/70 transition hover:bg-rosa-50 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← Atrás
        </button>

        {step < totalSteps ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="rounded-full bg-noche px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={loading || !gender || !occasion.trim()}
            className="rounded-full bg-rosa-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Diseñando tu outfit…" : "Diseñar mi outfit ✨"}
          </button>
        )}
      </div>
    </div>
  );
}
