"use client";

import { useEffect, useState } from "react";

// Busca en los catálogos de las tiendas las prendas parecidas a las que
// se detectaron en la foto.
//
// Vive acá arriba y no dentro de un componente porque el resultado lo
// usan DOS secciones: la fila de "prendas parecidas, en tienda" y las
// tarjetas de Instagram, que muestran una prenda de la misma tienda.
// Si cada una pidiera lo suyo se dispararían el doble de peticiones
// para pintar exactamente los mismos productos.

export type ProductoTienda = {
  titulo: string;
  precioCop: number | null;
  imagen: string | null;
  url: string;
  tienda: string;
  dominio: string;
};

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

export type GrupoProductos = {
  etiqueta: string;
  productos: ProductoTienda[];
};

export function useCatalogo(consultas: ConsultaPrenda[]) {
  const [grupos, setGrupos] = useState<GrupoProductos[]>([]);
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
          return {
            etiqueta: c.etiqueta,
            productos: (json.productos ?? []) as ProductoTienda[],
          };
        } catch {
          return { etiqueta: c.etiqueta, productos: [] as ProductoTienda[] };
        }
      })
    )
      .then((r) => {
        if (vigente) setGrupos(r.filter((g) => g.productos.length > 0));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [clave]);

  return { grupos, cargando };
}

/** La mejor prenda encontrada en una tienda puntual, si hay alguna. */
export function prendaDeTienda(
  grupos: GrupoProductos[],
  dominio: string | null
): ProductoTienda | null {
  if (!dominio) return null;
  for (const g of grupos) {
    const p = g.productos.find((x) => x.dominio === dominio);
    if (p) return p;
  }
  return null;
}
