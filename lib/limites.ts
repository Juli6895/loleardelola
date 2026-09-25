import { supabaseAdmin } from "./supabase";
import { usuarioActual, type UsuarioActual } from "./sesion";
import { mensajeDeTope, puedeUsar, TOPES, type Recurso } from "./planes";

// =====================================================================
// Control de topes del lado servidor
// =====================================================================
// La pantalla también muestra los límites, pero eso es cortesía: quien
// manda es esto. Sin la verificación acá, bastaría con llamar la API a
// mano para saltarse cualquier tope.
//
// Las búsquedas y los outfits se cuentan desde siempre, no por mes. Es
// lo que se acordó: "más de 10 búsquedas" es en total, no mensuales.
// Si algún día se quiere por mes, se le agrega un filtro de fecha al
// contador y nada más cambia.
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
): Promise<{ permitido: true } | { permitido: false; mensaje: string; destrabaCon: "membresia" }> {
  const tope = TOPES[usuario.plan].combinacionesClosetGratis;
  if (tope === null) return { permitido: true };

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
    mensaje: `Buscar combinaciones es gratis en tus primeras ${tope} prendas. Con la membresía no tienes tope.`,
    destrabaCon: "membresia",
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
