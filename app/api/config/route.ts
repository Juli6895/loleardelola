import { NextResponse } from "next/server";
import { getExcludedMerchants } from "@/lib/merchant-exclusions";
import { getAllowedMerchants } from "@/lib/merchant-allowlist";
import { getTiendasInstagram } from "@/lib/tiendas-instagram";

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

export async function GET() {
  return NextResponse.json({
    excludedMerchants: getExcludedMerchants(),
    allowedMerchants: getAllowedMerchants(),
    tiendasInstagram: getTiendasInstagram(),
  });
}
