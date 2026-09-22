import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";
import { armarBoton } from "@/lib/bold";
import { PRECIOS, type TipoPlan } from "@/lib/planes";

// POST /api/membresia/checkout  { plan: "mensual" | "anual" }
//
// Prepara el cobro: guarda la orden como pendiente y devuelve los datos
// firmados para el botón de Bold. La firma se calcula acá y nunca en el
// navegador — si se hiciera allá, la llave secreta quedaría a la vista.
//
// Exige sesión: sin correo no hay a quién activarle la membresía.
export async function POST(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario?.conSesion || !usuario.email) {
    return NextResponse.json(
      { error: "Entra con tu correo antes de pagar." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const plan: TipoPlan = body.plan === "anual" ? "anual" : "mensual";

  const origen = new URL(req.url).origin;
  const boton = armarBoton(usuario.id, plan, origen);
  if (!boton) {
    return NextResponse.json(
      { error: "El pago todavía no está configurado." },
      { status: 503 }
    );
  }

  // La orden se guarda ANTES de mandarla a pagar. Así, cuando vuelva,
  // sabemos de quién era y por cuánto — sin creerle nada al navegador.
  const { error } = await supabaseAdmin().from("pagos").insert({
    order_id: boton.orden,
    user_id: usuario.id,
    plan,
    monto_cop: PRECIOS[plan],
    estado: "pendiente",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ boton });
}
