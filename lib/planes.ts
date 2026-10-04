// =====================================================================
// Qué puede hacer cada quien
// =====================================================================
// Los tres niveles y sus topes, en un solo lugar. Antes el límite del
// clóset estaba escrito como 15 en dos archivos distintos, y cambiarlo
// obligaba a acordarse de los dos.
//
// Los números son de producto, no técnicos: si Juliana quiere mover un
// tope, se cambia acá y aplica en la API y en la pantalla a la vez.
// =====================================================================

export type Plan = "anonimo" | "gratis" | "membresia";

export type Topes = {
  busquedas: number | null;
  outfits: number | null;
  prendasCloset: number | null;
  manualDeEstilo: boolean;
  // Cuántas de las PRIMERAS prendas subidas al clóset (por orden de
  // fecha) dejan usar "Buscar combinaciones". No es un conteo de veces
  // usado (eso se podría repetir sin límite en esas prendas): es cuáles
  // prendas califican. null = cualquier prenda, sin límite.
  combinacionesClosetGratis: number | null;
};

// null = sin tope.
export const TOPES: Record<Plan, Topes> = {
  // Sin cuenta: alcanza para probar la app de verdad antes de pedirle
  // el correo a nadie.
  anonimo: {
    busquedas: 10,
    outfits: 5,
    prendasCloset: 2,
    manualDeEstilo: false,
    combinacionesClosetGratis: 2,
  },
  // Con cuenta gratis: un poco más, a cambio del correo.
  gratis: {
    busquedas: 15,
    outfits: 10,
    prendasCloset: 2,
    manualDeEstilo: false,
    combinacionesClosetGratis: 2,
  },
  membresia: {
    busquedas: null,
    outfits: null,
    prendasCloset: null,
    manualDeEstilo: true,
    combinacionesClosetGratis: null,
  },
};

// Cada uso de la IA cuesta (en pesos, con el dólar a ~$4.000): una
// búsqueda por foto ~$160; una prenda al clóset ~$345 (su foto de
// catálogo con Gemini ~$275 + Claude leyéndola); una combinación ~$405
// (Claude ~$125 + la foto del outfit con Gemini ~$280); un manual ~$280.
// Con los límites de TOPES_MES_MEMBRESIA, una usuaria que lo use TODO
// hasta el tope cuesta ~$8.500 al mes, y la membresía deja ~$13.500
// (mensual) o ~$9.500 al mes (anual) después de la comisión de Bold: hay
// utilidad incluso en el peor caso.
//
// El anual sale a ~$9.900 por mes (33% menos que mes a mes). Bold cobra
// un fijo de $900 por transacción, así que un solo cobro al año deja
// más que doce cobros mensuales.
export const PRECIOS = {
  mensual: 14900,
  anual: 119000,
} as const;

// ---------------------------------------------------------------------
// Límites mensuales de la membresía
// ---------------------------------------------------------------------
// La membresía no es ilimitada: cada uso de la IA se paga. Se cuentan
// desde el día 1 de cada mes (hora de Colombia) y se renuevan solos.
export type UsoMensual =
  | "busquedas"
  | "prendasCloset"
  | "combinaciones"
  | "manuales";

export const TOPES_MES_MEMBRESIA: Record<UsoMensual, number> = {
  busquedas: 12,
  // Cada prenda nueva lleva su foto de catálogo hecha con Gemini.
  prendasCloset: 8,
  // Cada combinación lleva la foto del outfit armado, también con Gemini.
  combinaciones: 8,
  manuales: 2,
};

// Sin membresía, "Buscar combinaciones" funciona en las primeras prendas
// (ver combinacionesClosetGratis) pero con un tope total: si no, se
// podría buscar sin fin sobre esas mismas prendas.
export const COMBINACIONES_GRATIS_TOTAL = 3;

const NOMBRE_USO: Record<UsoMensual, string> = {
  busquedas: "búsquedas",
  prendasCloset: "prendas nuevas en tu clóset",
  combinaciones: "combinaciones",
  manuales: "manuales nuevos",
};

/** El mensaje al llegar a un tope del mes, con la fecha en que se renueva. */
export function mensajeTopeMensual(uso: UsoMensual, renueva: Date): string {
  const fecha = renueva.toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" });
  return `Llegaste a tus ${TOPES_MES_MEMBRESIA[uso]} ${NOMBRE_USO[uso]} de este mes. Se renuevan el ${fecha}.`;
}

export type TipoPlan = keyof typeof PRECIOS;

/** Cuántos días de membresía da cada plan. */
export const DIAS_DE_PLAN: Record<TipoPlan, number> = {
  mensual: 30,
  anual: 365,
};

export function planDe(usuario: {
  email?: string | null;
  premium_until?: string | null;
}): Plan {
  if (usuario.premium_until && new Date(usuario.premium_until) > new Date()) {
    return "membresia";
  }
  return usuario.email ? "gratis" : "anonimo";
}

export type Recurso = "busquedas" | "outfits" | "prendasCloset";

/**
 * ¿Puede hacer una más? Devuelve también con qué se destraba, que es lo
 * que la pantalla necesita para saber si ofrecer "crear cuenta" o
 * "activar membresía".
 */
export function puedeUsar(
  plan: Plan,
  recurso: Recurso,
  usadas: number
): { permitido: boolean; tope: number | null; destrabaCon: Plan | null } {
  const tope = TOPES[plan][recurso];
  if (tope === null) return { permitido: true, tope: null, destrabaCon: null };
  if (usadas < tope) return { permitido: true, tope, destrabaCon: null };

  // Llegó al tope: ¿subir de plan sirve de algo? En el clóset, pasar de
  // anónima a cuenta gratis NO sirve (las dos tienen 2 prendas), así
  // que ahí hay que mandarla directo a la membresía. Se busca el
  // siguiente plan que de verdad le dé más.
  const siguientes: Plan[] =
    plan === "anonimo" ? ["gratis", "membresia"] : plan === "gratis" ? ["membresia"] : [];
  for (const p of siguientes) {
    const otro = TOPES[p][recurso];
    if (otro === null || otro > tope) {
      return { permitido: false, tope, destrabaCon: p };
    }
  }
  return { permitido: false, tope, destrabaCon: null };
}

/** El mensaje que ve la usuaria al toparse con un límite. */
export function mensajeDeTope(
  recurso: Recurso,
  tope: number,
  destrabaCon: Plan | null
): string {
  const nombre =
    recurso === "busquedas"
      ? tope === 1 ? "búsqueda" : "búsquedas"
      : recurso === "outfits"
        ? tope === 1 ? "outfit guardado" : "outfits guardados"
        : tope === 1 ? "prenda en tu clóset" : "prendas en tu clóset";

  const llegaste = `Llegaste a ${tope} ${nombre}.`;
  if (destrabaCon === "gratis") {
    return `${llegaste} Crea tu cuenta gratis con tu correo y sigues.`;
  }
  if (destrabaCon === "membresia") {
    return `${llegaste} Con la membresía tienes mucho más cada mes.`;
  }
  return llegaste;
}
