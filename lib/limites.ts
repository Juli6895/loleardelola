import { supabaseAdmin } from "./supabase";
import { usuarioActual, type UsuarioActual } from "./sesion";
import { esAdmin } from "./admin-correos";
import { contextoDe, registrar } from "./eventos";
import {
  mensajeDeTope,
  mensajeTopeMensual,
  puedeUsar,
  TOPES,
  TOPES_MES_MEMBRESIA,
  type Recurso,
  type UsoMensual,
} from "./planes";

// =====================================================================
// Control de topes del lado servidor
// =====================================================================
// La pantalla también muestra los límites, pero eso es cortesía: quien
// manda es esto. Sin la verificación acá, bastaría con llamar la API a
// mano para saltarse cualquier tope.
//
// Sin membresía, las búsquedas y los outfits se cuentan desde siempre,
// no por mes: "más de 10 búsquedas" es en total. Con membresía los usos
// de la IA tienen tope MENSUAL (ver TOPES_MES_MEMBRESIA): cada uno se
// paga, y una membresía ilimitada no da utilidad.
// =====================================================================

const TABLA: Record<Recurso, string> = {
  busquedas: "searches",
  outfits: "outfits",
  prendasCloset: "closet_items",
};

export type Veredicto =
  | {
      permitido: true;
      usuario: UsuarioActual;
      usadas: number;
      tope: number | null;
      // Ya usó las búsquedas del mes y esta sale de un paquete: hay que
      // descontarla (gastarBusquedaExtra) cuando la búsqueda salga bien.
      usaExtra?: boolean;
    }
  | {
      permitido: false;
      usuario: UsuarioActual | null;
      // Qué mostrarle, ya redactado.
      mensaje: string;
      // "gratis" → ofrecer crear cuenta. "membresia" → ofrecer pagar.
      destrabaCon: "gratis" | "membresia" | null;
      usadas: number;
      tope: number | null;
    };

