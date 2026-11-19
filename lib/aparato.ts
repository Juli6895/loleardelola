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
