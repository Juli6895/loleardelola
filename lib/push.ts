import webpush from "web-push";
import { supabaseAdmin } from "./supabase";

// =====================================================================
// Notificaciones al celular (Web Push)
// =====================================================================
// Para los avisos de rebaja. Funciona en Android y en el computador
// desde el navegador, y en iPhone solo con la app instalada (Safari,
// "Agregar a inicio").
//
// Las llaves (VAPID) identifican a LoleardLola ante el servicio de
// notificaciones de cada navegador:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  — va también al navegador
//   VAPID_PRIVATE_KEY             — solo servidor, nunca compartirla
//   VAPID_SUBJECT                 — mailto:contacto@lakaja.co
// Si se cambian, todas las suscripciones viejas dejan de servir.
// =====================================================================

let configurado = false;

function configurar(): boolean {
  if (configurado) return true;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contacto@lakaja.co", publica, privada);
  configurado = true;
  return true;
}

export type Notificacion = {
  titulo: string;
  cuerpo: string;
  // A dónde lleva al tocarla.
  url: string;
  imagen?: string | null;
};

/**
 * Le manda la notificación a todos los celulares y navegadores de la
 * usuaria. Las suscripciones que el navegador dio de baja (404/410) se
 * borran. Devuelve a cuántos llegó.
 */
export async function notificar(userId: string, n: Notificacion): Promise<number> {
  if (!configurar()) {
    console.warn("[push] faltan las llaves VAPID: no se envió nada");
    return 0;
  }
  const sb = supabaseAdmin();
  const { data: subs } = await sb
    .from("suscripciones_push")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  let enviadas = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(n),
        { TTL: 24 * 3600 }
      );
      enviadas++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await sb.from("suscripciones_push").delete().eq("id", s.id);
      } else {
        console.warn("[push] no se pudo enviar:", e?.statusCode ?? e);
      }
    }
  }
  return enviadas;
}
