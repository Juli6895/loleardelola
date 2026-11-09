import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/sesion";
import { revisarPendientes } from "@/lib/confirmar-pago";
import { contextoDe } from "@/lib/eventos";

// POST /api/membresia/pendientes → { acreditadas }
//
// La app lo llama al abrirse (components/RevisarPagoPendiente.tsx): si
// quien entra tiene una orden de la última semana sin acreditar, se le
// pregunta a Bold y, si ya pagó, se le activa ahí mismo. Es el respaldo
// para cuando pagó y volvió a la app sin pasar por la página de
// resultado.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const usuario = await usuarioActual(req).catch(() => null);
  if (!usuario?.conSesion) return NextResponse.json({ acreditadas: 0 });
  const r = await revisarPendientes({ userId: usuario.id, dias: 7, ctx: contextoDe(req, usuario.id) });
  return NextResponse.json({ acreditadas: r.acreditadas });
}
