import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { consultarPago } from "@/lib/bold";
import { DIAS_DE_PLAN, type TipoPlan } from "@/lib/planes";

// POST /api/membresia/confirmar  { orden }
//
// Confirma un pago preguntándole a Bold, no al navegador. Es el punto
// donde de verdad se activa la membresía.
//
// No pide sesión a propósito: la orden ya trae dueña desde que se
// creó, y exigir sesión acá rompería el caso de que Bold devuelva a la
// usuaria en otra pestaña o después de que la cookie se pierda.
export async function POST(req: Request) {
  const body = await req.json();
  const orden = typeof body.orden === "string" ? body.orden.trim() : "";
  if (!orden) {
    return NextResponse.json({ error: "Falta la orden." }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: pago } = await sb
    .from("pagos")
    .select("order_id, user_id, plan, monto_cop, estado")
    .eq("order_id", orden)
    .maybeSingle();

  if (!pago) {
    return NextResponse.json({ error: "No conocemos esa orden." }, { status: 404 });
  }

  // Idempotencia: Bold puede avisar del mismo pago más de una vez, y la
  // usuaria puede recargar la página de resultado. Sin esto, cada
  // recarga le regalaría otro mes.
  if (pago.estado === "acreditado") {
    return NextResponse.json({ ok: true, estado: "acreditado", yaEstaba: true });
  }

  const voucher = await consultarPago(orden);
  if (!voucher) {
    return NextResponse.json(
      { error: "No pudimos verificar el pago con Bold. Intenta en un momento." },
      { status: 502 }
    );
  }

  if (voucher.estado !== "APPROVED") {
    await sb
      .from("pagos")
      .update({ estado: voucher.estado.toLowerCase() })
      .eq("order_id", orden);
    return NextResponse.json({ ok: false, estado: voucher.estado });
  }

  // Bold dice que se pagó. Falta una cosa más: que el monto sea el que
  // pedimos. Si no cuadra, no se acredita — es la única defensa contra
  // que alguien logre pagar menos de lo debido.
  if (voucher.totalCop != null && voucher.totalCop < pago.monto_cop) {
    console.error("[confirmar] monto menor al esperado", {
      orden,
      esperado: pago.monto_cop,
      recibido: voucher.totalCop,
    });
    await sb.from("pagos").update({ estado: "monto-no-cuadra" }).eq("order_id", orden);
    return NextResponse.json(
      { ok: false, estado: "monto-no-cuadra" },
      { status: 409 }
    );
  }

  // Si todavía le queda membresía, los días se SUMAN a lo que le falta.
  const { data: usuario } = await sb
    .from("users")
    .select("id, premium_until")
    .eq("id", pago.user_id)
    .maybeSingle();

  const ahora = Date.now();
  const vigente = usuario?.premium_until
    ? new Date(usuario.premium_until).getTime()
    : 0;
  const desde = vigente > ahora ? vigente : ahora;
  const hasta = new Date(desde + DIAS_DE_PLAN[pago.plan as TipoPlan] * 86400_000);

  await sb
    .from("users")
    .update({ premium_until: hasta.toISOString() })
    .eq("id", pago.user_id);

  await sb
    .from("pagos")
    .update({ estado: "acreditado", acreditado_at: new Date().toISOString() })
    .eq("order_id", orden);

  return NextResponse.json({ ok: true, estado: "acreditado", hasta: hasta.toISOString() });
}
