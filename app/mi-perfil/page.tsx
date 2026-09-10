"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import toast from "react-hot-toast";
import SiluetaIcon from "@/components/SiluetaIcon";
import { SILUETAS } from "@/lib/image-consulting/morfologia";
import { PERSONALIDADES } from "@/lib/image-consulting/personalidad";
import type { PerfilSilueta } from "@/types";

// Página "Mi Perfil": la usuaria ingresa sus medidas (busto, cintura,
// cadera, estatura opcional) y recibe su silueta + asesoría del manual de
// imagen. Esta misma data es la base del futuro Avatar (Fase 3).
export default function MiPerfilPage() {
  const { data: session, status } = useSession();
  const [perfil, setPerfil] = useState<PerfilSilueta | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInicial, setLoadingInicial] = useState(true);

  const [bust, setBust] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [height, setHeight] = useState("");

  const [referencia, setReferencia] = useState("");
  const [analizandoPersonalidad, setAnalizandoPersonalidad] = useState(false);
  const [explicacionPersonalidad, setExplicacionPersonalidad] = useState<
    string | null
  >(null);

  useEffect(() => {
    // Sin sesión (o todavía resolviendo la sesión), no hay perfil que
    // cargar — dejamos de mostrar el loader para que se vea la puerta de
    // login en vez de quedarse cargando para siempre.
    if (status === "loading") return;
    if (status !== "authenticated") {
      setLoadingInicial(false);
      return;
    }
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((j) => {
        const p: PerfilSilueta | undefined = j.perfil;
        if (p) {
          setPerfil(p);
          if (p.bust_cm != null) setBust(String(p.bust_cm));
          if (p.waist_cm != null) setWaist(String(p.waist_cm));
          if (p.hip_cm != null) setHip(String(p.hip_cm));
          if (p.height_cm != null) setHeight(String(p.height_cm));
        }
      })
      .finally(() => setLoadingInicial(false));
  }, [status]);

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bustCm: bust,
          waistCm: waist,
          hipCm: hip,
          heightCm: height || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo guardar");
      setPerfil(json.perfil);
      toast.success("¡Perfil actualizado!");
    } catch (err: any) {
      toast.error(err.message ?? "Algo salió mal");
    } finally {
      setLoading(false);
    }
  }

  async function analizarPersonalidad(payload: { referencia?: string; imageBase64?: string }) {
    setAnalizandoPersonalidad(true);
    try {
      const res = await fetch("/api/perfil/personalidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo analizar");
      setPerfil((prev) => ({
        bust_cm: prev?.bust_cm ?? null,
        waist_cm: prev?.waist_cm ?? null,
        hip_cm: prev?.hip_cm ?? null,
        height_cm: prev?.height_cm ?? null,
        silueta: prev?.silueta ?? null,
        personalidad: json.resultado.personalidad,
        personalidad_secundaria: json.resultado.personalidadSecundaria,
        personalidad_fuente: json.fuente,
      }));
      setExplicacionPersonalidad(json.resultado.explicacion || null);
      if (!json.resultado.confiable) {
        toast(
          "No estamos 100% seguros con esto — igual te dejamos una sugerencia."
        );
      } else {
        toast.success("¡Personalidad de estilo identificada!");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Algo salió mal");
    } finally {
      setAnalizandoPersonalidad(false);
    }
  }

  async function analizarPorFoto(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("La imagen es muy grande (máx 8MB)");
      return;
    }
    const base64 = await fileToBase64(file);
    await analizarPersonalidad({ imageBase64: base64 });
  }

  // Pegar una foto copiada (Ctrl+V) directo en la zona de personalidad.
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (analizandoPersonalidad) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            analizarPorFoto(file);
          }
          break;
        }
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analizandoPersonalidad]);

  if (status === "loading" || loadingInicial) {
    return (
      <div className="mx-auto mt-20 h-8 w-40 animate-pulse-rosa rounded-full bg-rosa-100" />
    );
  }

  if (!session) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-3xl border border-rosa-100 bg-white p-10 text-center shadow-suave">
        <h1 className="font-display text-3xl text-noche">
          Entra con Pinterest
        </h1>
        <p className="mt-3 text-noche/60">
          Conecta tu cuenta para guardar tu perfil de silueta.
        </p>
        <button
          onClick={() => signIn("pinterest")}
          className="mt-6 rounded-full bg-noche px-6 py-3 text-sm font-medium text-white transition hover:bg-rosa-500"
        >
          Entrar con Pinterest
        </button>
      </div>
    );
  }

  const info = perfil?.silueta ? SILUETAS[perfil.silueta] : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="text-center">
        <h1 className="font-display text-4xl text-noche sm:text-5xl">
          Mi perfil de silueta
        </h1>
        <p className="mt-3 text-noche/60">
          Ingresa tus medidas y te decimos qué prendas te favorecen más —
          esto también va a ser la base de tu Avatar más adelante.
        </p>
      </header>

      <form
        onSubmit={guardarPerfil}
        className="rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="bust"
              className="text-sm font-medium text-noche/80"
            >
              Busto (cm)
            </label>
            <input
              id="bust"
              type="number"
              inputMode="decimal"
              required
              min={30}
              max={200}
              value={bust}
              onChange={(e) => setBust(e.target.value)}
              placeholder="92"
              className="mt-1.5 w-full rounded-full border border-rosa-200 bg-rosa-50/40 px-4 py-2.5 text-sm outline-none transition placeholder:text-noche/30 focus:border-rosa-400 focus:bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="waist"
              className="text-sm font-medium text-noche/80"
            >
              Cintura (cm)
            </label>
            <input
              id="waist"
              type="number"
              inputMode="decimal"
              required
              min={30}
              max={200}
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              placeholder="74"
              className="mt-1.5 w-full rounded-full border border-rosa-200 bg-rosa-50/40 px-4 py-2.5 text-sm outline-none transition placeholder:text-noche/30 focus:border-rosa-400 focus:bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="hip"
              className="text-sm font-medium text-noche/80"
            >
              Cadera (cm)
            </label>
            <input
              id="hip"
              type="number"
              inputMode="decimal"
              required
              min={30}
              max={200}
              value={hip}
              onChange={(e) => setHip(e.target.value)}
              placeholder="98"
              className="mt-1.5 w-full rounded-full border border-rosa-200 bg-rosa-50/40 px-4 py-2.5 text-sm outline-none transition placeholder:text-noche/30 focus:border-rosa-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="mt-4 max-w-[calc(33%-0.67rem)]">
          <label
            htmlFor="height"
            className="text-sm font-medium text-noche/80"
          >
            Estatura (cm) <span className="text-noche/40">(opcional)</span>
          </label>
          <input
            id="height"
            type="number"
            inputMode="decimal"
            min={100}
            max={230}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="165"
            className="mt-1.5 w-full rounded-full border border-rosa-200 bg-rosa-50/40 px-4 py-2.5 text-sm outline-none transition placeholder:text-noche/30 focus:border-rosa-400 focus:bg-white"
          />
        </div>

        <p className="mt-3 text-xs text-noche/40">
          Mide sobre tu ropa interior, en la parte más ancha del busto,
          la más angosta de la cintura, y la más ancha de la cadera.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 rounded-full bg-noche px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Calculando..." : "Calcular mi silueta"}
        </button>
      </form>

      {info && perfil?.silueta && (
        <div className="grid grid-cols-1 gap-6 rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm sm:grid-cols-[auto_1fr] sm:p-8">
          <SiluetaIcon
            silueta={perfil.silueta}
            className="h-32 w-20 text-rosa-400 sm:h-40 sm:w-24"
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-rosa-500">
              Tu silueta
            </p>
            <h2 className="mt-1 font-display text-2xl text-noche">
              {info.label}
            </h2>
            <p className="mt-2 text-sm text-noche/70">{info.descripcion}</p>
            <p className="mt-3 text-sm font-medium text-rosa-600">
              Objetivo: {info.objetivoVisual}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-noche/50">
                  Te favorece
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-noche/80">
                  {info.prendasFavorecen.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="text-rosa-400">·</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-noche/50">
                  Evita
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-noche/50">
                  {info.prendasEvitar.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="text-noche/30">·</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-display text-2xl text-noche">
          ¿Cuál es tu personalidad de estilo?
        </h2>
        <p className="mt-1 text-sm text-noche/60">
          Dinos con quién te identificas, o sube una foto tuya o de una
          referencia de estilo que te inspire — nosotros la analizamos.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (referencia.trim()) analizarPersonalidad({ referencia });
          }}
          className="mt-5 flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="text"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Ej: Zendaya, Blair Waldorf, Karol G..."
            disabled={analizandoPersonalidad}
            className="flex-1 rounded-full border border-rosa-200 bg-rosa-50/40 px-5 py-2.5 text-sm outline-none transition placeholder:text-noche/30 focus:border-rosa-400 focus:bg-white disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={analizandoPersonalidad || !referencia.trim()}
            className="rounded-full bg-noche px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {analizandoPersonalidad ? "Analizando..." : "Analizar"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-noche/30">
          <span className="h-px flex-1 bg-rosa-100" />
          <span>o</span>
          <span className="h-px flex-1 bg-rosa-100" />
        </div>

        <div
          tabIndex={0}
          onClick={(e) => e.currentTarget.focus()}
          className="flex cursor-text flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rosa-200 bg-rosa-50/50 px-4 py-6 text-center outline-none transition hover:border-rosa-400 hover:bg-rosa-50 focus:border-rosa-400 focus:bg-rosa-50 focus:ring-2 focus:ring-rosa-200"
        >
          <span className="text-sm font-medium text-noche">
            {analizandoPersonalidad
              ? "Analizando tu estilo..."
              : "Haz clic aquí y pega una foto con Ctrl+V"}
          </span>
          <span className="text-xs text-noche/50">
            o{" "}
            <label className="cursor-pointer font-medium text-rosa-600 underline-offset-2 hover:underline">
              sube un archivo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={analizandoPersonalidad}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) analizarPorFoto(f);
                  e.target.value = "";
                }}
              />
            </label>{" "}
            · tuya o de una referencia de estilo
          </span>
        </div>

        {perfil?.personalidad && (
          <div className="mt-6 rounded-2xl border border-rosa-100 bg-rosa-50/40 p-5">
            <p className="text-xs font-medium uppercase tracking-widest text-rosa-500">
              Tu personalidad de estilo
              {perfil.personalidad_fuente && (
                <span className="normal-case text-noche/40">
                  {" "}
                  · según {perfil.personalidad_fuente}
                </span>
              )}
            </p>
            <h3 className="mt-1 font-display text-xl text-noche">
              {PERSONALIDADES[perfil.personalidad].label}
              {perfil.personalidad_secundaria && (
                <span className="text-noche/50">
                  {" "}
                  + {PERSONALIDADES[perfil.personalidad_secundaria].label}
                </span>
              )}
            </h3>
            <p className="mt-2 text-sm text-noche/70">
              {explicacionPersonalidad ||
                PERSONALIDADES[perfil.personalidad].descripcion}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PERSONALIDADES[perfil.personalidad].palabrasClave.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-rosa-600"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
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
