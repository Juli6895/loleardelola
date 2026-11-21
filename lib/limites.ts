import { supabaseAdmin } from "./supabase";
import { usuarioActual, type UsuarioActual } from "./sesion";
import { esAdmin } from "./admin-correos";
import { contextoDe, registrar } from "./eventos";
import { otrasCuentasDelAparato, usuariosDelAparato } from "./aparato";
import {
  BUSQUEDAS_MES_SIN_MEMBRESIA,
  CUPOS_MEMBRESIA,
  ME_GUSTA_ANTERIOR,
  mensajeBusquedasGratis,
  mensajeCupo,
  mensajeDeTope,
  mensajeTopeMensual,
  PAQUETES_BUSQUEDAS,
  periodoActual,
  puedeUsar,
  TOPES,
  TOPES_MES_MEMBRESIA,
  type PeriodoMembresia,
  type Recurso,
  type UsoMembresia,
  type UsoMensual,
} from "./planes";

// =====================================================================
// Control de topes del lado servidor
// =====================================================================
// La pantalla también muestra los límites, pero eso es cortesía: quien
// manda es esto. Sin la verificación acá, bastaría con llamar la API a
// mano para saltarse cualquier tope.
//
// Sin membresía, lo usado se cuenta desde siempre. Con membresía, cada
// pago abre sus cupos (CUPOS_MEMBRESIA). Quien pagó antes del cambio
// conserva sus condiciones hasta que se le venza lo pagado.
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
// Una prueba gratis por aparato (ver lib/aparato.ts)
// ---------------------------------------------------------------------
const MENSAJE_PRUEBA_USADA =
  "La prueba gratis ya se usó en este aparato. Con la membresía tienes mucho más cada mes.";

// Las prendas y los outfits se pueden borrar: el evento queda aunque la
// fila ya no exista.
const EVENTO_DE_USO: Partial<Record<Recurso, string>> = {
  prendasCloset: "prenda_subida",
  outfits: "outfit_guardado",
};

async function usadasEnCuentas(ids: string[], recurso: Recurso): Promise<number> {
  const sb = supabaseAdmin();
  const { count } = await sb
    .from(TABLA[recurso])
    .select("id", { count: "exact", head: true })
    .in("user_id", ids);
  const evento = EVENTO_DE_USO[recurso];
  if (!evento) return count ?? 0;
  const { count: veces } = await sb
    .from("eventos")
    .select("id", { count: "exact", head: true })
    .eq("nombre", evento)
    .in("user_id", ids);
  return Math.max(count ?? 0, veces ?? 0);
}

// ---------------------------------------------------------------------
// Topes mensuales de la membresía
// ---------------------------------------------------------------------
/** El 1 del mes en curso y el del siguiente, a medianoche en Colombia (UTC-5). */
export function mesEnCurso(): { inicio: Date; renueva: Date } {
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
  // Guardar un outfit también deja una fila en searches: esa no es una
  // búsqueda nueva y no debe gastar cupo.
  if (uso === "busquedas") q = q.is("outfit_id", null);
  if (desde) q = q.gte("created_at", desde.toISOString());
  const { count } = await q;
  return count ?? 0;
}

// ---------------------------------------------------------------------
// Cupos de cada membresía pagada
// ---------------------------------------------------------------------
/** La membresía que está corriendo, según sus pagos acreditados. */
export async function periodoDe(userId: string): Promise<PeriodoMembresia | null> {
  const { data } = await supabaseAdmin()
    .from("pagos")
    .select("plan, acreditado_at")
    .eq("user_id", userId)
    .eq("estado", "acreditado")
    .in("plan", ["mensual", "anual"]);
  return periodoActual(data ?? []);
}

