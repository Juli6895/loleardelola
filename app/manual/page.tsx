"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchConDispositivo } from "@/lib/device-id";
import SubNavCuenta from "@/components/SubNavCuenta";
import type {
  ColorPintado,
  FavoritaManual,
  ManualListo,
  OutfitListo,
  PrendaClaveLista,
} from "@/lib/manual-estilo";
import { svgSiluetas } from "@/lib/manual-figuras";
import { CABELLO_HEX, PIEL_HEX } from "@/lib/manual-colores";
import type { ProductoTienda } from "@/lib/catalogo-tiendas";
import { SILUETAS } from "@/lib/image-consulting/morfologia";
import { PERSONALIDADES } from "@/lib/image-consulting/personalidad";
import { CONTRASTES } from "@/lib/image-consulting/colorimetria";
import { PROYECCIONES } from "@/lib/image-consulting/proyeccion";
import type { PerfilSilueta } from "@/types";
import { construirInformeHtml } from "@/lib/informe-html";
import { colorAHex } from "@/lib/color-swatch";
import { comoSeLlama, useUsuario } from "@/lib/use-usuario";
import { useAnotarUnaVez, anotarClicComercio } from "@/lib/use-evento";

// El manual de estilo: lo que da la membresía.
//
// El permiso se revisa en el servidor (ver app/api/manual/route.ts).
// Esta pantalla solo decide qué mostrar; esconder un botón no impide
// que alguien llame la API a mano.
//
// Las fotos YA vienen adjuntas en lo que guarda el servidor (ver
// adjuntarFotos en lib/manual-estilo.ts): esta página no le pregunta
// nada al catálogo, solo pinta lo que ya se decidió al generar el
// manual. Eso también significa que solo se muestra lo que de verdad
// existe en alguna de las tiendas — lo que no se encontró ni siquiera
// llega hasta acá.

type Estado = {
  conMembresia: boolean;
  falta: string[];
  manual: ManualListo | null;
  generadoEl: string | null;
  desactualizado: boolean;
  // El manual guardado es de antes del formato de asesoría.
  formatoViejo?: boolean;
};

const pesos = (n: number) => "$" + n.toLocaleString("es-CO");

// Envoltorio: la pestaña de navegación tiene que verse en TODOS los
// estados de abajo (sin membresía, perfil incompleto, sin generar,
// listo) — y esos estados son "return" tempranos, no un solo árbol de
// JSX. Más simple ponerla una vez acá afuera que repetirla cinco veces.
export default function ManualPage() {
  return (
    <div>
      <SubNavCuenta />
      <Contenido />
    </div>
  );
}

