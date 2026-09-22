import crypto from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";
import { getOrCreateUserId } from "./device-user";
import { planDe, type Plan } from "./planes";

// =====================================================================
// Sesiones y códigos de ingreso
// =====================================================================
// No hay contraseña: la usuaria escribe su correo, le llega un código
// de 6 dígitos y entra. Ver supabase/schema.sql para las tablas.
//
// Tanto el código como el token de sesión se guardan HASHEADOS. En la
// base no queda nada que sirva para entrar: el código vive en el correo
// de la usuaria y el token en la cookie de su navegador.
// =====================================================================

const COOKIE = "lola_sesion";
const DIAS_DE_SESION = 60;
const MINUTOS_DE_CODIGO = 15;
const MAX_INTENTOS = 5;
// Un código nuevo por minuto y máximo 6 por hora al mismo correo. Sin
// esto, cualquiera podría usar la app para bombardear un buzón ajeno.
const SEGUNDOS_ENTRE_ENVIOS = 60;
const MAX_ENVIOS_POR_HORA = 6;

const hash = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

export function normalizarCorreo(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const correo = valor.trim().toLowerCase();
  // Validación deliberadamente simple: lo que de verdad comprueba que
  // el correo existe es que le llegue el código.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return null;
  if (correo.length > 254) return null;
  return correo;
}

/** Código de 6 dígitos con aleatoriedad criptográfica, no Math.random. */
function generarCodigo(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export type ResultadoEnvio =
  | { ok: true; codigo: string; expiraEn: number }
  | { ok: false; motivo: string };

/** Crea un código para ese correo y lo devuelve para poder enviarlo. */
export async function crearCodigo(correo: string): Promise<ResultadoEnvio> {
  const sb = supabaseAdmin();
  const haceUnaHora = new Date(Date.now() - 3600_000).toISOString();

  const { data: recientes } = await sb
    .from("login_codes")
    .select("created_at")
    .eq("email", correo)
    .gte("created_at", haceUnaHora)
    .order("created_at", { ascending: false });

  if (recientes && recientes.length >= MAX_ENVIOS_POR_HORA) {
    return { ok: false, motivo: "Pediste muchos códigos. Espera una hora." };
  }
  if (recientes?.[0]) {
    const desde = (Date.now() - new Date(recientes[0].created_at).getTime()) / 1000;
    if (desde < SEGUNDOS_ENTRE_ENVIOS) {
      const faltan = Math.ceil(SEGUNDOS_ENTRE_ENVIOS - desde);
      return { ok: false, motivo: `Espera ${faltan} segundos para pedir otro código.` };
    }
  }

  const codigo = generarCodigo();
  const { error } = await sb.from("login_codes").insert({
    email: correo,
    code_hash: hash(codigo),
    expires_at: new Date(Date.now() + MINUTOS_DE_CODIGO * 60_000).toISOString(),
  });
  if (error) return { ok: false, motivo: error.message };

  return { ok: true, codigo, expiraEn: MINUTOS_DE_CODIGO };
}

/**
 * Valida el código y deja la sesión abierta.
 *
 * El paso delicado es unir identidades. La usuaria venía usando la app
 * sin cuenta, con su clóset y sus outfits colgando del id de su
 * navegador. Si ese correo ya tenía cuenta desde otro dispositivo, hay
 * DOS filas y hay que fundirlas sin perderle nada a ninguna.
 */
export async function verificarCodigo(
  req: Request,
  correo: string,
  codigo: string
): Promise<{ ok: true; userId: string } | { ok: false; motivo: string }> {
  const sb = supabaseAdmin();

  const { data: fila } = await sb
    .from("login_codes")
    .select("id, code_hash, expires_at, attempts, used_at")
    .eq("email", correo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!fila) return { ok: false, motivo: "Pide un código primero." };
  if (fila.used_at) return { ok: false, motivo: "Ese código ya se usó. Pide uno nuevo." };
  if (new Date(fila.expires_at) < new Date()) {
    return { ok: false, motivo: "El código venció. Pide uno nuevo." };
  }
  if (fila.attempts >= MAX_INTENTOS) {
    return { ok: false, motivo: "Demasiados intentos. Pide un código nuevo." };
  }
  if (fila.code_hash !== hash(codigo.trim())) {
    await sb
      .from("login_codes")
      .update({ attempts: fila.attempts + 1 })
      .eq("id", fila.id);
    return { ok: false, motivo: "Ese código no es. Revísalo." };
  }

  await sb
    .from("login_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", fila.id);

  const userId = await unirIdentidades(req, correo);
  if (!userId) return { ok: false, motivo: "No pudimos abrir tu cuenta." };

  await abrirSesion(userId);
  return { ok: true, userId };
}

async function unirIdentidades(req: Request, correo: string): Promise<string | null> {
  const sb = supabaseAdmin();
  const idDispositivo = await getOrCreateUserId(req);

  const { data: porCorreo } = await sb
    .from("users")
    .select("id")
    .eq("email", correo)
    .maybeSingle();

  // Caso 1: el correo es nuevo. La fila que ya venía usando se queda
  // como está y solo se le pone el correo — así no pierde nada.
  if (!porCorreo) {
    if (!idDispositivo) return null;
    await sb.from("users").update({ email: correo }).eq("id", idDispositivo);
    return idDispositivo;
  }

  // Caso 2: ya tenía cuenta y es este mismo navegador.
  if (!idDispositivo || porCorreo.id === idDispositivo) return porCorreo.id;

  // Caso 3: ya tenía cuenta desde otro lado. Lo que hizo en este
  // navegador sin identificarse se pasa a la cuenta de verdad, y la
  // fila anónima se elimina. El orden importa: primero se mueve todo,
  // y solo al final se borra, para que un fallo a mitad de camino no
  // deje el clóset sin dueña.
  for (const tabla of ["closet_items", "outfits", "searches"] as const) {
    await sb.from(tabla).update({ user_id: porCorreo.id }).eq("user_id", idDispositivo);
  }
  const { data: dispositivo } = await sb
    .from("users")
    .select("device_id")
    .eq("id", idDispositivo)
    .maybeSingle();
  // El device_id es único: hay que soltarlo de la fila vieja antes de
  // ponerlo en la nueva.
  await sb.from("users").update({ device_id: null }).eq("id", idDispositivo);
  if (dispositivo?.device_id) {
    await sb
      .from("users")
      .update({ device_id: dispositivo.device_id })
      .eq("id", porCorreo.id);
  }
  await sb.from("users").delete().eq("id", idDispositivo);
  return porCorreo.id;
}

async function abrirSesion(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + DIAS_DE_SESION * 86400_000);
  await supabaseAdmin().from("sessions").insert({
    token_hash: hash(token),
    user_id: userId,
    expires_at: expira.toISOString(),
  });
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expira,
  });
}

