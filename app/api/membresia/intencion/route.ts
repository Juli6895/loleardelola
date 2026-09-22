import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";
import { PRECIOS, type TipoPlan } from "@/lib/planes";

// POST /api/membresia/intencion  { plan: "mensual" | "anual" }
//
// Deja anotado que esta usuaria va a pagar, ANTES de mandarla al link
// de Bold. No confirma nada: solo sirve para que Juliana pueda cruzar
// el pago que ve en su app de Bold con una cuenta de la página.
//
// Exige sesión a propósito. Sin correo no hay a quién activarle la
// membresía después, y el link de Bold no nos dice quién pagó.
export async function POST(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario?.conSesion || !usuario.email) {
    return NextResponse.json(
      { error: "Entra con tu correo antes de pagar, para poder activarte la membresía." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const plan: TipoPlan = body.plan === "anual" ? "anual" : "mensual";

  const { error } = await supabaseAdmin().from("pagos").insert({
    order_id: `intento-${usuario.id}-${Date.now()}`,
    user_id: usuario.id,
    plan,
    monto_cop: PRECIOS[plan],
    estado: "pendiente",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, correo: usuario.email, plan });
}
