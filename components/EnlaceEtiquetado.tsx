"use client";

import Link from "next/link";
import { anotar } from "@/lib/use-evento";

/**
 * Un enlace que anota una etiqueta (ver lib/etiquetas.ts) al tocarlo.
 * Existe porque Hero y Servicios se dibujan en el servidor y no pueden
 * tener onClick.
 */
export default function EnlaceEtiquetado({
  href,
  etiqueta,
  props = {},
  className,
  children,
}: {
  href: string;
  etiqueta: string;
  props?: Record<string, unknown>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => anotar(etiqueta, props)}>
      {children}
    </Link>
  );
}
