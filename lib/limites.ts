import { supabaseAdmin } from "./supabase";
import { usuarioActual, type UsuarioActual } from "./sesion";
import { esAdmin } from "./admin-correos";
import {
  COMBINACIONES_GRATIS_TOTAL,
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
  | { permitido: true; usuario: UsuarioActual; usadas: number; tope: number | null }
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
// "fotosOutfit" no tiene tope propio: va atado a las combinaciones (ver
// puedeVerFotoDelOutfit).
type Conteo = UsoMensual | "fotosOutfit";

const ORIGEN_USO: Record<Conteo, { tabla: string; evento?: string }> = {
  busquedas: { tabla: "searches" },
  prendasCloset: { tabla: "closet_items" },
  combinaciones: { tabla: "eventos", evento: "combinacion_buscada" },
  fotosOutfit: { tabla: "eventos", evento: "outfit_foto_generada" },
  manuales: { tabla: "eventos", evento: "manual_generado" },
};

async function usadasDesde(userId: string, uso: Conteo, desde: Date | null): Promise<number> {
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
 * ¿Puede buscar combinaciones para ESTA prenda del clóset?
 *
 * A diferencia de los demás topes, este no cuenta VECES usado (buscar
 * combinaciones para la misma prenda dos veces no debería contar
 * doble): cuenta CUÁLES prendas califican. Sin membresía, solo las
 * primeras `combinacionesClosetGratis` que subió, por fecha — así
 * queda claro cuáles son "las gratis" aunque después borre y suba
 * otras.
 */
export async function puedeVerCombinaciones(
  usuario: UsuarioActual,
  itemId: string
): Promise<{ permitido: true } | { permitido: false; mensaje: string; destrabaCon: "membresia" | null }> {
  if (usuario.plan === "membresia") {
    const mensual = await revisarUsoMensual(usuario, "combinaciones");
    return mensual.permitido ? mensual : { ...mensual, destrabaCon: null };
  }
  const tope = TOPES[usuario.plan].combinacionesClosetGratis;
  if (tope === null) return { permitido: true };

  // Además de cuáles prendas califican, un tope total: si no, se podría
  // buscar sin fin sobre esas mismas prendas, y cada búsqueda cuesta.
  if ((await usadasDesde(usuario.id, "combinaciones", null)) >= COMBINACIONES_GRATIS_TOTAL) {
    return {
      permitido: false,
      mensaje: `Ya usaste tus ${COMBINACIONES_GRATIS_TOTAL} combinaciones gratis. Con la membresía tienes ${TOPES_MES_MEMBRESIA.combinaciones} al mes.`,
      destrabaCon: "membresia",
    };
  }

  const { data: primeras } = await supabaseAdmin()
    .from("closet_items")
    .select("id")
    .eq("user_id", usuario.id)
    .order("created_at", { ascending: true })
    .limit(tope);

  const permitido = (primeras ?? []).some((p) => p.id === itemId);
  if (permitido) return { permitido: true };

  return {
    permitido: false,
    mensaje: `Buscar combinaciones es gratis en tus primeras ${tope} prendas. Con la membresía tienes ${TOPES_MES_MEMBRESIA.combinaciones} al mes, en todas.`,
    destrabaCon: "membresia",
  };
}

/**
 * ¿Puede pedir la foto del outfit armado? Una foto por cada combinación
 * buscada: la foto no se cobra aparte, va incluida en la combinación,
 * pero tampoco se puede pedir sin fin para el mismo outfit. Con
 * membresía se cuenta en el mes; sin ella, desde siempre. Solo con
 * cuenta: es lo que más cuesta y sin correo se repetiría borrando los
 * datos del navegador.
 */
export async function puedeVerFotoDelOutfit(
  usuario: UsuarioActual
): Promise<{ permitido: true } | { permitido: false; mensaje: string }> {
  if (esAdmin(usuario.email)) return { permitido: true };
  if (!usuario.conSesion) {
    return { permitido: false, mensaje: "Crea tu cuenta gratis y te mostramos el outfit armado en foto." };
  }
  const desde = usuario.plan === "membresia" ? mesEnCurso().inicio : null;
  const [fotos, combinaciones] = await Promise.all([
    usadasDesde(usuario.id, "fotosOutfit", desde),
    usadasDesde(usuario.id, "combinaciones", desde),
  ]);
  if (fotos < combinaciones) return { permitido: true };
  return { permitido: false, mensaje: "Ya armamos la foto de este outfit." };
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