export async function cerrarSesion() {
  const token = cookies().get(COOKIE)?.value;
  if (token) {
    await supabaseAdmin().from("sessions").delete().eq("token_hash", hash(token));
  }
  cookies().delete(COOKIE);
}

export type UsuarioActual = {
  id: string;
  email: string | null;
  premiumUntil: string | null;
  plan: Plan;
  // true si entró con su correo; false si solo es este navegador.
  conSesion: boolean;
};

/**
 * Quién está usando la app ahora. Primero mira la sesión; si no hay,
 * cae en la identidad anónima del navegador, que es como funcionaba
 * todo hasta ahora.
 */
export async function usuarioActual(req: Request): Promise<UsuarioActual | null> {
  const sb = supabaseAdmin();
  const token = cookies().get(COOKIE)?.value;

  if (token) {
    const { data: sesion } = await sb
      .from("sessions")
      .select("user_id, expires_at")
      .eq("token_hash", hash(token))
      .maybeSingle();

    if (sesion && new Date(sesion.expires_at) > new Date()) {
      const { data: u } = await sb
        .from("users")
        .select("id, email, premium_until")
        .eq("id", sesion.user_id)
        .maybeSingle();
      if (u) {
        return {
          id: u.id,
          email: u.email,
          premiumUntil: u.premium_until,
          plan: planDe(u),
          conSesion: true,
        };
      }
    }
  }

  const idDispositivo = await getOrCreateUserId(req);
  if (!idDispositivo) return null;
  const { data: u } = await sb
    .from("users")
    .select("id, email, premium_until")
    .eq("id", idDispositivo)
    .maybeSingle();
  if (!u) return null;

  return {
    id: u.id,
    // Sin sesión abierta no se reporta el correo aunque la fila lo
    // tenga: tener el navegador no prueba ser la dueña del buzón.
    email: null,
    premiumUntil: u.premium_until,
    plan: planDe({ email: null, premium_until: u.premium_until }),
    conSesion: false,
  };
}
