import { supabaseAdmin } from "./supabase";
import { consultarPago } from "./bold";
import { DIAS_DE_PLAN, PAQUETES_BUSQUEDAS, esPaquete, type TipoPlan } from "./planes";
import { registrar, type ContextoEvento } from "./eventos";

// =====================================================================
// Acreditar un pago de Bold
// =====================================================================
// Antes solo se acreditaba cuando la usuaria volvía a la página de
// resultado (/membresia/resultado). Si pagaba con Nequi o PSE y volvía
// a la app por otro lado, o cerraba la ventana, el pago quedaba
// "pendiente" para siempre y la membresía no se activaba (le pasó a
// Sandra el 8 de noviembre de 2026). Ahora lo mismo se llama desde
// cuatro lugares, y cualquiera que llegue primero acredita:
//   1. la página de resultado (app/api/membresia/confirmar),
//   2. el aviso de Bold (app/api/bold/webhook),
//   3. la app al abrirse, con las órdenes pendientes de quien entra
//      (app/api/membresia/pendientes),
//   4. una revisión diaria de todas (app/api/membresia/revisar-pendientes).
//
// La única fuente de verdad es la consulta a Bold (consultarPago): nada
// de lo que diga el navegador o el aviso se cree sin preguntarle.
// =====================================================================

export type ResultadoConfirmar =
  | { ok: true; estado: "acreditado"; yaEstaba?: boolean; hasta?: string; busquedas?: number; saldo?: number }
  | { ok: false; estado: string; error?: string; status?: number };

// Estados de Bold que ya no van a cambiar. Los demás (PENDING,
// PROCESSING, o que todavía no haya transacción) dejan la orden en
// "pendiente" para volver a preguntar después: antes se guardaban tal
// cual y la orden no se volvía a revisar nunca.
const FALLIDOS = ["REJECTED", "FAILED", "VOIDED"];

