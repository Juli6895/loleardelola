import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/sesion";
import { accesoPromos } from "@/lib/acceso-promos";

// GET /api/promos/acceso → { permitido, plan, hasta }
//
// Si esta persona puede ver las promociones: con membresía siempre; sin
// cuenta 1 día y con cuenta gratis 3 (ver lib/acceso-promos.ts). Va
// aparte de /api/promos porque esa respuesta es la misma para todas y
// se guarda en caché; esta es de cada una.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const usuario = await usuarioActual(req);
    return NextResponse.json(await accesoPromos(usuario), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[api/promos/acceso] falló:", e);
    return NextResponse.json({ permitido: true, plan: "anonimo", hasta: null });
  }
}
