"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import SiluetaIcon from "@/components/SiluetaIcon";
import CabeceraCuenta from "@/components/CabeceraCuenta";
import SubNavCuenta from "@/components/SubNavCuenta";
import { fetchConDispositivo } from "@/lib/device-id";
import { SILUETAS } from "@/lib/image-consulting/morfologia";
import { PERSONALIDADES } from "@/lib/image-consulting/personalidad";
import {
  CONTRASTES,
  ESTACIONES,
  SUBTONOS,
} from "@/lib/image-consulting/colorimetria";
import { colorAHex } from "@/lib/color-swatch";
import { PROYECCIONES } from "@/lib/image-consulting/proyeccion";
import type { PerfilSilueta } from "@/types";
import { useAnotarUnaVez } from "@/lib/use-evento";

const PERFIL_VACIO: PerfilSilueta = {
  bust_cm: null,
  waist_cm: null,
  hip_cm: null,
  height_cm: null,
  peso_kg: null,
  silueta: null,
  color_cabello: null,
  largo_cabello: null,
  subtono: null,
  tono_piel: null,
  contraste: null,
  estacion: null,
  personalidad: null,
  personalidad_secundaria: null,
  personalidad_fuente: null,
  proyeccion: null,
  rango_edad: null,
};

// Página "Mi Perfil": la usuaria ingresa sus medidas (busto, cintura,
// cadera, estatura opcional) y recibe su silueta + asesoría del manual de
// imagen. Esta misma data es la base del futuro Avatar (Fase 3).
export default function MiPerfilPage() {
  useAnotarUnaVez("perfil_visto");
  const [perfil, setPerfil] = useState<PerfilSilueta | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInicial, setLoadingInicial] = useState(true);

  const [bust, setBust] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [height, setHeight] = useState("");
  const [peso, setPeso] = useState("");
  const [colorCabello, setColorCabello] = useState("");
  const [largoCabello, setLargoCabello] = useState("");
  const [tonoPiel, setTonoPiel] = useState("");
  const [proyeccion, setProyeccion] = useState("");
  const [rangoEdad, setRangoEdad] = useState("");

  const [referencia, setReferencia] = useState("");
  const [analizandoPersonalidad, setAnalizandoPersonalidad] = useState(false);
  const [explicacionPersonalidad, setExplicacionPersonalidad] = useState<
    string | null
  >(null);

  useEffect(() => {
    fetchConDispositivo("/api/perfil")
      .then((r) => r.json())
      .then((j) => {
        const p: PerfilSilueta | undefined = j.perfil;
        if (p) {
          setPerfil(p);
          if (p.bust_cm != null) setBust(String(p.bust_cm));
          if (p.waist_cm != null) setWaist(String(p.waist_cm));
          if (p.hip_cm != null) setHip(String(p.hip_cm));
          if (p.height_cm != null) setHeight(String(p.height_cm));
          if (p.peso_kg != null) setPeso(String(p.peso_kg));
          if (p.color_cabello) setColorCabello(p.color_cabello);
          if (p.largo_cabello) setLargoCabello(p.largo_cabello);
          if (p.tono_piel) setTonoPiel(p.tono_piel);
          if (p.proyeccion) setProyeccion(p.proyeccion);
          if (p.rango_edad) setRangoEdad(p.rango_edad);
        }
      })
      .finally(() => setLoadingInicial(false));
  }, []);

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchConDispositivo("/api/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bustCm: bust,
          waistCm: waist,
          hipCm: hip,
          heightCm: height || null,
          pesoKg: peso || null,
          colorCabello: colorCabello || null,
          largoCabello: largoCabello || null,
          tonoPiel: tonoPiel || null,
          proyeccion: proyeccion || null,
          rangoEdad: rangoEdad || null,
        }),
      });
      // Si el servidor cae feo puede responder con el cuerpo vacío, y
      // ahí res.json() revienta con "Unexpected end of JSON input" — un
      // mensaje que no le sirve a nadie. Parseamos a mano.
      const texto = await res.text();
      let json: any = null;
      try {
        json = texto ? JSON.parse(texto) : null;
      } catch {
        json = null;
      }
      if (!res.ok || !json?.perfil) {
        throw new Error(json?.error ?? "No pudimos guardar tu perfil. Intenta de nuevo.");
      }
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
      const res = await fetchConDispositivo("/api/perfil/personalidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo analizar");
      // Spread en vez de reconstruir campo por campo: así agregar un dato
      // nuevo al perfil no rompe esto silenciosamente.
      setPerfil((prev) => ({
        ...(prev ?? PERFIL_VACIO),
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

  if (loadingInicial) {
    return (
      <div className="mx-auto mt-20 h-8 w-40 animate-pulse-rosa rounded-full bg-rosa-100" />
    );
  }

  const info = perfil?.silueta ? SILUETAS[perfil.silueta] : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <SubNavCuenta />
      <header className="text-center">
        <h1 className="font-display text-4xl text-noche sm:text-5xl">
          Mi perfil de silueta
        </h1>
        <p className="mt-3 text-noche/60">
          Ingresa tus medidas y te decimos qué prendas te favorecen más —
          esto también va a ser la base de tu Avatar más adelante.
        </p>
      </header>

      {/* Quién eres, tu nombre, y qué destraba la membresía. */}
      <CabeceraCuenta />

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

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
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
          <div>
            <label htmlFor="peso" className="text-sm font-medium text-noche/80">
              Peso (kg) <span className="text-noche/40">(opcional)</span>
            </label>
            <input
              id="peso"
              type="number"
              inputMode="decimal"
              min={30}
              max={250}
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="60"
              className="mt-1.5 w-full rounded-full border border-rosa-200 bg-rosa-50/40 px-4 py-2.5 text-sm outline-none transition placeholder:text-noche/30 focus:border-rosa-400 focus:bg-white"
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-noche/40">
          Mide sobre tu ropa interior, en la parte más ancha del busto,
          la más angosta de la cintura, y la más ancha de la cadera. El peso
          no cambia tu silueta (esa sale de las proporciones) — lo usamos
          para recomendarte tallas más adelante.
        </p>

        <div className="mt-6 border-t border-rosa-100 pt-5">
          <h2 className="font-display text-xl text-noche">Tu color</h2>
          <p className="mt-1 text-xs text-noche/50">
            Con esto te decimos cómo combinar los colores para que te
            favorezcan.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="colorCabello"
                className="text-sm font-medium text-noche/80"
              >
                Color de cabello
              </label>
              <select
                id="colorCabello"
                value={colorCabello}
                onChange={(e) => setColorCabello(e.target.value)}
                className="mt-1.5 w-full rounded-full border border-rosa-200 bg-rosa-50/40 px-4 py-2.5 text-sm outline-none transition focus:border-rosa-400 focus:bg-white"
              >
                <option value="">Sin responder</option>
                <option value="negro">Negro</option>
                <option value="castaño oscuro">Castaño oscuro</option>
                <option value="castaño claro">Castaño claro</option>
                <option value="rubio">Rubio</option>
                <option value="cobrizo">Cobrizo / rojizo</option>
                <option value="canoso">Canoso / gris</option>
                <option value="teñido">Teñido (color fantasía)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="largoCabello"
                className="text-sm font-medium text-noche/80"
              >
                Largo de cabello
              </label>
              <select
                id="largoCabello"
                value={largoCabello}
                onChange={(e) => setLargoCabello(e.target.value)}
                className="mt-1.5 w-full rounded-full border border-rosa-200 bg-rosa-50/40 px-4 py-2.5 text-sm outline-none transition focus:border-rosa-400 focus:bg-white"
              >
                <option value="">Sin responder</option>
                <option value="muy corto">Muy corto</option>
                <option value="corto">Corto (tipo bob)</option>
                <option value="media melena">Media melena</option>
                <option value="largo">Largo</option>
                <option value="muy largo">Muy largo</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="tonoPiel"
                className="text-sm font-medium text-noche/80"
              >
                Tono de piel
              </label>
              <select
                id="tonoPiel"
                value={tonoPiel}
                onChange={(e) => setTonoPiel(e.target.value)}
                className="mt-1.5 w-full rounded-full border border-rosa-200 bg-rosa-50/40 px-4 py-2.5 text-sm outline-none transition focus:border-rosa-400 focus:bg-white"
              >
                <option value="">Sin responder</option>
                <option value="blanca">Blanca</option>
                <option value="canela">Canela</option>
                <option value="morena">Morena</option>
                <option value="negra">Negra / oscura</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="rangoEdad"
                className="text-sm font-medium text-noche/80"
              >
                Rango de edad
              </label>
              <select
                id="rangoEdad"
                value={rangoEdad}
                onChange={(e) => setRangoEdad(e.target.value)}
                className="mt-1.5 w-full rounded-full border border-rosa-200 bg-rosa-50/40 px-4 py-2.5 text-sm outline-none transition focus:border-rosa-400 focus:bg-white"
              >
                <option value="">Sin responder</option>
                <option value="18-24">18 a 24 años</option>
                <option value="25-34">25 a 34 años</option>
                <option value="35-44">35 a 44 años</option>
                <option value="45-54">45 a 54 años</option>
                <option value="55-64">55 a 64 años</option>
                <option value="65+">65 años o más</option>
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-noche/40">
            Con tu tono de piel y tu color de cabello calculamos tu nivel de
            contraste, que es lo que define cómo te favorece combinar los
            colores entre sí. Pedimos tu rango de edad, no tu fecha de
            nacimiento, y solo para que el manual sugiera prendas acordes.
          </p>
        </div>

        <div className="mt-6 border-t border-rosa-100 pt-5">
          <h2 className="font-display text-xl text-noche">
            Qué quieres proyectar
          </h2>
          <p className="mt-1 text-xs text-noche/50">
            Lo demás describe cómo eres. Esto describe lo que buscas — y es
            lo que manda cuando tu figura y tu gusto piden cosas distintas.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.keys(PROYECCIONES) as Array<keyof typeof PROYECCIONES>).map(
              (k) => {
                const p = PROYECCIONES[k];
                const elegida = proyeccion === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setProyeccion(elegida ? "" : k)}
                    className={`rounded-xl border p-3 text-left transition ${
                      elegida
                        ? "border-rosa-400 bg-rosa-50"
                        : "border-rosa-100 hover:border-rosa-300"
                    }`}
                  >
                    <span className="block text-sm font-medium text-noche">
                      {p.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-noche/55">
                      &ldquo;{p.enSusPalabras}&rdquo;
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>

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
            // El ancho va atado al alto (el lienzo es 120x300), para que
            // la figura no quede flotando con aire a los lados.
            className="h-44 w-[70px] shrink-0 text-rosa-500 sm:h-56 sm:w-[90px]"
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

      {perfil?.contraste && (
        <div className="rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-medium uppercase tracking-widest text-rosa-500">
            Tu color
          </p>
          <h2 className="mt-1 font-display text-2xl text-noche">
            {CONTRASTES[perfil.contraste].label}
          </h2>
          <p className="mt-2 text-sm text-noche/70">
            {CONTRASTES[perfil.contraste].descripcion}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-noche/50">
                Cómo combinar
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-noche/70">
                {CONTRASTES[perfil.contraste].comoVestir.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span className="text-rosa-400">·</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-noche/50">
                Evita
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-noche/50">
                {CONTRASTES[perfil.contraste].evitar.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span className="text-noche/30">·</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Paleta por estación: necesita el subtono, que por ahora no se
          pregunta. Queda listo para cuando lo volvamos a pedir. */}
      {perfil?.estacion && (
        <div className="rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-medium uppercase tracking-widest text-rosa-500">
            Tu colorimetría
          </p>
          <h2 className="mt-1 font-display text-2xl text-noche">
            {ESTACIONES[perfil.estacion].label}
          </h2>
          <p className="mt-2 text-sm text-noche/70">
            {ESTACIONES[perfil.estacion].descripcion}
          </p>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-noche/50">
            Tu paleta
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {ESTACIONES[perfil.estacion].paletaRecomendada.map((c) => (
              <div key={c} className="flex w-16 flex-col items-center gap-1.5">
                <span
                  className="h-10 w-10 rounded-full border border-noche/10"
                  style={{ backgroundColor: colorAHex(c) }}
                  aria-hidden
                />
                <span className="text-center text-[10px] leading-tight text-noche/60">
                  {c}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-noche/40">
            Mejor evita: {ESTACIONES[perfil.estacion].coloresEvitar.join(", ")}.
            {" "}Te favorecen los metales en{" "}
            {SUBTONOS[ESTACIONES[perfil.estacion].subtono].metalesQueFavorecen.join(", ")}.
          </p>
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

        {/* Toda la caja es un <label>: en el celular tocar cualquier
            parte abre la cámara/galería. Antes solo el texto "sube un
            archivo" abría algo, y el resto de la caja solo pedía
            Ctrl+V — que no existe en el celular. */}
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rosa-200 bg-rosa-50/50 px-4 py-6 text-center outline-none transition hover:border-rosa-400 hover:bg-rosa-50 focus-within:border-rosa-400 focus-within:bg-rosa-50 focus-within:ring-2 focus-within:ring-rosa-200">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={analizandoPersonalidad}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) analizarPorFoto(f);
              e.target.value = "";
            }}
          />
          <span className="text-sm font-medium text-noche">
            {analizandoPersonalidad
              ? "Analizando tu estilo..."
              : "Toca aquí para subir una foto"}
          </span>
          <span className="text-xs text-noche/50">
            <span className="hidden sm:inline">También puedes pegarla con Ctrl+V · </span>
            tuya o de una referencia de estilo
          </span>
        </label>

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
