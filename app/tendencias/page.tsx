import type { Metadata } from "next";
import Link from "next/link";
import AnotarVista from "@/components/AnotarVista";
import EncabezadoSeccion from "@/components/EncabezadoSeccion";
import { ACTUALIZADO, TENDENCIAS, type AnoDeTendencias } from "@/lib/tendencias";

// Tendencias 2026 y 2027: colores, prendas y estéticas de la temporada.
// Los datos viven en lib/tendencias.ts, que también usa el manual de estilo.

export const metadata: Metadata = {
  title: "Tendencias 2026 y 2027 — LoleardLola",
  description: "Los colores, las prendas y las estéticas que marcan la moda en 2026 y 2027, de Inexmoda, Pantone y las pasarelas.",
};

function Ano({ t }: { t: AnoDeTendencias }) {
  return (
    <section id={`tendencias-${t.ano}`} className="scroll-mt-24 space-y-6 rounded-3xl border border-rosa-100 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h2 className="font-display text-3xl text-noche">
          Tendencias <span className="italic text-rosa-500">{t.ano}</span>
        </h2>
        <p className="mt-2 max-w-2xl text-noche/70">{t.resumen}</p>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-noche/50">Colores</h3>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {t.colores.map((c) => (
            <li key={c.nombre} className="flex items-start gap-3">
              <span className="mt-0.5 h-9 w-9 shrink-0 rounded-full border border-noche/10" style={{ backgroundColor: c.hex }} aria-hidden />
              <span>
                <span className="block text-sm font-medium text-noche">{c.nombre}</span>
                {c.nota && <span className="block text-[11px] leading-snug text-noche/50">{c.nota}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-noche/50">Prendas que vas a ver</h3>
        <ul className="flex flex-wrap gap-2">
          {t.prendas.map((p) => (
            <li key={p} className="rounded-full border border-rosa-200 bg-rosa-50/60 px-3 py-1.5 text-sm text-noche/80">
              {p}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-noche/50">Estéticas de la temporada</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {t.esteticas.map((e) => (
            <article key={e.nombre} className="rounded-2xl border border-rosa-100 p-4">
              <p className="text-[11px] uppercase tracking-wide text-noche/40">{e.temporada}</p>
              <h4 className="mt-1 font-display text-xl text-noche">{e.nombre}</h4>
              <p className="mt-1 text-sm text-noche/70">{e.idea}</p>
              <p className="mt-2 text-sm text-noche">
                <span className="font-medium text-rosa-600">Cómo llevarla:</span> {e.comoLlevarla}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-noche/50">Fuentes</h3>
        <ul className="space-y-1 text-xs text-noche/55">
          {t.fuentes.map((f) => (
            <li key={f.url}>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-rosa-600 hover:underline">
                {f.nombre}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function TendenciasPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <AnotarVista nombre="tendencias_visto" />
      <EncabezadoSeccion titulo="Tendencias" destacado="2026 y 2027" frase="Los colores, las prendas y las estéticas que vienen, para que sepas qué está pasando en la moda." />

      <nav className="flex justify-center gap-2" aria-label="Años">
        {TENDENCIAS.map((t) => (
          <a
            key={t.ano}
            href={`#tendencias-${t.ano}`}
            className="rounded-full border border-noche/20 px-5 py-2 text-sm font-medium text-noche transition hover:border-noche hover:bg-noche hover:text-white"
          >
            {t.ano}
          </a>
        ))}
      </nav>

      {TENDENCIAS.map((t) => (
        <Ano key={t.ano} t={t} />
      ))}

      <div className="rounded-2xl bg-rosa-50/70 p-5 text-center text-sm text-noche/70">
        <p>
          Una tendencia te sirve si le va a tu figura, a tus colores y a lo que quieres proyectar. Tu{" "}
          <Link href="/manual" className="font-medium text-rosa-600 underline-offset-2 hover:underline">
            manual de estilo
          </Link>{" "}
          las tiene en cuenta y te dice cuáles son para ti.
        </p>
        <p className="mt-2 text-xs text-noche/45">Actualizado en {ACTUALIZADO}.</p>
      </div>
    </div>
  );
}