function Contenido() {
  useAnotarUnaVez("manual_visto");
  const [estado, setEstado] = useState<Estado | null>(null);
  const [perfil, setPerfil] = useState<PerfilSilueta | null>(null);
  const [generando, setGenerando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const { usuario } = useUsuario();
  const nombre = comoSeLlama(usuario);

  async function cargar() {
    const [res, resPerfil] = await Promise.all([
      fetchConDispositivo("/api/manual"),
      fetchConDispositivo("/api/perfil"),
    ]);
    setEstado(await res.json());
    const jp = await resPerfil.json().catch(() => null);
    setPerfil(jp?.perfil ?? null);
  }

  useEffect(() => {
    cargar().catch(() => setEstado(null));
  }, []);

  async function generar() {
    setGenerando(true);
    try {
      const res = await fetchConDispositivo("/api/manual", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No pudimos armar tu manual");
      await cargar();
      toast.success("¡Tu manual está listo!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerando(false);
    }
  }

  function descargarHtml() {
    if (!estado?.manual) return;
    setDescargando(true);
    try {
      const html = construirInformeHtml({
        nombre: nombre || null,
        manual: estado.manual,
        perfilResumen: armarResumenPerfil(perfil),
        generadoEl: estado.generadoEl,
      });
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "manual-de-estilo-loleardlola.html";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDescargando(false);
    }
  }

  if (!estado) {
    return <div className="mx-auto mt-20 h-8 w-48 animate-pulse-rosa rounded-full bg-rosa-100" />;
  }

  if (!estado.conMembresia) {
    return (
      <Tarjeta titulo="Tu manual de estilo">
        <p className="text-sm text-noche/70">
          Es lo que da la membresía: tus cuatro pilares cruzados en un
          documento — tu figura, tu color, tu sello y lo que quieres
          proyectar, con tres outfits armados y fotos reales de tiendas.
        </p>
        <Link
          href="/membresia"
          className="mt-6 inline-block rounded-full bg-noche px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500"
        >
          Ver la membresía
        </Link>
      </Tarjeta>
    );
  }

  if (estado.falta.length > 0) {
    return (
      <Tarjeta titulo="Casi listo">
        <p className="text-sm text-noche/70">
          Para armar tu manual nos falta {estado.falta.join(", ")}.
        </p>
        <Link
          href="/mi-perfil"
          className="mt-6 inline-block rounded-full bg-noche px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500"
        >
          Completar mi perfil
        </Link>
      </Tarjeta>
    );
  }

  if (!estado.manual) {
    return (
      <Tarjeta titulo="Tu manual de estilo">
        <p className="text-sm text-noche/70">
          {estado.desactualizado
            ? "Cambiaste algo de tu perfil, así que tu manual quedó desactualizado. Vuelve a armarlo con tus datos nuevos."
            : "Ya tenemos todo lo que necesitamos. Armarlo toma unos segundos."}
        </p>
        <button
          onClick={generar}
          disabled={generando}
          className="mt-6 rounded-full bg-noche px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500 disabled:opacity-50"
        >
          {generando ? "Armando tu manual..." : estado.desactualizado ? "Actualizar mi manual" : "Armar mi manual"}
        </button>
      </Tarjeta>
    );
  }

  const manual = estado.manual;
  const textos = secciones(manual.texto);
  const basicos = manual.basicos ?? manual.prendasClave ?? [];
  const personalidad = perfil?.personalidad ? PERSONALIDADES[perfil.personalidad] : null;
  const silueta = perfil?.silueta ? SILUETAS[perfil.silueta] : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <Portada
        nombre={nombre}
        generadoEl={estado.generadoEl}
        partida={textos["Tu punto de partida"]}
        fotos={(manual.estilo ?? []).map((p) => p.fotos[0]).filter(Boolean)}
        onDescargar={descargarHtml}
        descargando={descargando}
      />

      {estado.desactualizado && (
        <div className="rounded-2xl border border-rosa-300 bg-rosa-50/70 p-5 text-center">
          <p className="text-sm text-noche/70">
            {estado.formatoViejo
              ? "Tu manual tiene una versión nueva, armada como una asesoría completa: tu morfología, tu colorimetría, tu estilo, tus prendas favoritas y tu fondo de armario. Actualizarlo no gasta de tus manuales del mes."
              : "Cambiaste algo de tu perfil desde que armamos este manual."}
          </p>
          <button
            onClick={generar}
            disabled={generando}
            className="mt-3 rounded-full bg-noche px-5 py-2 text-sm font-medium text-white transition hover:bg-rosa-500 disabled:opacity-50"
          >
            {generando ? "Armando tu manual..." : "Actualizar mi manual"}
          </button>
        </div>
      )}

      <LineaDeTiempo />

      {/* Paso 1: morfología, colorimetría y estilo */}
      <Lamina id="paso-1" paso={1} titulo="Morfología">
        {silueta && (
          <p className="-mt-2 mb-4 text-sm text-noche/60">
            Tu silueta: <strong className="font-semibold text-noche">{silueta.label}</strong>
          </p>
        )}
        <div
          className="mx-auto w-full max-w-2xl"
          dangerouslySetInnerHTML={{ __html: svgSiluetas(perfil?.silueta ?? null, "manual") }}
        />
        {textos["Cómo te viste tu figura"] && (
          <div className="mt-6">
            <Markdown texto={textos["Cómo te viste tu figura"]} />
          </div>
        )}
        {silueta && (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ListaCorta titulo="Te favorece" items={silueta.prendasFavorecen} />
            <ListaCorta titulo="Te suma menos" items={silueta.prendasEvitar} />
          </div>
        )}
      </Lamina>

      <Lamina titulo="Colorimetría">
        <Colorimetria
          contraste={perfil?.contraste ? CONTRASTES[perfil.contraste].label : null}
          tonoPiel={perfil?.tono_piel ?? null}
          colorCabello={perfil?.color_cabello ?? null}
          paleta={manual.paleta ?? []}
          evitar={manual.evitar ?? []}
        />
        {textos["Tus colores"] && (
          <div className="mt-6">
            <Markdown texto={textos["Tus colores"]} />
          </div>
        )}
      </Lamina>

      <Lamina titulo={personalidad ? `Estilo ${personalidad.label}` : "Tu estilo"}>
        {manual.estilo && manual.estilo.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FotosDePrenda fotos={manual.estilo.map((p) => p.fotos[0])} soloFoto />
          </div>
        )}
        {textos["Tu sello"] && (
          <div className="mt-6">
            <Markdown texto={textos["Tu sello"]} />
          </div>
        )}
        {textos["Cuando chocan"] && (
          <div className="mt-6 rounded-xl bg-rosa-50/70 p-5">
            <h3 className="font-display text-xl text-noche">Cuando tus pilares chocan</h3>
            <div className="mt-2">
              <Markdown texto={textos["Cuando chocan"]} />
            </div>
          </div>
        )}
        {/* Manual viejo sin secciones reconocibles: se muestra completo. */}
        {Object.keys(textos).length === 0 && <Markdown texto={manual.texto} />}
      </Lamina>

      {/* Paso 2 */}
      <SeccionOutfits outfits={manual.outfits} />

      {/* Paso 3 */}
      <SeccionFavoritas favoritas={manual.favoritas} viejo={!manual.version} />

      {/* Paso 4 */}
      <SeccionFondoDeArmario basicos={basicos} />

      <div className="text-center">
        <button
          onClick={generar}
          disabled={generando}
          className="text-xs text-noche/40 underline transition hover:text-rosa-500 disabled:opacity-50"
        >
          {generando ? "Armando..." : "Volver a armarlo"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Las láminas de la asesoría
// ---------------------------------------------------------------------

const PASOS = [
  "Morfología, estilo y colorimetría",
  "Outfits para momentos específicos",
  "Prendas favoritas (cómo combinar)",
  "Básicos de armario",
];

/** Parte el texto del manual por sus títulos (## ...). */
function secciones(texto: string): Record<string, string> {
  const salida: Record<string, string> = {};
  let actual: string | null = null;
  for (const linea of texto.split("\n")) {
    const titulo = linea.match(/^##\s+(.+?)\s*$/);
    if (titulo) {
      actual = titulo[1];
      salida[actual] = "";
    } else if (actual) {
      salida[actual] += linea + "\n";
    }
  }
  for (const k of Object.keys(salida)) salida[k] = salida[k].trim();
  return salida;
}

function Portada({
  nombre,
  generadoEl,
  partida,
  fotos,
  onDescargar,
  descargando,
}: {
  nombre: string;
  generadoEl: string | null;
  partida?: string;
  fotos: ProductoTienda[];
  onDescargar: () => void;
  descargando: boolean;
}) {
  return (
    <header className="grid grid-cols-1 overflow-hidden rounded-2xl border border-rosa-100 bg-white shadow-sm sm:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col justify-center p-7 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-rosa-500">Tu manual de estilo</p>
        <h1 className="mt-2 font-display text-4xl text-noche sm:text-5xl" style={{ textWrap: "balance" }}>
          Asesoría {nombre || "de estilo"}
        </h1>
        <p className="mt-3 text-noche/60">¡Te enseñaré a conocerte y verte mejor de lo que ya eres!</p>
        {partida && <p className="mt-5 text-sm leading-relaxed text-noche/75">{negritas(partida)}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={onDescargar}
            disabled={descargando}
            className="inline-flex items-center gap-2 rounded-full border border-rosa-300 px-5 py-2 text-sm font-medium text-noche transition hover:bg-rosa-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {descargando ? "Preparando..." : "Descargar"}
          </button>
          {generadoEl && (
            <span className="text-xs text-noche/40">
              Armado el {new Date(generadoEl).toLocaleDateString("es-CO")}
            </span>
          )}
        </div>
      </div>
      {fotos.length > 0 ? (
        <div className="grid grid-cols-2 gap-1 bg-rosa-50">
          {fotos.slice(0, 4).map((f) =>
            f.imagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.url} src={f.imagen} alt="" className="aspect-[3/4] h-full w-full object-cover" />
            ) : null
          )}
        </div>
      ) : (
        <div className="hidden bg-gradient-to-br from-rosa-100 to-rosa-300 sm:block" />
      )}
    </header>
  );
}

/** "¿Qué haremos?": los cuatro pasos de la asesoría, en orden. */
function LineaDeTiempo() {
  return (
    <section className="rounded-2xl border border-rosa-100 bg-white p-7 shadow-sm sm:p-10">
      <h2 className="font-display text-3xl text-noche">¿Qué haremos?</h2>
      <p className="mt-1 text-sm text-noche/60">Así va tu asesoría, paso a paso.</p>
      <ol className="relative mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4 sm:gap-4">
        <span className="absolute left-[7px] top-2 h-[calc(100%-16px)] w-px bg-rosa-200 sm:left-0 sm:right-0 sm:top-[7px] sm:h-px sm:w-full" aria-hidden />
        {PASOS.map((paso, i) => (
          <li key={paso} className="relative flex gap-3 sm:block">
            <span className="relative mt-0.5 block h-[15px] w-[15px] shrink-0 rounded-full border-2 border-white bg-rosa-500 ring-1 ring-rosa-300" />
            <a href={`#paso-${i + 1}`} className="group sm:mt-3 sm:block">
              <span className="block text-sm font-semibold text-rosa-600">{i + 1}.</span>
              <span className="block text-sm text-noche/75 group-hover:text-noche">{paso}</span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Lamina({
  id,
  paso,
  titulo,
  children,
}: {
  id?: string;
  paso?: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl border border-rosa-100 bg-white p-7 shadow-sm sm:p-10">
      {paso && (
        <p className="text-xs font-semibold uppercase tracking-widest text-rosa-500">
          Paso {paso} · {PASOS[paso - 1]}
        </p>
      )}
      <h2 className="mt-1 font-display text-3xl text-noche sm:text-4xl">{titulo}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ListaCorta({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-noche/50">{titulo}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((it) => (
          <li key={it} className="flex gap-2 text-sm text-noche/75">
            <span className="text-rosa-400">·</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Colorimetria({
  contraste,
  tonoPiel,
  colorCabello,
  paleta,
  evitar,
}: {
  contraste: string | null;
  tonoPiel: string | null;
  colorCabello: string | null;
  paleta: ColorPintado[];
  evitar: ColorPintado[];
}) {
  const tuyos = [
    tonoPiel && PIEL_HEX[tonoPiel] ? { nombre: `Piel ${tonoPiel}`, hex: PIEL_HEX[tonoPiel] } : null,
    colorCabello && CABELLO_HEX[colorCabello] ? { nombre: `Cabello ${colorCabello}`, hex: CABELLO_HEX[colorCabello] } : null,
  ].filter((c): c is ColorPintado => c !== null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-6">
        {contraste && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-noche/50">Tu color</p>
            <p className="mt-1 font-display text-2xl text-noche">{contraste}</p>
          </div>
        )}
        {tuyos.length > 0 && (
          <div className="flex gap-3">
            {tuyos.map((c) => (
              <div key={c.nombre} className="text-center">
                <span className="block h-12 w-16 rounded-lg border border-noche/10" style={{ backgroundColor: c.hex }} />
                <span className="mt-1 block text-[11px] text-noche/50">{c.nombre}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {paleta.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-noche/50">Tu paleta</p>
          <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {paleta.map((c) => (
              <div key={c.nombre + c.hex}>
                <span
                  className="block aspect-square w-full rounded-md border border-noche/10"
                  style={{ backgroundColor: c.hex }}
                  title={c.nombre}
                />
                <span className="mt-1 block truncate text-[10px] text-noche/50">{c.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {evitar.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-noche/50">Lejos de tu cara</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {evitar.map((c) => (
              <span key={c.nombre + c.hex} className="flex items-center gap-1.5 text-xs text-noche/55">
                <span className="h-5 w-5 rounded border border-noche/10 opacity-70" style={{ backgroundColor: c.hex }} />
                {c.nombre}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Un resumen legible del perfil, para el encabezado del HTML descargable. */
function armarResumenPerfil(perfil: PerfilSilueta | null) {
  if (!perfil) return null;
  return {
    silueta: perfil.silueta ? SILUETAS[perfil.silueta].label : null,
    contraste: perfil.contraste ? CONTRASTES[perfil.contraste].label : null,
    personalidad: perfil.personalidad ? PERSONALIDADES[perfil.personalidad].label : null,
    proyeccion: perfil.proyeccion ? PROYECCIONES[perfil.proyeccion].label : null,
    medidas:
      perfil.bust_cm && perfil.waist_cm && perfil.hip_cm
        ? `${perfil.bust_cm} · ${perfil.waist_cm} · ${perfil.hip_cm} cm`
        : null,
    silueta_clave: perfil.silueta ?? null,
    tono_piel: perfil.tono_piel ?? null,
    color_cabello: perfil.color_cabello ?? null,
  };
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <div className="rounded-2xl border border-rosa-100 bg-white p-8 shadow-sm">
        <h1 className="font-display text-2xl text-noche">{titulo}</h1>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function describir(p: { tipo: string; color: string; rasgos: string[] }): string {
  return [p.tipo, p.color, ...p.rasgos].filter(Boolean).join(" · ");
}

/** La paleta de un outfit, en puntos de color, sin repetir. */
function PaletaDeColores({ prendas }: { prendas: Array<{ color: string }> }) {
  const vistos = new Set<string>();
  const colores = prendas
    .map((p) => p.color)
    .filter((c) => {
      const k = c.toLowerCase();
      if (!c || vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
  if (colores.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {colores.map((c) => (
        <span key={c} className="flex items-center gap-1.5">
          <span
            className="h-4 w-4 rounded-full border border-noche/10"
            style={{ backgroundColor: colorAHex(c) }}
            aria-hidden
          />
          <span className="text-xs text-noche/50">{c}</span>
        </span>
      ))}
    </div>
  );
}

/** Paso 2: outfits para momentos específicos, con prendas confirmadas. */
function SeccionOutfits({ outfits }: { outfits: OutfitListo[] }) {
  if (outfits.length === 0) return null;

  return (
    <Lamina id="paso-2" paso={2} titulo="Outfits para momentos específicos">
      <p className="-mt-2 text-sm text-noche/60">
        Las fotos son de las tiendas de nuestra lista: el corte y el color son la guía; la prenda
        exacta puede variar.
      </p>
      <div className="mt-6 space-y-8">
        {outfits.map((o, i) => (
          <div key={i}>
            <p className="text-xs font-semibold uppercase tracking-wide text-rosa-500">{o.titulo}</p>
            {o.descripcion && <p className="mt-1 text-sm text-noche/70">{o.descripcion}</p>}
            <PaletaDeColores prendas={o.prendas} />
            {/* Una foto por prenda: con dos, el outfit se leía como dos
                pantalones y dos aretes, no como un look. */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FotosDePrenda fotos={o.prendas.map((p) => p.fotos[0])} />
            </div>
          </div>
        ))}
      </div>
    </Lamina>
  );
}

/** Paso 3: las prendas que YA tiene en su clóset, y cómo combinarlas. */
function SeccionFavoritas({ favoritas, viejo }: { favoritas?: FavoritaManual[]; viejo: boolean }) {
  // En un manual de antes de la asesoría esta sección no existía.
  if (viejo) return null;

  return (
    <Lamina id="paso-3" paso={3} titulo="Prendas favoritas">
      {favoritas && favoritas.length > 0 ? (
        <>
          <p className="-mt-2 text-sm text-noche/60">Las que ya tienes en tu clóset, y cómo sacarles partido.</p>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {favoritas.map((f) => (
              <div key={f.id} className="flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.foto}
                  alt={f.label}
                  className="h-28 w-24 shrink-0 rounded-xl border border-rosa-100 bg-rosa-50 object-cover"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-noche">{f.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-noche/70">{f.comoCombinar}</p>
                  {f.conQue.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {f.conQue.map((c) => (
                        <span key={c} className="rounded-full bg-rosa-50 px-2.5 py-1 text-[11px] font-medium text-rosa-600">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-noche/60">
          Sube a{" "}
          <Link href="/mi-closet" className="font-medium text-rosa-600 underline">
            Mi clóset
          </Link>{" "}
          las prendas que más usas y vuelve a armar tu manual: te decimos cómo combinar cada una.
        </p>
      )}
    </Lamina>
  );
}

/** Paso 4: el fondo de armario, con los básicos adaptados a ella. */
function SeccionFondoDeArmario({ basicos }: { basicos: PrendaClaveLista[] }) {
  if (basicos.length === 0) return null;

  return (
    <Lamina id="paso-4" paso={4} titulo="Fondo de armario">
      <p className="-mt-2 text-sm text-noche/60">
        Los básicos que sostienen todo lo demás, en el corte y el color que te funcionan. En orden de
        prioridad.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-[1fr_1fr]">
        <div className="grid grid-cols-3 gap-2 self-start">
          <FotosDePrenda fotos={basicos.map((p) => p.fotos[0])} soloFoto />
        </div>
        <ol className="divide-y divide-rosa-100">
          {basicos.map((p, i) => (
            <li key={i} className="py-3 first:pt-0">
              <p className="flex items-center gap-2 text-sm font-medium text-noche">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-noche/10"
                  style={{ backgroundColor: colorAHex(p.color) }}
                  aria-hidden
                />
                {describir(p)}
              </p>
              {p.porque && <p className="mt-0.5 text-sm text-noche/60">{p.porque}</p>}
            </li>
          ))}
        </ol>
      </div>
    </Lamina>
  );
}

function FotosDePrenda({
  fotos,
  soloFoto = false,
}: {
  fotos: ProductoTienda[];
  soloFoto?: boolean;
}) {
  return (
    <>
      {fotos.map((p) => (
        <a
          key={p.url}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => anotarClicComercio({ tienda: p.tienda, dominio: p.dominio, origen: "manual" })}
          className="group flex flex-col overflow-hidden rounded-xl border border-rosa-100 transition hover:border-rosa-300 hover:shadow-md"
        >
          <div className="aspect-[3/4] overflow-hidden bg-rosa-50">
            {p.imagen && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.imagen}
                alt={p.titulo}
                loading="lazy"
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            )}
          </div>
          {!soloFoto && (
            <div className="flex flex-1 flex-col gap-0.5 p-2">
              <p className="line-clamp-2 text-[11px] leading-snug text-noche/80">
                {p.titulo}
              </p>
              {p.precioCop && (
                <p className="mt-auto text-xs font-medium text-noche">
                  {pesos(p.precioCop)}
                </p>
              )}
              <p className="text-[10px] text-noche/40">{p.tienda}</p>
            </div>
          )}
        </a>
      ))}
    </>
  );
}

/**
 * Render mínimo de markdown: solo lo que el manual usa (## títulos,
 * **negritas**, listas y párrafos). Se hace a mano en vez de traer una
 * librería entera — son cuatro casos y el texto lo generamos nosotros,
 * así que no hay sorpresas de formato.
 */
function Markdown({ texto }: { texto: string }) {
  const bloques = texto.split(/\n{2,}/);
  return (
    <div className="space-y-4">
      {bloques.map((b, i) => {
        const t = b.trim();
        if (t.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="pt-3 font-display text-2xl text-noche first:pt-0"
            >
              {t.slice(3)}
            </h2>
          );
        }
        if (t.startsWith("# ")) {
          return (
            <h2 key={i} className="font-display text-2xl text-noche">
              {t.slice(2)}
            </h2>
          );
        }
        if (/^[-*]\s/m.test(t)) {
          const items = t.split("\n").filter((l) => /^[-*]\s/.test(l.trim()));
          return (
            <ul key={i} className="space-y-2">
              {items.map((l, j) => (
                <li key={j} className="flex gap-2 text-sm leading-relaxed text-noche/75">
                  <span className="text-rosa-400">·</span>
                  <span>{negritas(l.trim().replace(/^[-*]\s/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-noche/75">
            {negritas(t)}
          </p>
        );
      })}
    </div>
  );
}

function negritas(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith("**") && parte.endsWith("**") ? (
      <strong key={i} className="font-semibold text-noche">
        {parte.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{parte}</span>
    )
  );
}