async function contar(userId: string, recurso: Recurso): Promise<number> {
  const { count } = await supabaseAdmin()
    .from(TABLA[recurso])
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

// ---------------------------------------------------------------------
// Topes mensuales de la membresía
// ---------------------------------------------------------------------
/** El 1 del mes en curso y el del siguiente, a medianoche en Colombia (UTC-5). */
function mesEnCurso(): { inicio: Date; renueva: Date } {
  const ahora = new Date(Date.now() - 5 * 3600_000);
  const y = ahora.getUTCFullYear();
  const m = ahora.getUTCMonth();
  return {
    inicio: new Date(Date.UTC(y, m, 1, 5)),
    renueva: new Date(Date.UTC(y, m + 1, 1, 5)),
  };
}

// De dónde sale cada conteo: lo que tiene tabla propia se cuenta ahí;
// lo demás, por los eventos que se anotan al usarlo.
const ORIGEN_USO: Record<UsoMensual, { tabla: string; evento?: string }> = {
  busquedas: { tabla: "searches" },
  prendasCloset: { tabla: "closet_items" },
  combinaciones: { tabla: "eventos", evento: "combinacion_buscada" },
  manuales: { tabla: "eventos", evento: "manual_generado" },
};

async function usadasDesde(userId: string, uso: UsoMensual, desde: Date | null): Promise<number> {
  const origen = ORIGEN_USO[uso];
  let q = supabaseAdmin()
    .from(origen.tabla)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (origen.evento) q = q.eq("nombre", origen.evento);
  if (desde) q = q.gte("created_at", desde.toISOString());
  const { count } = await q;
  return count ?? 0;
}

/**
 * ¿Le queda de este uso en el mes? Solo aplica a la membresía; la cuenta
 * de administración no tiene tope, para poder probar.
 */
export async function revisarUsoMensual(
  usuario: UsuarioActual,
  uso: UsoMensual
): Promise<{ permitido: true } | { permitido: false; mensaje: string }> {
  if (esAdmin(usuario.email)) return { permitido: true };
  const { inicio, renueva } = mesEnCurso();
  const usadas = await usadasDesde(usuario.id, uso, inicio);
  if (usadas < TOPES_MES_MEMBRESIA[uso]) return { permitido: true };
  return { permitido: false, mensaje: mensajeTopeMensual(uso, renueva) };
}

/** ¿Puede hacer una más de este recurso? */
export async function revisarTope(
  req: Request,
  recurso: Recurso
): Promise<Veredicto> {
  const usuario = await usuarioActual(req);
  if (!usuario) {
    return {
      permitido: false,
      usuario: null,
      mensaje: "No pudimos identificar tu navegador. Recarga la página.",
      destrabaCon: null,
      usadas: 0,
      tope: null,
    };
  }

  // Con membresía, búsquedas y prendas tienen tope mensual (los outfits
  // guardados no cuestan nada, siguen sin tope).
  if (usuario.plan === "membresia" && (recurso === "busquedas" || recurso === "prendasCloset")) {
    const mensual = await revisarUsoMensual(usuario, recurso);
    if (mensual.permitido) return { permitido: true, usuario, usadas: 0, tope: null };
    // Se le acabaron las del mes: si compró un paquete, sale de ahí.
    if (recurso === "busquedas" && (await busquedasExtra(usuario.id)) > 0) {
      return { permitido: true, usuario, usadas: 0, tope: null, usaExtra: true };
    }
    registrar("tope_alcanzado", contextoDe(req, usuario.id), { recurso, plan: usuario.plan });
    return { permitido: false, usuario, mensaje: mensual.mensaje, destrabaCon: null, usadas: 0, tope: TOPES_MES_MEMBRESIA[recurso] };
  }

  const usadas = await contar(usuario.id, recurso);
  const veredicto = puedeUsar(usuario.plan, recurso, usadas);

  if (veredicto.permitido) {
    return { permitido: true, usuario, usadas, tope: veredicto.tope };
  }

  const destrabaCon =
    veredicto.destrabaCon === "gratis" || veredicto.destrabaCon === "membresia"
      ? veredicto.destrabaCon
      : null;
  // Para el tablero: dónde se topan con los límites y de qué plan.
  registrar("tope_alcanzado", contextoDe(req, usuario.id), { recurso, plan: usuario.plan });

  return {
    permitido: false,
    usuario,
    mensaje: mensajeDeTope(recurso, veredicto.tope ?? 0, destrabaCon),
    destrabaCon,
    usadas,
    tope: veredicto.tope,
  };
}

/**
 * ¿Puede buscar combinaciones? Con membresía, sin tope a la vista (solo
 * el freno de seguridad del mes). Sin membresía, un total desde siempre:
 * 1 sin cuenta y 2 con cuenta gratis (TOPES.combinacionesClosetGratis).
 */
export async function puedeVerCombinaciones(
  usuario: UsuarioActual,
  _itemId: string
): Promise<{ permitido: true } | { permitido: false; mensaje: string; destrabaCon: "gratis" | "membresia" | null }> {
  if (usuario.plan === "membresia") {
    const mensual = await revisarUsoMensual(usuario, "combinaciones");
    return mensual.permitido ? mensual : { ...mensual, destrabaCon: null };
  }
  const tope = TOPES[usuario.plan].combinacionesClosetGratis;
  if (tope === null) return { permitido: true };

  const usadas = await usadasDesde(usuario.id, "combinaciones", null);
  if (usadas < tope) return { permitido: true };

  const cuantas = tope === 1 ? "tu combinación gratis" : `tus ${tope} combinaciones gratis`;
  if (usuario.plan === "anonimo") {
    return {
      permitido: false,
      mensaje: `Ya usaste ${cuantas}. Crea tu cuenta gratis y tienes ${TOPES.gratis.combinacionesClosetGratis}, o con la membresía, sin tope.`,
      destrabaCon: "gratis",
    };
  }
  return {
    permitido: false,
    mensaje: `Ya usaste ${cuantas}. Con la membresía buscas combinaciones sin tope.`,
    destrabaCon: "membresia",
  };
}

/**
 * Las búsquedas de paquete que le quedan. 0 si no ha comprado o si la
 * columna todavía no existe (falta correr la migración de paquetes).
 */
export async function busquedasExtra(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from("users")
    .select("busquedas_extra")
    .eq("id", userId)
    .maybeSingle();
  if (error) return 0;
  return Number((data as any)?.busquedas_extra) || 0;
}

/**
 * Descuenta una búsqueda de paquete. Solo resta si el saldo sigue siendo
 * el que se leyó: si dos búsquedas llegan a la vez, la segunda vuelve a
 * leer y resta sobre el valor nuevo, en vez de pisarlo.
 */
export async function gastarBusquedaExtra(userId: string): Promise<void> {
  const sb = supabaseAdmin();
  for (let intento = 0; intento < 3; intento++) {
    const actual = await busquedasExtra(userId);
    if (actual <= 0) return;
    const { data } = await sb
      .from("users")
      .update({ busquedas_extra: actual - 1 })
      .eq("id", userId)
      .eq("busquedas_extra", actual)
      .select("id");
    if (data && data.length > 0) return;
  }
}

/** Cuántas búsquedas del mes lleva y cuántas de paquete le quedan. */
export async function saldoDeBusquedas(usuario: UsuarioActual) {
  const { inicio } = mesEnCurso();
  const [usadas, extra] = await Promise.all([
    usadasDesde(usuario.id, "busquedas", inicio),
    busquedasExtra(usuario.id),
  ]);
  return { usadasDelMes: usadas, topeDelMes: TOPES_MES_MEMBRESIA.busquedas, extra };
}

/**
 * Deja registrada una búsqueda. Antes solo se guardaba al guardar el
 * outfit, así que analizar fotos sin guardarlas no contaba para nada —
 * y es justo lo que hay que contar.
 */
export async function registrarBusqueda(
  userId: string,
  terminos: string[]
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("searches")
    .insert({ user_id: userId, search_terms: terminos.slice(0, 10) });
  if (error) {
    // Que no se pueda contar la búsqueda no es razón para negarle el
    // resultado a la usuaria: se anota y se sigue.
    console.warn("[limites] no se pudo registrar la búsqueda:", error.message);
  }
}
