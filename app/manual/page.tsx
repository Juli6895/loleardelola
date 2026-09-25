"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchConDispositivo } from "@/lib/device-id";
import SubNavCuenta from "@/components/SubNavCuenta";
import type { ManualListo, OutfitListo, PrendaClaveLista } from "@/lib/manual-estilo";
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <header className="text-center">
        <h1 className="font-display text-4xl text-noche sm:text-5xl">
          Tu manual de estilo
        </h1>
        {estado.generadoEl && (
          <p className="mt-2 text-xs text-noche/40">
            Armado el {new Date(estado.generadoEl).toLocaleDateString("es-CO")}
          </p>
        )}
        <button
          onClick={descargarHtml}
          disabled={descargando}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-rosa-300 px-5 py-2 text-sm font-medium text-noche transition hover:bg-rosa-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {descargando ? "Preparando..." : "Descargar como página HTML"}
        </button>
        <p className="mt-1.5 text-xs text-noche/40">
          Se guarda en tu celular o computador — lo puedes abrir sin internet,
          imprimirlo o mandarlo por WhatsApp.
        </p>
      </header>

      <article className="rounded-2xl border border-rosa-100 bg-white p-7 shadow-sm sm:p-10">
        <Markdown texto={estado.manual.texto} />
      </article>

      <SeccionOutfits outfits={estado.manual.outfits} />
      <SeccionPrendasClave prendas={estado.manual.prendasClave} />

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

/**
 * La paleta de un outfit, en puntos de color. Antes los colores solo se
 * leían en el nombre de cada prenda ("blazer azul denim") y por eso no
 * se veían como paleta — esto los saca como una fila de circulitos, en
 * el mismo orden en que aparecen las prendas.
 */
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

/** "Tres outfits para ti" — cada uno ya trae solo prendas confirmadas. */
function SeccionOutfits({ outfits }: { outfits: OutfitListo[] }) {
  if (outfits.length === 0) return null;

  return (
    <div className="rounded-2xl border border-rosa-100 bg-white p-7 shadow-sm sm:p-10">
      <h2 className="font-display text-2xl text-noche">Tres outfits para ti</h2>
      <p className="mt-1 text-sm text-noche/60">
        Las fotos son de las tiendas de nuestra lista — el corte y el color son
        una guía; la prenda exacta puede variar.
      </p>

      <div className="mt-6 space-y-8">
        {outfits.map((o, i) => (
          <div key={i}>
            <p className="text-xs font-semibold uppercase tracking-wide text-rosa-500">
              {o.titulo}
            </p>
            {o.descripcion && (
              <p className="mt-1 text-sm text-noche/70">{o.descripcion}</p>
            )}
            <PaletaDeColores prendas={o.prendas} />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {o.prendas.map((p, j) => (
                <FotosDePrenda key={j} fotos={p.fotos.slice(0, 2)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Lo primero que compraría", con foto y el porqué de cada una. */
function SeccionPrendasClave({ prendas }: { prendas: PrendaClaveLista[] }) {
  if (prendas.length === 0) return null;

  return (
    <div className="rounded-2xl border border-rosa-100 bg-white p-7 shadow-sm sm:p-10">
      <h2 className="font-display text-2xl text-noche">Lo primero que compraría</h2>
      <p className="mt-1 text-sm text-noche/60">En orden de prioridad.</p>

      <div className="mt-6 space-y-5">
        {prendas.map((p, i) => (
          <div key={i} className="flex gap-4">
            <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rosa-100 text-xs font-semibold text-rosa-600">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium text-noche">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-noche/10"
                  style={{ backgroundColor: colorAHex(p.color) }}
                  aria-hidden
                />
                {describir(p)}
              </p>
              {p.porque && <p className="mt-0.5 text-sm text-noche/60">{p.porque}</p>}
              <div className="mt-3 grid grid-cols-4 gap-2">
                <FotosDePrenda fotos={p.fotos.slice(0, 4)} soloFoto />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
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
