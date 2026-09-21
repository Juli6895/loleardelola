"use client";

import { useEffect, useState } from "react";

// Prendas con foto sacadas del catálogo que publican las tiendas.
// Ver lib/catalogo-tiendas.ts para el porqué y sus límites: solo cubre
// las tiendas que publican catálogo, no Zara ni H&M.

type Producto = {
  titulo: string;
  precioCop: number | null;
  imagen: string | null;
  url: string;
  tienda: string;
  dominio: string;
};

const pesos = (n: number) =>
  "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 0 });

// Lo que se le pide al catálogo por cada prenda. Se manda el desglose
// completo y no el término corto de Google, porque ese término se
// recorta a 5 palabras a propósito (Google no devuelve nada con
// búsquedas largas) y ahí se perdían justo el escote, la manga y la
// tela, que son los que deciden si dos prendas de verdad se parecen.
export type ConsultaPrenda = {
  etiqueta: string;
  tipo: string;
  color: string | null;
  rasgos: string[];
};

export default function ProductosSugeridos({
  consultas,
}: {
  consultas: ConsultaPrenda[];
}) {
  const [grupos, setGrupos] = useState<Array<{ termino: string; productos: Producto[] }>>([]);
  const [cargando, setCargando] = useState(false);

  // La clave evita relanzar la búsqueda cuando React vuelve a renderizar
  // con el mismo contenido pero otra identidad de array.
  const clave = JSON.stringify(consultas);

  useEffect(() => {
    const lista: ConsultaPrenda[] = JSON.parse(clave);
    if (lista.length === 0) {
      setGrupos([]);
      return;
    }
    let vigente = true;
    setCargando(true);
    Promise.all(
      lista.map(async (c) => {
        try {
          const params = new URLSearchParams({ tipo: c.tipo });
          if (c.color) params.set("color", c.color);
          if (c.rasgos.length) params.set("rasgos", c.rasgos.join("|"));
          const res = await fetch(`/api/catalogo?${params}`);
          const json = await res.json();
          return { termino: c.etiqueta, productos: (json.productos ?? []) as Producto[] };
        } catch {
          return { termino: c.etiqueta, productos: [] as Producto[] };
        }
      })
    )
      .then((r) => {
        if (!vigente) return;
        setGrupos(r.filter((g) => g.productos.length > 0));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [clave]);

  if (cargando) {
    return (
      <div className="rounded-2xl border border-rosa-100 bg-white p-6 text-sm text-noche/50 shadow-sm sm:p-8">
        Buscando prendas parecidas en las tiendas...
      </div>
    );
  }

  if (grupos.length === 0) return null;

  const variasPrendas = grupos.length > 1;

  return (
    <div className="rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="font-display text-2xl text-noche">Prendas parecidas, en tienda</h2>
      <p className="mt-1 text-sm text-noche/60">
        Salen del catálogo que estas tiendas publican, así que el precio y la
        foto son los de ellas. Haz clic para ir directo a la prenda.
      </p>

      <div className="mt-6 space-y-8">
        {grupos.map((g) => (
          <div key={g.termino}>
            {variasPrendas && (
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-noche/50">
                {g.termino}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {g.productos.map((p) => (
                <a
                  key={p.url}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col overflow-hidden rounded-xl border border-rosa-100 transition hover:border-rosa-300 hover:shadow-md"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-rosa-50">
                    {/* <img> normal y no next/image: las fotos vienen de
                        los CDN de cada tienda, y configurar cada dominio
                        en next.config obligaría a tocar el código cada
                        vez que se agrega una tienda. */}
                    {p.imagen && (
                      <img
                        src={p.imagen}
                        alt={p.titulo}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="line-clamp-2 text-xs leading-snug text-noche/80">
                      {p.titulo}
                    </p>
                    <p className="mt-auto text-sm font-medium text-noche">
                      {p.precioCop ? pesos(p.precioCop) : ""}
                    </p>
                    <p className="text-[11px] text-noche/40">{p.tienda}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
