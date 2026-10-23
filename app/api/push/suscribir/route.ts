import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";
import { contextoDe, registrar } from "@/lib/eventos";

// POST /api/push/suscribir  { endpoint, keys: { p256dh, auth } }
//
// Guarda dónde mandarle notificaciones a este celular o navegador (lo
// que devuelve pushManager.subscribe() en el navegador). Solo con
// cuenta: la notificación es de SUS avisos de rebaja.
export async function POST(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario?.conSesion) {
    return NextResponse.json({ error: "Entra con tu correo para recibir avisos." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : "";
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth) {
    return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("suscripciones_push")
    .upsert({ user_id: usuario.id, endpoint, p256dh, auth }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  registrar("push_suscrito", contextoDe(req, usuario.id));
  return NextResponse.json({ ok: true });
}
