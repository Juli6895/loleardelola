"use client";

import { useState } from "react";
import SearchBox, { type SearchResult as R } from "@/components/SearchBox";
import SearchResult from "@/components/SearchResult";
import Link from "next/link";
import { useUsuario } from "@/lib/use-usuario";
import { CUPOS_MEMBRESIA, TOPES } from "@/lib/planes";
import { useAnotarUnaVez } from "@/lib/use-evento";

// Página donde se hace el análisis de outfit
export default function BuscarPage() {
  useAnotarUnaVez("buscar_visto");
  const { usuario } = useUsuario();
  // Guardar outfits: sin cuenta no se puede (TOPES.anonimo.outfits = 0).
  const puedeGuardar = (TOPES[usuario?.plan ?? "anonimo"].outfits ?? 1) > 0;
  const [result, setResult] = useState<R | null>(null);
  // Las promos siguen lo que se detectó en la foto (vestido, blusa...).
  const tipos = Array.from(
    new Set((result?.result.prendas ?? []).map((p) => p.tipo).filter((t): t is string => !!t))
  );

  return (
    // Las promociones tienen su propia pestaña (/promociones). Aquí solo
    // queda el enlace a las de lo que se buscó.
    <div className="mx-auto max-w-6xl space-y-12">
    <div className="mx-auto min-w-0 max-w-4xl space-y-6">
      <header className="text-center">
        <h1 className="font-display text-4xl text-noche sm:text-5xl">
          Cuéntanos qué outfit te enamoró
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-noche/70">
          ¿Viste un outfit en Pinterest, en Instagram o en la calle y no sabes dónde conseguirlo? Pega el link del pin o
          sube la foto, y nosotros buscamos cada prenda por ti en tiendas de Colombia.
        </p>
      </header>

      {/* Qué hacer y qué te devolvemos, para que nadie llegue a ciegas. */}
      <section aria-label="Cómo funciona la búsqueda" className="grid gap-3 text-left sm:grid-cols-3">
        {[
          {
            paso: "1. Pega o sube",
            texto:
              "El link de un pin de Pinterest, una foto de tu celular o una captura de pantalla. También puedes copiar una imagen y pegarla aquí (Ctrl+V).",
          },
          {
            paso: "2. Reconocemos cada prenda",
            texto:
              "Separamos el outfit en sus prendas —blusa, pantalón, vestido, chaqueta...— con su color y los detalles que la hacen única: el corte, el largo, la tela o el estampado.",
          },
          {
            paso: "3. Te mostramos dónde comprar",
            texto:
              "Prendas parecidas de verdad, con foto y precio, en las tiendas de la lista. Con la membresía, dale corazón a la que te guste y te avisamos si baja de precio.",
          },
        ].map((x) => (
          <div key={x.paso} className="rounded-2xl border border-rosa-100 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-noche">{x.paso}</p>
            <p className="mt-1 text-xs leading-relaxed text-noche/65">{x.texto}</p>
          </div>
        ))}
      </section>
      <p className="text-center text-xs text-noche/50">
        Además: las promociones de lo que buscaste y la opción de guardar el outfit para verlo después. Buscar es parte
        de la membresía: {CUPOS_MEMBRESIA.mensual.busquedas} búsquedas con la mensual o {CUPOS_MEMBRESIA.anual.busquedas} con la
        anual. Funciona mejor con fotos claras, de cuerpo entero y con buena luz.
      </p>

      <SearchBox onResult={setResult} />

      {result && <SearchResult data={result} />}

      {tipos.length > 0 && (
        <Link
          href={`/promociones?tipos=${encodeURIComponent(tipos.join("|"))}`}
          className="flex items-center justify-between gap-3 rounded-2xl border border-rosa-200 bg-rosa-50/60 px-5 py-4 transition hover:border-rosa-400"
        >
          <span>
            <span className="block text-sm font-semibold text-noche">Mira las promociones de lo que buscaste</span>
            <span className="block text-xs text-noche/60">
              {tipos.join(", ")} con más del 10% de descuento, en tallas disponibles.
            </span>
          </span>
          <span className="shrink-0 text-sm font-medium text-rosa-600">Ver promociones →</span>
        </Link>
      )}

      {/* Ver outfits guardados: en negro si puede guardarlos; en gris, y
          con el enlace para crear la cuenta gratis, si no. */}
      <div className="flex flex-col items-center gap-2 border-t border-rosa-100 pt-6 text-center">
        {puedeGuardar ? (
          <Link
            href="/mis-outfits"
            className="rounded-full bg-noche px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500"
          >
            Ver outfits guardados
          </Link>
        ) : (
          <>
            <span
              aria-disabled="true"
              className="cursor-not-allowed rounded-full bg-noche/15 px-6 py-2.5 text-sm font-medium text-noche/40"
            >
              Ver outfits guardados
            </span>
            <Link
              href="/entrar?volver=/buscar&motivo=Crea tu cuenta gratis para guardar tus outfits."
              className="text-xs font-medium text-rosa-600 underline-offset-2 hover:underline"
            >
              Actívala con tu cuenta gratis
            </Link>
          </>
        )}
      </div>
    </div>
    </div>
  );
}
