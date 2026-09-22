"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchConDispositivo } from "@/lib/device-id";

// El manual de estilo: lo que da la membresía.
//
// El permiso se revisa en el servidor (ver app/api/manual/route.ts).
// Esta pantalla solo decide qué mostrar; esconder un botón no impide
// que alguien llame la API a mano.

type Estado = {
  conMembresia: boolean;
  falta: string[];
  manual: string | null;
  generadoEl: string | null;
  desactualizado: boolean;
};

export default function ManualPage() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [generando, setGenerando] = useState(false);

  async function cargar() {
    const res = await fetchConDispositivo("/api/manual");
    setEstado(await res.json());
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

  if (!estado) {
    return <div className="mx-auto mt-20 h-8 w-48 animate-pulse-rosa rounded-full bg-rosa-100" />;
  }

  if (!estado.conMembresia) {
    return (
      <Tarjeta titulo="Tu manual de estilo">
        <p className="text-sm text-noche/70">
          Es lo que da la membresía: tus cuatro pilares cruzados en un solo
          documento — tu figura, tu color, tu sello y lo que quieres
          proyectar, con tres outfits armados para ti.
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
      </header>

      <article className="rounded-2xl border border-rosa-100 bg-white p-7 shadow-sm sm:p-10">
        <Markdown texto={estado.manual} />
      </article>

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