export async function confirmarOrden(orden: string, ctx: ContextoEvento = {}): Promise<ResultadoConfirmar> {
  const sb = supabaseAdmin();
  const { data: pago } = await sb
    .from("pagos")
    .select("order_id, user_id, plan, monto_cop, estado, created_at")
    .eq("order_id", orden)
    .maybeSingle();

  if (!pago) return { ok: false, estado: "desconocida", error: "No conocemos esa orden.", status: 404 };
  const contexto = { ...ctx, userId: pago.user_id };

  // Idempotencia: Bold puede avisar del mismo pago más de una vez, y la
  // usuaria puede recargar la página de resultado. Sin esto, cada
  // recarga le regalaría otro mes.
  if (pago.estado === "acreditado" || pago.estado === "cubierto-manual") {
    return { ok: true, estado: "acreditado", yaEstaba: true };
  }
  if (pago.estado !== "pendiente") return { ok: false, estado: pago.estado };

  const voucher = await consultarPago(orden);
  if (!voucher) {
    return {
      ok: false,
      estado: "sin-respuesta",
      error: "No pudimos verificar el pago con Bold. Intenta en un momento.",
      status: 502,
    };
  }

  if (voucher.estado !== "APPROVED") {
    if (FALLIDOS.includes(voucher.estado)) {
      registrar("pago_rechazado", contexto, { estado: voucher.estado, plan: pago.plan, metodo: voucher.metodo ?? "" });
      await sb.from("pagos").update({ estado: voucher.estado.toLowerCase() }).eq("order_id", orden).eq("estado", "pendiente");
    }
    return { ok: false, estado: voucher.estado };
  }

  // Bold dice que se pagó. Falta una cosa más: que el monto sea el que
  // pedimos. Si no cuadra, no se acredita — es la única defensa contra
  // que alguien logre pagar menos de lo debido.
  if (voucher.totalCop != null && voucher.totalCop < pago.monto_cop) {
    console.error("[confirmar] monto menor al esperado", { orden, esperado: pago.monto_cop, recibido: voucher.totalCop });
    await sb.from("pagos").update({ estado: "monto-no-cuadra" }).eq("order_id", orden);
    return { ok: false, estado: "monto-no-cuadra", status: 409 };
  }

  // Se aparta la orden antes de tocar la membresía: si el aviso de Bold
  // y la página de resultado llegan a la vez, solo uno la acredita.
  const { data: apartada } = await sb
    .from("pagos")
    .update({ estado: "acreditando" })
    .eq("order_id", orden)
    .eq("estado", "pendiente")
    .select("order_id");
  if (!apartada || apartada.length === 0) return { ok: true, estado: "acreditado", yaEstaba: true };

  const acreditar = () =>
    sb.from("pagos").update({ estado: "acreditado", acreditado_at: new Date().toISOString() }).eq("order_id", orden);
  const devolver = () => sb.from("pagos").update({ estado: "pendiente" }).eq("order_id", orden);

  // Un paquete de búsquedas no toca la membresía: suma búsquedas a su
  // saldo, que no se vence.
  if (esPaquete(pago.plan)) {
    const sumar = PAQUETES_BUSQUEDAS[pago.plan].busquedas;
    const { data: fila } = await sb.from("users").select("busquedas_extra").eq("id", pago.user_id).maybeSingle();
    const saldo = (Number((fila as any)?.busquedas_extra) || 0) + sumar;
    const { error } = await sb.from("users").update({ busquedas_extra: saldo }).eq("id", pago.user_id);
    if (error) {
      console.error("[confirmar] no se pudo sumar el paquete:", error.message);
      await devolver();
      return {
        ok: false,
        estado: "error",
        error: "No pudimos sumar tus búsquedas. Escríbenos a hola@loleardlola.com.",
        status: 500,
      };
    }
    await acreditar();
    registrar("pago_aprobado", contexto, { plan: pago.plan, monto: pago.monto_cop, metodo: voucher.metodo ?? "" });
    return { ok: true, estado: "acreditado", busquedas: sumar, saldo };
  }

  // Si ya se le activó a mano desde Administración por este mismo pago
  // (antes de que existiera todo esto), no se le suma otra vez.
  const { data: aMano } = await sb
    .from("pagos")
    .select("order_id")
    .eq("user_id", pago.user_id)
    .eq("plan", pago.plan)
    .eq("estado", "acreditado")
    .like("order_id", "manual-%")
    .gte("created_at", pago.created_at);
  if (aMano && aMano.length > 0) {
    await sb.from("pagos").update({ estado: "cubierto-manual" }).eq("order_id", orden);
    return { ok: true, estado: "acreditado", yaEstaba: true };
  }

  // Si todavía le queda membresía, los días se SUMAN a lo que le falta.
  const { data: usuario } = await sb.from("users").select("id, premium_until").eq("id", pago.user_id).maybeSingle();
  const ahora = Date.now();
  const vigente = usuario?.premium_until ? new Date(usuario.premium_until).getTime() : 0;
  const desde = vigente > ahora ? vigente : ahora;
  const hasta = new Date(desde + DIAS_DE_PLAN[pago.plan as TipoPlan] * 86400_000);

  const { error } = await sb.from("users").update({ premium_until: hasta.toISOString() }).eq("id", pago.user_id);
  if (error) {
    console.error("[confirmar] no se pudo activar la membresía:", error.message);
    await devolver();
    return { ok: false, estado: "error", error: "No pudimos activar tu membresía. Escríbenos a hola@loleardlola.com.", status: 500 };
  }
  await acreditar();
  registrar("pago_aprobado", contexto, { plan: pago.plan, monto: pago.monto_cop, metodo: voucher.metodo ?? "" });
  return { ok: true, estado: "acreditado", hasta: hasta.toISOString() };
}

/**
 * Revisa con Bold las órdenes pendientes recientes (de una persona o de
 * todas) y acredita las que ya se pagaron. Devuelve cuántas acreditó.
 */
export async function revisarPendientes(opciones: { userId?: string; dias: number; ctx?: ContextoEvento }) {
  let q = supabaseAdmin()
    .from("pagos")
    .select("order_id")
    .eq("estado", "pendiente")
    .like("order_id", "lola-%")
    .gte("created_at", new Date(Date.now() - opciones.dias * 86400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(50);
  if (opciones.userId) q = q.eq("user_id", opciones.userId);
  const { data } = await q;
  let acreditadas = 0;
  for (const p of data ?? []) {
    const r = await confirmarOrden(p.order_id, opciones.ctx);
    if (r.ok && !r.yaEstaba) acreditadas++;
  }
  return { revisadas: data?.length ?? 0, acreditadas };
}
