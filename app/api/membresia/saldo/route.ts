import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/sesion";
import { saldoDeBusquedas } from "@/lib/limites";

// GET /api/membresia/saldo → cuántas búsquedas del mes lleva y cuántas de
// paquete le quedan. Lo usa la página de la membresía.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario?.conSesion || usuario.plan !== "membresia") {
    return NextResponse.json({ saldo: null });
  }
  return NextResponse.json({ saldo: await saldoDeBusquedas(usuario) });
}
