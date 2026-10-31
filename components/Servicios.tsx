import Link from "next/link";
import { SECCIONES } from "@/lib/secciones";

// =====================================================================
// Todas las opciones de LoleardLola, en la página de inicio
// =====================================================================
// El inicio es la primera hoja: desde aquí se ve todo lo que hay y se
// entra a cada parte. Sin dibujos, a pedido de Juliana: el nombre de
// cada página grande y en negrita (es el enlace), y debajo qué se hace
// ahí. La lista está en lib/secciones.ts.
// =====================================================================

export default function Servicios() {
  return (
    <section aria-labelledby="servicios-titulo">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-rosa-500">Lo que hacemos por ti</p>
        <h2 id="servicios-titulo" className="mt-2 font-display text-3xl text-noche sm:text-4xl">
          Todo LoleardLola, aquí
        </h2>
        <p className="mt-2 text-sm text-noche/60">Toca una opción para entrar.</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECCIONES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col rounded-3xl border border-rosa-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-rosa-300 hover:shadow-suave"
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-2xl font-bold text-noche transition group-hover:text-rosa-600 sm:text-3xl">
                {s.nombre}
              </span>
              {s.etiqueta && (
                <span className="rounded-full bg-noche px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  {s.etiqueta}
                </span>
              )}
            </span>
            <span className="mt-2 block flex-1 text-base leading-relaxed text-noche/65">{s.texto}</span>
            <span className="mt-4 inline-block text-sm font-medium text-rosa-600 group-hover:underline">
              Ir a {s.nombre} →
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-5 text-center text-sm text-noche/60">
        Crea tu cuenta gratis y haz tu primera búsqueda.{" "}
        <Link href="/membresia" className="font-medium text-rosa-600 underline-offset-2 hover:underline">
          Ver la membresía
        </Link>
      </p>
    </section>
  );
}
