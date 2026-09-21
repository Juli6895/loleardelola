import { supabaseAdmin } from "./supabase";

// Lado servidor de la identidad anónima por dispositivo — ver
// lib/device-id.ts para el lado cliente y el porqué de este esquema.

const DEVICE_ID_HEADER = "x-device-id";

// Validación mínima: el device id lo manda el cliente, así que no
// confiamos en él a ciegas. Exigimos formato UUID para no dejar que
// cualquier string arbitrario cree filas en `users`.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Busca la fila de este dispositivo. Si por una carrera quedaran dos,
 * siempre gana la más antigua, para que todos los requests converjan en
 * la misma usuaria y no se parta el clóset entre dos filas. */
async function buscarUsuario(deviceId: string): Promise<string | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("users")
    .select("id")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Resuelve (o crea) el usuario anónimo de este dispositivo y devuelve su
 * id interno. Devuelve null si el header falta o no es un UUID válido.
 *
 * Se hace select → insert → (si falla) select de nuevo, en vez de un
 * upsert con ON CONFLICT: el upsert exige un índice único sobre
 * device_id y esto tiene que funcionar aunque ese índice no esté puesto
 * en la base (ver supabase/schema.sql). El segundo select cubre la
 * carrera de dos requests simultáneos del mismo dispositivo nuevo.
 */
export async function getOrCreateUserId(req: Request): Promise<string | null> {
  const deviceId = req.headers.get(DEVICE_ID_HEADER);
  if (!deviceId || !UUID_RE.test(deviceId)) return null;

  const existente = await buscarUsuario(deviceId);
  if (existente) return existente;

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .insert({ device_id: deviceId })
    .select("id")
    .single();

  if (!error && data?.id) return data.id;

  // Otro request creó la fila entre nuestro select y nuestro insert (o
  // el índice único la rechazó por duplicada): la buscamos de nuevo.
  const reintento = await buscarUsuario(deviceId);
  if (reintento) return reintento;

  console.error("[device-user] no se pudo resolver el usuario:", error);
  return null;
}
