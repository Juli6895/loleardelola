import { NextResponse } from "next/server";
import { getExcludedMerchants } from "@/lib/merchant-exclusions";
import { getAllowedMerchants } from "@/lib/merchant-allowlist";
import { getTiendasInstagram } from "@/lib/tiendas-instagram";
import { tiendasConCatalogo } from "@/lib/catalogo-tiendas";

// Endpoint: GET /api/config
// Devuelve configuración pública que el cliente necesita para construir
// URLs de Google Shopping consistentes (comercios excluidos y/o la lista
// cerrada de comercios permitidos — ambas son ajustes de administración,
// editables solo en los .txt del repo, no desde la UI).
//
// Lo llaman /buscar (vía la respuesta de /api/vision que ya la incluye) y
// /mis-outfits (que no analiza: abre Google y busca en las tiendas con
// los términos guardados, y para eso necesita también el directorio de
// tiendas de Instagram).

// force-dynamic: el archivo de config puede cambiar entre requests, no queremos
// la respuesta congelada a build time.
export const dynamic = "force-dynamic";

/**
 * Todas las marcas de la app, para que cada quien escoja las suyas en el
 * menú ("Mis marcas"): las del catálogo y las del directorio de
 * Instagram, una sola vez cada una y por orden alfabético.
 */
function todasLasMarcas(): Array<{ dominio: string; nombre: string }> {
  const limpio = (d: string) => d.trim().toLowerCase().replace(/^www\./, "");
  const marcas = new Map<string, string>();
  for (const t of tiendasConCatalogo()) marcas.set(limpio(t.dominio), t.nombre);
  for (const t of getTiendasInstagram()) {
    if (t.dominio && !marcas.has(limpio(t.dominio))) marcas.set(limpio(t.dominio), t.nombre);
  }
  return Array.from(marcas, ([dominio, nombre]) => ({ dominio, nombre })).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es")
  );
}

export async function GET() {
  return NextResponse.json({
    excludedMerchants: getExcludedMerchants(),
    allowedMerchants: getAllowedMerchants(),
    tiendasInstagram: getTiendasInstagram(),
    marcas: todasLasMarcas(),
  });
}
