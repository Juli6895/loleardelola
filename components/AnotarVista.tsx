"use client";

import { useAnotarUnaVez } from "@/lib/use-evento";

// Anota que alguien VIO una página. Existe como componente porque
// varias de esas páginas se dibujan en el servidor y no pueden usar
// hooks — este se monta adentro y no pinta nada.
export default function AnotarVista({
  nombre,
  props = {},
}: {
  nombre: string;
  props?: Record<string, unknown>;
}) {
  useAnotarUnaVez(nombre, props);
  return null;
}
