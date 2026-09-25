import { supabaseAdmin } from "./supabase";
import { usuarioActual } from "./sesion";
import { DIAS_DE_PLAN, PRECIOS, type TipoPlan } from "./planes";
import { esAdmin } from "./admin-correos";

export { esAdmin };

// =====================================================================
// Administración de membresías
// =====================================================================
// Por qué esto existe en vez de activar sola la membresía al volver del
// pago: Bold cobra por un LINK DE PAGO, que no le avisa nada a la
// página. Lo único que llega es el navegador de vuelta, y fiarse de eso
// sería regalarle la membresía a cualquiera que escriba la dirección de
// retorno a mano.
//
// Mientras Bold aprueba las llaves de API —con las que sí se puede
// preguntar "¿esta venta se pagó?"— la activación la hace Juliana: ve
// el pago en su app de Bold y lo aprueba acá. Con pocas membresías al
// día es perfectamente manejable, y es honesto: no inventa una
// confirmación que no tenemos.
// =====================================================================

/** Exige sesión abierta Y correo de administración. */
export async function exigirAdmin(
  req: Request
): Promise<{ ok: true; id: string } | { ok: false; status: number; error: string }> {
  const usuario = await usuarioActual(req);
  if (!usuario?.conSesion) {
    return { ok: false, status: 401, error: "Entra con tu correo." };
  }
  if (!esAdmin(usuario.email)) {
    return { ok: false, status: 403, error: "No tienes permiso." };
  }
  return { ok: true, id: usuario.id };
}

/**
 * Le da (o le extiende) la membresía a una usuaria.
 *
 * Si todavía le queda membresía vigente, los días nuevos se SUMAN a lo
 * que le falta en vez de reemplazarlo. Si no, se cuentan desde hoy.
 * Así, pagar antes de que se venza no le quita días pagados.
 */
export async function activarMembresia(
  correo: string,
  plan: TipoPlan
): Promise<{ ok: true; hasta: string } | { ok: false; error: string }> {
  const sb = supabaseAdmin();
  const limpio = correo.trim().toLowerCase();

  const { data: usuario } = await sb
    .from("users")
    .select("id, premium_until")
    .eq("email", limpio)
    .maybeSingle();

  if (!usuario) {
    return {
      ok: false,
      error: `Nadie con el correo ${limpio} ha entrado a la app todavía. Pídele que entre primero.`,
    };
  }

  const ahora = Date.now();
  const vigenteHasta = usuario.premium_until
    ? new Date(usuario.premium_until).getTime()
    : 0;
  const desde = vigenteHasta > ahora ? vigenteHasta : ahora;
  const hasta = new Date(desde + DIAS_DE_PLAN[plan] * 86400_000);

  const { error } = await sb
    .from("users")
    .update({ premium_until: hasta.toISOString() })
    .eq("id", usuario.id);

  if (error) return { ok: false, error: error.message };

  // Queda el registro de por qué tiene membresía.
  await sb.from("pagos").insert({
    order_id: `manual-${usuario.id}-${ahora}`,
    user_id: usuario.id,
    plan,
    monto_cop: PRECIOS[plan],
    estado: "acreditado",
    acreditado_at: new Date().toISOString(),
  });

  return { ok: true, hasta: hasta.toISOString() };
}
