import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";

// POST /api/auth/nombre  { nombre }
// Guarda cómo quiere que la llamemos. Solo con sesión abierta: el
// nombre va pegado a la cuenta, no al navegador.
export async function POST(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario?.conSesion) {
    return NextResponse.json({ error: "Entra con tu correo primero." }, { status: 401 });
  }

  const body = await req.json();
  const nombre =
    typeof body.nombre === "string" ? body.nombre.trim().slice(0, 60) : "";
  if (!nombre) {
    return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("users")
    .update({ name: nombre })
    .eq("id", usuario.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, nombre });
}
