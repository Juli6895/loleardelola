import { NextResponse } from "next/server";
import { confirmarOrden } from "@/lib/confirmar-pago";
import { contextoDe } from "@/lib/eventos";

// POST /api/membresia/confirmar  { orden }
//
// La página de resultado pregunta si su pago quedó. Quien de verdad
// confirma es Bold (ver lib/confirmar-pago.ts, que también usan el aviso
// de Bold y la revisión de pendientes).
//
// No pide sesión a propósito: la orden ya trae dueña desde que se
// creó, y exigir sesión acá rompería el caso de que Bold devuelva a la
// usuaria en otra pestaña o después de que la cookie se pierda.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const orden = typeof body.orden === "string" ? body.orden.trim() : "";
  if (!orden) {
    return NextResponse.json({ error: "Falta la orden." }, { status: 400 });
  }

  const r = await confirmarOrden(orden, contextoDe(req));
  if (r.ok) return NextResponse.json(r);
  const { status, ...resto } = r;
  return NextResponse.json(resto, { status: status ?? 200 });
}
