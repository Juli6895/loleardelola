import { NextResponse } from "next/server";
import { normalizarCorreo, verificarCodigo, usuarioActual } from "@/lib/sesion";

// POST /api/auth/verificar  { email, codigo }
// Valida el código y deja la sesión abierta (cookie).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const correo = normalizarCorreo(body.email);
    const codigo = typeof body.codigo === "string" ? body.codigo.trim() : "";

    if (!correo || !/^\d{6}$/.test(codigo)) {
      return NextResponse.json(
        { error: "Revisa el correo y el código de 6 dígitos." },
        { status: 400 }
      );
    }

    const resultado = await verificarCodigo(req, correo, codigo);
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.motivo }, { status: 401 });
    }

    const usuario = await usuarioActual(req);
    return NextResponse.json({ ok: true, usuario });
  } catch (e) {
    console.error("[auth/verificar] falló:", e);
    return NextResponse.json({ error: "No pudimos validar tu código." }, { status: 500 });
  }
}
