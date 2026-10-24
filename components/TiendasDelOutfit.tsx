"use client";

import type { Outfit, TiendaInstagram } from "@/types";
import { useCatalogo } from "@/lib/use-catalogo";
import { categoriaDeTipo, consultaDesdeTermino } from "@/lib/termino-a-consulta";
import ProductosSugeridos from "@/components/ProductosSugeridos";
import TiendasInstagram from "@/components/TiendasInstagram";

/**
 * Las prendas de un outfit guardado, buscadas en las tiendas de la
 * lista: lo mismo que se ve al buscar una foto (prendas parecidas con
 * foto y precio, y las tiendas para mirar), sin volver a gastar una
 * búsqueda con IA — se arma con los términos que ya se guardaron.
 */
export default function TiendasDelOutfit({
  outfit,
  tiendas,
  onCerrar,
}: {
  outfit: Outfit;
  tiendas: TiendaInstagram[];
  onCerrar: () => void;
}) {
  const consultas = outfit.tags.slice(0, 6).map(consultaDesdeTermino);
  const { grupos, flexibles, cargando } = useCatalogo(consultas);
  const categorias = Array.from(new Set(consultas.map((c) => categoriaDeTipo(c.tipo))));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-noche/50 p-0 sm:items-center sm:p-4"
      onClick={onCerrar}
    >
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-rosa-50 p-4 shadow-suave sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={outfit.image_url} alt="" className="h-14 w-11 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-rosa-600">Tu outfit guardado</p>
            <p className="font-display text-xl text-noche">En las tiendas</p>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-noche/40 transition hover:bg-white hover:text-noche"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z" />
            </svg>
          </button>
        </div>

        <ProductosSugeridos grupos={grupos} cargando={cargando} />

        {!cargando && grupos.length === 0 && (
          <p className="rounded-2xl border border-rosa-100 bg-white p-5 text-sm text-noche/60">
            Hoy no encontramos estas prendas en los catálogos de las tiendas. Prueba con
            &ldquo;Buscar todo el outfit&rdquo; en Google.
          </p>
        )}

        <div className="mt-2 rounded-2xl border border-rosa-100 bg-white px-5 pb-5">
          <TiendasInstagram tiendas={tiendas} categorias={categorias} grupos={grupos} flexibles={flexibles} />
        </div>
      </div>
    </div>
  );
}
