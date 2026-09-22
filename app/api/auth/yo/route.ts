import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/sesion";
import { TOPES } from "@/lib/planes";

// GET /api/auth/yo → quién está usando la app y qué puede hacer.
// La página lo necesita para saber si mostrar "entrar" o el correo, y
// para pintar los contadores de "te quedan N búsquedas".
export async function GET(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario) {
    return NextResponse.json({ usuario: null, topes: TOPES.anonimo });
  }
  return NextResponse.json({ usuario, topes: TOPES[usuario.plan] });
}
