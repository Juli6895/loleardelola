import { supabaseAdmin } from "./supabase";
import { registrar } from "./eventos";
import { enviarAlertaBusquedas } from "./email";
import { CORREO_ALERTAS } from "./admin-correos";
import { mesEnCurso } from "./limites";

// =====================================================================
// Alerta de búsquedas del mes
// =====================================================================
// Con las búsquedas ilimitadas para quien paga y 30 al mes gratis por
// aparato, cada búsqueda cuesta unos $5 a $13 (Claude). Si el uso se
// dispara —una campaña que funciona, o una máquina buscando— conviene
// enterarse el mismo día y no al revisar el tablero.
//
// Cuando el total de búsquedas del mes (de todas las personas, hora de
// Colombia) llega a ALERTA_BUSQUEDAS_MES se manda UN correo, una sola vez
// por mes. Se revisa después de cada búsqueda: es una sola consulta de
// conteo, y no depende de que corra un cron.
// =====================================================================

export const ALERTA_BUSQUEDAS_MES = 16000;

/**
 * Revisa el total del mes y avisa por correo si llegó al límite. Nunca
 * falla ni frena la búsqueda: si algo sale mal, se anota y se sigue.
 */
export async function revisarAlertaBusquedas(): Promise<void> {
  // Las pruebas en un computador usan la misma base de datos: no deben
  // mandar correos de verdad.
  if (process.env.VERCEL_ENV !== "production") return;
  try {
    const sb = supabaseAdmin();
    const { inicio } = mesEnCurso();
    const desde = inicio.toISOString();

    // Guardar un outfit también deja una fila en searches (con outfit_id):
    // esa no es una búsqueda.
    const { count } = await sb
      .from("searches")
      .select("id", { count: "exact", head: true })
      .is("outfit_id", null)
      .gte("created_at", desde);
    const total = count ?? 0;
    if (total < ALERTA_BUSQUEDAS_MES) return;

    const { count: avisos } = await sb
      .from("eventos")
      .select("id", { count: "exact", head: true })
      .eq("nombre", "alerta_busquedas")
      .gte("created_at", desde);
    if ((avisos ?? 0) > 0) return;

    // Solo se da por avisado si el correo salió: si falla, la próxima
    // búsqueda lo intenta otra vez.
    const r = await enviarAlertaBusquedas(CORREO_ALERTAS, { total, umbral: ALERTA_BUSQUEDAS_MES });
    if (!r.enviado) {
      console.error("[alertas] no se pudo enviar la alerta de búsquedas:", r.motivo, r.detalle ?? "");
      return;
    }
    await registrar("alerta_busquedas", {}, { total, umbral: ALERTA_BUSQUEDAS_MES });
  } catch (e) {
    console.warn("[alertas] no se pudo revisar la alerta de búsquedas:", e);
  }
}
