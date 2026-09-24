"use client";

import type { ClosetCategory, TiendaInstagram } from "@/types";
import { prendaDeTienda, type GrupoProductos } from "@/lib/use-catalogo";

type Props = {
  tiendas: TiendaInstagram[];
  // Categorías de las prendas que se detectaron en la foto.
  categorias: ClosetCategory[];
  // Prendas encontradas en los catálogos. De Instagram no se pueden
  // sacar fotos, pero si la tienda tiene web con catálogo, se muestra
  // una prenda suya de verdad — la más parecida a la de la foto.
  grupos: GrupoProductos[];
};

// Muestra las tiendas del directorio curado que venden el TIPO de prenda
// que se detectó en la foto. Importante: no afirma que tengan esa prenda
// exacta en stock — no tenemos forma de saberlo sin una API de productos,
// y el copy lo deja explícito para no prometer de más.
export default function TiendasInstagram({ tiendas, categorias, grupos }: Props) {
  if (tiendas.length === 0 || categorias.length === 0) return null;

  const relevantes = tiendas.filter((t) =>
    t.categorias.some((c) => categorias.includes(c))
  );
  if (relevantes.length === 0) return null;

  return (
    <div className="mt-8 border-t border-rosa-100 pt-6">
      <h3 className="font-display text-xl text-noche">
        Tiendas en Instagram
      </h3>
      <p className="mt-1 text-xs text-noche/50">
        Venden este tipo de prendas — no sabemos si tienen justo esta, pero
        vale la pena chismosearlas.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {relevantes.map((t) => {
          const prenda = prendaDeTienda(grupos, t.dominio);
          return (
          <a
            key={t.handle}
            href={`https://www.instagram.com/${t.handle}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-rosa-100 bg-white px-4 py-3 transition hover:border-rosa-300 hover:bg-rosa-50/50"
          >
            {prenda?.imagen ? (
              // La foto es de su catálogo web, no de Instagram — de ahí
              // no se pueden sacar imágenes. Es una prenda suya de
              // verdad, parecida a la de la foto.
              <span className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-rosa-50">
                <img
                  src={prenda.imagen}
                  alt={prenda.titulo}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </span>
            ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rosa-300 to-rosa-500 text-white">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.4a6.4 6.4 0 100 12.8 6.4 6.4 0 000-12.8zm0 10.5a4.1 4.1 0 110-8.2 4.1 4.1 0 010 8.2zm8.1-10.8a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-noche">
                {t.nombre}
              </span>
              <span className="block truncate text-xs text-noche/50">
                @{t.handle}
                {t.ciudad && ` · ${t.ciudad}`}
              </span>
              {prenda && (
                <span className="mt-0.5 block truncate text-xs text-rosa-500">
                  {prenda.titulo}
                </span>
              )}
            </span>
          </a>
          );
        })}
      </div>
    </div>
  );
}
