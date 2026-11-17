import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cerrarSesion, usuarioActual } from "@/lib/sesion";
import { esCelularBloqueado, MENSAJE_CORREO_BLOQUEADO } from "@/lib/correos-bloqueados";
import { contextoDe, registrar } from "@/lib/eventos";

// POST /api/auth/celular  { celular }
// Guarda el celular de la cuenta. Se pide al crearla, sin código por
// mensaje: verificarlo cuesta plata por cada mensaje.
export async function POST(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario?.conSesion) {
    return NextResponse.json({ error: "Entra con tu correo primero." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const celular = normalizarCelular(body.celular);
  if (!celular) {
    return NextResponse.json(
      { error: "Escribe tu celular de 10 dígitos, por ejemplo 300 123 4567." },
      { status: 400 }
    );
  }
  // Un celular bloqueado (lib/correos-bloqueados.ts): la persona entró
  // con otro correo, pero es la misma. Se le cierra la sesión.
  if (esCelularBloqueado(celular)) {
    registrar("ingreso_error", contextoDe(req, usuario.id), { motivo: "celular bloqueado" });
    await cerrarSesion();
    return NextResponse.json({ error: MENSAJE_CORREO_BLOQUEADO }, { status: 403 });
  }
  const { error } = await supabaseAdmin().from("users").update({ celular }).eq("id", usuario.id);
  if (error) {
    console.error("[auth/celular]", error.message);
    return NextResponse.json({ error: "No pudimos guardar tu celular." }, { status: 500 });
  }
  registrar("celular_puesto", contextoDe(req, usuario.id));
  return NextResponse.json({ ok: true });
}

// Solo celulares de Colombia: 10 dígitos que empiezan por 3, con o sin
// el +57 adelante. Se guarda como +57XXXXXXXXXX.
function normalizarCelular(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  let digitos = valor.replace(/\D/g, "");
  if (digitos.length === 12 && digitos.startsWith("57")) digitos = digitos.slice(2);
  if (!/^3\d{9}$/.test(digitos)) return null;
  return `+57${digitos}`;
}
