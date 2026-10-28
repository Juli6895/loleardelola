import { supabaseAdmin } from "./supabase";
import { DIAS_PRUEBA_PROMOS } from "./planes";
import { esAdmin } from "./admin-correos";
import type { UsuarioActual } from "./sesion";

// =====================================================================
// ¿Puede ver las promociones?
// =====================================================================
// Con membresía, siempre. Sin cuenta, 1 día desde la primera visita de
// ese navegador. Con cuenta gratis, 3 días desde que la creó — o desde
// la primera cuenta que se creó en ese navegador (promos_prueba_desde),
// para que no se pueda tener otra prueba creando otro correo.
// =====================================================================

export type AccesoPromos = {
  permitido: boolean;
  plan: "anonimo" | "gratis" | "membresia";
  // Hasta cuándo las ve gratis. null con membresía.
  hasta: string | null;
};

const DIA_MS = 86_400_000;

export async function accesoPromos(usuario: UsuarioActual | null): Promise<AccesoPromos> {
  // Sin navegador identificado no hay de dónde contar: se dejan ver antes
  // que bloquear a alguien por un error de la app.
  if (!usuario) return { permitido: true, plan: "anonimo", hasta: null };
  if (usuario.plan === "membresia" || (usuario.conSesion && esAdmin(usuario.email))) {
    return { permitido: true, plan: "membresia", hasta: null };
  }

  const sb = supabaseAdmin();
  let fila: { created_at: string; email: string | null; registrado_at?: string | null; promos_prueba_desde?: string | null } | null =
    null;
  const completa = await sb
    .from("users")
    .select("created_at, email, registrado_at, promos_prueba_desde")
    .eq("id", usuario.id)
    .maybeSingle();
  if (!completa.error) fila = completa.data;
  else {
    // La migración de promos todavía no se corrió: sin esas columnas, la
    // fecha de la fila sirve de primera visita y de registro.
    const basica = await sb.from("users").select("created_at, email").eq("id", usuario.id).maybeSingle();
    fila = basica.data;
  }
  if (!fila) return { permitido: true, plan: usuario.conSesion ? "gratis" : "anonimo", hasta: null };

  // La fila de un navegador donde ya se creó una cuenta cuenta como esa
  // cuenta, aunque ahora no tenga la sesión abierta.
  const conCuenta = usuario.conSesion || !!fila.email;
  const plan = conCuenta ? "gratis" : "anonimo";
  const desde = conCuenta ? (fila.promos_prueba_desde ?? fila.registrado_at ?? fila.created_at) : fila.created_at;
  const hasta = new Date(new Date(desde).getTime() + DIAS_PRUEBA_PROMOS[plan] * DIA_MS);
  return { permitido: Date.now() < hasta.getTime(), plan, hasta: hasta.toISOString() };
}
