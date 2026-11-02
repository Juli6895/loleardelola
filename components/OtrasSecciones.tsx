"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HREF_MIS_MARCAS, SECCIONES } from "@/lib/secciones";
import { abrirFiltros } from "@/lib/filtros-promos";
import { anotar } from "@/lib/use-evento";

// Donde no va: el inicio ya muestra todas las opciones, y en entrar y
// el tablero de administración estorba.
const SIN_ESTO = ["/", "/entrar", "/admin"];

/**
 * Al final de cada página, las demás secciones, para pasar a otra sin
 * volver arriba al menú. Va en app/layout.tsx; la lista sale de
 * lib/secciones.ts.
 */
export default function OtrasSecciones() {
  const pathname = usePathname();
  if (SIN_ESTO.some((r) => (r === "/" ? pathname === "/" : pathname.startsWith(r)))) return null;
  const otras = SECCIONES.filter((s) => s.href !== pathname);

  return (
    <nav aria-labelledby="otras-secciones" className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="border-t border-rosa-100 pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="otras-secciones" className="font-display text-2xl text-noche">
            ¿A dónde quieres ir?
          </h2>
          <Link href="/" className="text-sm font-medium text-rosa-600 underline-offset-2 hover:underline">
            Ir al inicio
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {otras.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              onClick={(e) => {
                anotar("otras_secciones_clic", { desde: pathname, destino: s.nombre });
                // En Promociones, "Mis marcas favoritas" abre el panel ahí mismo.
                if (s.href === HREF_MIS_MARCAS && pathname === "/promociones") {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  abrirFiltros();
                }
              }}
              className="group rounded-2xl border border-rosa-100 bg-white px-4 py-3 transition hover:border-rosa-300 hover:shadow-sm"
            >
              <span className="block text-sm font-semibold text-noche group-hover:text-rosa-600">{s.nombre}</span>
              <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-noche/55">{s.texto}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