async function eventosDesde(userId: string, nombre: string, desde: Date, fuente?: string): Promise<number> {
  let q = supabaseAdmin()
    .from("eventos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("nombre", nombre)
    .gte("created_at", desde.toISOString());
  if (fuente) q = q.eq("props->>fuente", fuente);
  const { count } = await q;
  return count ?? 0;
}

async function usadasEnPeriodo(userId: string, uso: UsoMembresia, periodo: PeriodoMembresia): Promise<number> {
  switch (uso) {
    case "outfits":
      return contar(userId, "outfits");
    case "meGusta": {
      const { count } = await supabaseAdmin()
        .from("seguimientos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("activo", true);
      return count ?? 0;
    }
    case "personalidadFoto":
      return eventosDesde(userId, "personalidad_calculada", periodo.inicio, "foto");
    case "personalidadReferencia":
      return eventosDesde(userId, "personalidad_calculada", periodo.inicio, "referencia");
    case "prendasCloset":
      // Borrar una prenda no devuelve el cupo: el análisis ya se pagó.
      return Math.max(
        await usadasDesde(userId, uso, periodo.inicio),
        await eventosDesde(userId, "prenda_subida", periodo.inicio)
      );
    default:
      return usadasDesde(userId, uso, periodo.inicio);
  }
}

/** Las condiciones de quien pagó antes de los cupos nuevos. */
async function revisarCondicionAnterior(
  usuario: UsuarioActual,
  uso: UsoMembresia
): Promise<{ permitido: true } | { permitido: false; mensaje: string; tope: number }> {
  if (uso === "meGusta") {
    const { count } = await supabaseAdmin()
      .from("seguimientos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", usuario.id)
      .eq("activo", true);
    if ((count ?? 0) < ME_GUSTA_ANTERIOR) return { permitido: true };
    return {
      permitido: false,
      mensaje: `Ya sigues ${ME_GUSTA_ANTERIOR} prendas. Deja de seguir alguna en Mis outfits para agregar otra.`,
      tope: ME_GUSTA_ANTERIOR,
    };
  }
  // Las búsquedas ya no tienen tope para nadie con membresía, tampoco para
  // quien pagó antes de los cupos nuevos.
  if (uso === "busquedas") return { permitido: true };
  if (!(uso in TOPES_MES_MEMBRESIA)) return { permitido: true };
  const mensual = uso as UsoMensual;
  const { inicio, renueva } = mesEnCurso();
  const usadas = await usadasDesde(usuario.id, mensual, inicio);
  const tope = TOPES_MES_MEMBRESIA[mensual];
  if (usadas < tope) return { permitido: true };
  return { permitido: false, mensaje: mensajeTopeMensual(mensual, renueva), tope };
}

/**
 * ¿Le queda de este uso en su membresía? La cuenta de administración no
 * tiene tope, para poder probar.
 */
export async function revisarCupo(
  usuario: UsuarioActual,
  uso: UsoMembresia
): Promise<{ permitido: true } | { permitido: false; mensaje: string; tope: number }> {
  if (esAdmin(usuario.email)) return { permitido: true };
  const periodo = await periodoDe(usuario.id);
  if (!periodo || periodo.anterior) return revisarCondicionAnterior(usuario, uso);
  const tope = CUPOS_MEMBRESIA[periodo.plan][uso];
  if (tope === null) return { permitido: true };
  if ((await usadasEnPeriodo(usuario.id, uso, periodo)) < tope) return { permitido: true };
  return { permitido: false, mensaje: mensajeCupo(uso, tope, periodo.fin), tope };
}

/**
 * Las búsquedas gratis del mes, sumadas entre todas las cuentas de este
 * celular o computador. Guardar un outfit también deja una fila en searches
 * (con outfit_id): esa no es una búsqueda nueva. Si la consulta falla se
 * deja pasar: mejor una búsqueda de más que negarla por un error de la app.
 */
async function revisarBusquedasGratis(req: Request, usuario: UsuarioActual): Promise<Veredicto> {
  const ids = await usuariosDelAparato(req, usuario.id);
  const { inicio, renueva } = mesEnCurso();
  const { count } = await supabaseAdmin()
    .from("searches")
    .select("id", { count: "exact", head: true })
    .in("user_id", ids)
    .is("outfit_id", null)
    .gte("created_at", inicio.toISOString());
  const usadas = count ?? 0;
  if (usadas < BUSQUEDAS_MES_SIN_MEMBRESIA) {
    return { permitido: true, usuario, usadas, tope: BUSQUEDAS_MES_SIN_MEMBRESIA };
  }
  registrar("tope_alcanzado", contextoDe(req, usuario.id), { recurso: "busquedas", plan: usuario.plan, motivo: "mes" });
  return {
    permitido: false,
    usuario,
    mensaje: mensajeBusquedasGratis(renueva),
    destrabaCon: "membresia",
    usadas,
    tope: BUSQUEDAS_MES_SIN_MEMBRESIA,
  };
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

  // La cuenta de administración no tiene tope, para poder probar.
  if (esAdmin(usuario.email)) return { permitido: true, usuario, usadas: 0, tope: null };

  if (usuario.plan === "membresia") {
    const cupo = await revisarCupo(usuario, recurso);
    if (cupo.permitido) return { permitido: true, usuario, usadas: 0, tope: null };
    // Se le acabaron las de su membresía: si compró un paquete, sale de ahí.
    if (recurso === "busquedas" && (await busquedasExtra(usuario.id)) > 0) {
      return { permitido: true, usuario, usadas: 0, tope: null, usaExtra: true };
    }
    registrar("tope_alcanzado", contextoDe(req, usuario.id), { recurso, plan: usuario.plan });
    return { permitido: false, usuario, mensaje: cupo.mensaje, destrabaCon: null, usadas: 0, tope: cupo.tope };
  }

  // Sin membresía las búsquedas son gratis hasta BUSQUEDAS_MES_SIN_MEMBRESIA
  // al mes, por celular o computador (con o sin cuenta).
  if (recurso === "busquedas") return revisarBusquedasGratis(req, usuario);

  const usadas = await contar(usuario.id, recurso);
  const veredicto = puedeUsar(usuario.plan, recurso, usadas);

  if (veredicto.permitido) {
    // Le queda en esta cuenta, pero la prueba gratis es una por aparato.
    if (usuario.plan === "gratis" && veredicto.tope !== null) {
      const otras = await otrasCuentasDelAparato(req, usuario.id);
      if (otras.length > 0 && usadas + (await usadasEnCuentas(otras, recurso)) >= veredicto.tope) {
        registrar("tope_alcanzado", contextoDe(req, usuario.id), { recurso, plan: usuario.plan, motivo: "aparato" });
        return {
          permitido: false,
          usuario,
          mensaje: MENSAJE_PRUEBA_USADA,
          destrabaCon: "membresia",
          usadas,
          tope: veredicto.tope,
        };
      }
    }
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
 * ver TOPES.combinacionesClosetGratis (0 sin cuenta, 1 con cuenta gratis).
 */
export async function puedeVerCombinaciones(
  req: Request,
  usuario: UsuarioActual,
  _itemId: string
): Promise<{ permitido: true } | { permitido: false; mensaje: string; destrabaCon: "gratis" | "membresia" | null }> {
  if (esAdmin(usuario.email)) return { permitido: true };
  if (usuario.plan === "membresia") {
    const cupo = await revisarCupo(usuario, "combinaciones");
    return cupo.permitido ? cupo : { permitido: false, mensaje: cupo.mensaje, destrabaCon: null };
  }
  const tope = TOPES[usuario.plan].combinacionesClosetGratis;
  if (tope === null) return { permitido: true };
  if (tope === 0) {
    return { permitido: false, mensaje: "Buscar combinaciones es parte de la membresía.", destrabaCon: "membresia" };
  }

  const usadas = await usadasDesde(usuario.id, "combinaciones", null);
  if (usadas < tope) {
    if (usuario.plan !== "gratis") return { permitido: true };
    const otras = await otrasCuentasDelAparato(req, usuario.id);
    if (otras.length === 0) return { permitido: true };
    const { count } = await supabaseAdmin()
      .from("eventos")
      .select("id", { count: "exact", head: true })
      .eq("nombre", "combinacion_buscada")
      .in("user_id", otras);
    if (usadas + (count ?? 0) < tope) return { permitido: true };
    return { permitido: false, mensaje: MENSAJE_PRUEBA_USADA, destrabaCon: "membresia" };
  }

  const cuantas = tope === 1 ? "tu combinación gratis" : `tus ${tope} combinaciones gratis`;
  if (usuario.plan === "anonimo" && tope === 0) {
    return {
      permitido: false,
      mensaje: "Para buscar combinaciones, crea tu cuenta gratis con tu correo.",
      destrabaCon: "gratis",
    };
  }
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
 * Las búsquedas de paquete que le quedan en la membresía que está
 * corriendo: lo comprado en ese periodo menos lo gastado. Se vencen con
 * ella.
 */
export async function busquedasExtra(userId: string, periodo?: PeriodoMembresia | null): Promise<number> {
  const vigente = periodo === undefined ? await periodoDe(userId) : periodo;
  if (!vigente) return 0;
  const { data } = await supabaseAdmin()
    .from("pagos")
    .select("plan")
    .eq("user_id", userId)
    .eq("estado", "acreditado")
    .in("plan", Object.keys(PAQUETES_BUSQUEDAS))
    .gte("acreditado_at", vigente.inicio.toISOString())
    .lt("acreditado_at", vigente.fin.toISOString());
  const compradas = (data ?? []).reduce(
    (total, p) => total + (PAQUETES_BUSQUEDAS[p.plan as keyof typeof PAQUETES_BUSQUEDAS]?.busquedas ?? 0),
    0
  );
  if (compradas === 0) return 0;
  const gastadas = await eventosDesde(userId, "busqueda_paquete_usada", vigente.inicio);
  return Math.max(compradas - gastadas, 0);
}

/** Descuenta una búsqueda de paquete. */
export async function gastarBusquedaExtra(userId: string): Promise<void> {
  await registrar("busqueda_paquete_usada", { userId });
}

/** Cuántas búsquedas lleva, cuántas tiene y cuántas de paquete le quedan. */
export async function saldoDeBusquedas(usuario: UsuarioActual) {
  const periodo = await periodoDe(usuario.id);
  const extra = await busquedasExtra(usuario.id, periodo);
  if (!periodo || periodo.anterior) {
    const { inicio } = mesEnCurso();
    return {
      usadas: await usadasDesde(usuario.id, "busquedas", inicio),
      tope: null as number | null,
      extra,
      alMes: true,
      vence: null as string | null,
    };
  }
  return {
    usadas: await usadasDesde(usuario.id, "busquedas", periodo.inicio),
    tope: CUPOS_MEMBRESIA[periodo.plan].busquedas,
    extra,
    alMes: false,
    vence: periodo.fin.toISOString() as string | null,
  };
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
