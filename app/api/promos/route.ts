import { NextResponse } from "next/server";
import { deLosTipos, porMarca, todasLasPromos } from "@/lib/promos-guardadas";

// GET /api/promos
//   ?tipos=vestido|blusa  → { relacionadas, marcas }: las de esas prendas
//                           y todas, agrupadas por marca (4 de cada una).
//   ?marca=dominio&desde=0[&tipos=...] → { promos, total }: todas las de
//                           esa marca, de a POR_PAGINA ("Ver más promos
//                           de esta marca").
//   ?muestra=1            → { promos }: unas pocas, para la vista borrosa
//                           cuando se acabó la prueba.
//
// Salen de la revisión diaria (lib/promos-diarias.ts): más de 10% de
// descuento y con una talla disponible. Quién puede verlas lo decide
// /api/promos/acceso. La respuesta es la misma para todas, así que se
// guarda en la caché de Vercel media hora.
export const maxDuration = 60;

const VISTA_PREVIA = 4;
const POR_PAGINA = 40;
const CACHE = "public, s-maxage=1800, stale-while-revalidate=3600";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const tipos = (params.get("tipos") ?? "")
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
  const marca = params.get("marca");

  try {
    const todas = await todasLasPromos();
    const json = (cuerpo: unknown) => NextResponse.json(cuerpo, { headers: { "Cache-Control": CACHE } });

    if (params.get("muestra") === "1") return json({ promos: todas.slice(0, 8) });

    if (marca) {
      const deLaMarca = deLosTipos(todas, tipos).filter((p) => p.dominio === marca);
      const desde = Math.max(0, Number(params.get("desde")) || 0);
      return json({ promos: deLaMarca.slice(desde, desde + POR_PAGINA), total: deLaMarca.length });
    }

    return json({
      relacionadas: tipos.length > 0 ? porMarca(deLosTipos(todas, tipos), VISTA_PREVIA) : [],
      marcas: porMarca(todas, VISTA_PREVIA),
    });
  } catch (e) {
    console.error("[api/promos] falló:", e);
    return NextResponse.json({ relacionadas: [], marcas: [], promos: [], total: 0 });
  }
}
