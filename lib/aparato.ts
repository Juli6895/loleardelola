import { supabaseAdmin } from "./supabase";
import { huellaDe } from "./eventos";

// =====================================================================
// Una prueba gratis por aparato
// =====================================================================
// Cada correo nuevo recibía otra prueba gratis, y cada prueba cuesta. Acá
// se averigua qué otras cuentas se han usado en este mismo aparato:
//   - el mismo navegador (device_id): seguro,
//   - la misma huella (conexión + modelo del aparato, ver huellaDe): cubre
//     la ventana privada y los datos borrados. Solo se miran los últimos
//     90 días, porque las conexiones cambian de dueño con el tiempo.
//
// Si algo falla al consultar, se responde "ninguna": es preferible dar
// una prueba de más que negársela a alguien por un error de la app.
// =====================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIAS_HUELLA = 90;

/** Las cuentas con correo, distintas de `userId`, usadas en este aparato. */
export async function otrasCuentasDelAparato(req: Request, userId: string | null): Promise<string[]> {
  const sb = supabaseAdmin();
  const ids = new Set<string>();
  const sumar = (filas: { user_id?: string | null; id?: string | null }[] | null) => {
    for (const f of filas ?? []) {
      const id = f.user_id ?? f.id;
      if (id) ids.add(id);
    }
  };

  const navegador = req.headers.get("x-device-id");
  if (navegador && UUID_RE.test(navegador)) {
    const [eventos, cuentas] = await Promise.all([
      sb.from("eventos").select("user_id").eq("device_id", navegador).not("user_id", "is", null).limit(5000),
      sb.from("users").select("id").eq("device_id", navegador),
    ]);
    sumar(eventos.data);
    sumar(cuentas.data);
  }

  const huella = huellaDe(req);
  if (huella) {
    const desde = new Date(Date.now() - DIAS_HUELLA * 86_400_000).toISOString();
    const { data } = await sb
      .from("eventos")
      .select("user_id")
      .eq("props->>huella", huella)
      .not("user_id", "is", null)
      .gte("created_at", desde)
      .limit(5000);
    sumar(data);
  }

  if (userId) ids.delete(userId);
  if (ids.size === 0) return [];

  const { data: conCorreo } = await sb
    .from("users")
    .select("id")
    .in("id", Array.from(ids))
    .not("email", "is", null);
  return (conCorreo ?? []).map((u) => u.id as string);
}

/**
 * Desde cuándo corre la prueba de promociones en este aparato: la fecha
 * más antigua entre sus otras cuentas. null si es la primera.
 */
export async function pruebaPromosDelAparato(req: Request, userId: string | null): Promise<string | null> {
  const otras = await otrasCuentasDelAparato(req, userId);
  if (otras.length === 0) return null;
  const { data, error } = await supabaseAdmin()
    .from("users")
    .select("promos_prueba_desde, registrado_at, created_at")
    .in("id", otras);
  if (error) return null; // La migración de promos todavía no se corrió.
  const fechas = (data ?? [])
    .map((u) => (u.promos_prueba_desde ?? u.registrado_at ?? u.created_at) as string | null)
    .filter((f): f is string => !!f)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return fechas[0] ?? null;
}

const DIAS_HUELLA_MES = 35;
// Una conexión compartida (wifi de una universidad, datos del celular) junta
// a mucha gente que no se conoce: si la huella aparece en más personas que
// esto, no se usa para sumar búsquedas y solo cuenta el navegador.
const MAX_PERSONAS_POR_HUELLA = 10;

/**
 * Todas las cuentas, con o sin correo, que se han usado en este aparato
 * (el mismo navegador o la misma huella), más la propia. Sirve para contar
 * las búsquedas gratis por celular o computador y no por cuenta.
 */
export async function usuariosDelAparato(req: Request, userId: string): Promise<string[]> {
  const sb = supabaseAdmin();
  const ids = new Set<string>([userId]);

  const navegador = req.headers.get("x-device-id");
  if (navegador && UUID_RE.test(navegador)) {
    const [eventos, cuentas] = await Promise.all([
      sb.from("eventos").select("user_id").eq("device_id", navegador).not("user_id", "is", null).limit(5000),
      sb.from("users").select("id").eq("device_id", navegador),
    ]);
    for (const f of eventos.data ?? []) if (f.user_id) ids.add(f.user_id as string);
    for (const f of cuentas.data ?? []) if (f.id) ids.add(f.id as string);
  }

  const huella = huellaDe(req);
  if (huella) {
    const desde = new Date(Date.now() - DIAS_HUELLA_MES * 86_400_000).toISOString();
    const { data } = await sb
      .from("eventos")
      .select("user_id")
      .eq("props->>huella", huella)
      .not("user_id", "is", null)
      .gte("created_at", desde)
      .limit(5000);
    const mismos = new Set((data ?? []).map((f) => f.user_id as string));
    if (mismos.size <= MAX_PERSONAS_POR_HUELLA) for (const id of Array.from(mismos)) ids.add(id);
  }
  return Array.from(ids);
}
