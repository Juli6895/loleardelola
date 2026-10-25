import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { consultarPago } from "@/lib/bold";
import { DIAS_DE_PLAN, PAQUETES_BUSQUEDAS, esPaquete, type TipoPlan } from "@/lib/planes";
import { contextoDe, registrar } from "@/lib/eventos";

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
    registrar("pago_rechazado", contextoDe(req, pago.user_id), {
      estado: voucher.estado,
      plan: pago.plan,
      metodo: voucher.metodo ?? "",
    });
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

  // Un paquete de búsquedas no toca la membresía: suma búsquedas a su
  // saldo, que no se vence.
  if (esPaquete(pago.plan)) {
    const sumar = PAQUETES_BUSQUEDAS[pago.plan].busquedas;
    const { data: fila } = await sb.from("users").select("busquedas_extra").eq("id", pago.user_id).maybeSingle();
    const saldo = (Number((fila as any)?.busquedas_extra) || 0) + sumar;
    const { error: errorSaldo } = await sb.from("users").update({ busquedas_extra: saldo }).eq("id", pago.user_id);
    if (errorSaldo) {
      console.error("[confirmar] no se pudo sumar el paquete:", errorSaldo.message);
      return NextResponse.json({ error: "No pudimos sumar tus búsquedas. Escríbenos a contacto@lakaja.co." }, { status: 500 });
    }
    await sb
      .from("pagos")
      .update({ estado: "acreditado", acreditado_at: new Date().toISOString() })
      .eq("order_id", orden);
    registrar("pago_aprobado", contextoDe(req, pago.user_id), {
      plan: pago.plan,
      monto: pago.monto_cop,
      metodo: voucher.metodo ?? "",
    });
    return NextResponse.json({ ok: true, estado: "acreditado", busquedas: sumar, saldo });
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

  registrar("pago_aprobado", contextoDe(req, pago.user_id), {
    plan: pago.plan,
    monto: pago.monto_cop,
    metodo: voucher.metodo ?? "",
  });
  return NextResponse.json({ ok: true, estado: "acreditado", hasta: hasta.toISOString() });
}
