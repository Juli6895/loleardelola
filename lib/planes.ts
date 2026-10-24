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
  // Cuántas veces en total puede usar "Buscar combinaciones" sin
  // membresía (desde siempre, no por mes). null = sin tope.
  combinacionesClosetGratis: number | null;
};

// null = sin tope.
export const TOPES: Record<Plan, Topes> = {
  // Sin cuenta: alcanza para probar la app de verdad antes de pedirle
  // el correo a nadie.
  anonimo: {
    busquedas: 2,
    outfits: 1,
    prendasCloset: 1,
    manualDeEstilo: false,
    combinacionesClosetGratis: 1,
  },
  // Con cuenta gratis: un poco más, a cambio del correo.
  gratis: {
    busquedas: 5,
    outfits: 3,
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
// búsqueda por foto ~$160, una prenda al clóset ~$60, una combinación
// ~$125 y un manual ~$280. Guardar outfits no cuesta nada (es una fila
// en la base; la foto ya se subió al buscar).
//
// Octubre de 2026, precios de Juliana: mensual $12.900 y anual $69.900.
// Después de la comisión de Bold (~3,5% + $900 por cobro) dejan
// ~$11.550 y ~$5.550 al mes. Una usuaria muy activa (20 búsquedas, 15
// prendas y 15 combinaciones al mes) cuesta ~$5.900: el anual queda
// justo con ella y con utilidad en una usuaria normal.
export const PRECIOS = {
  mensual: 12900,
  anual: 69900,
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
  busquedas: 20,
  // En pantalla dicen "sin tope": estos números son solo un freno de
  // seguridad (ver USO_JUSTO) para que nadie suba cientos al mes.
  prendasCloset: 100,
  combinaciones: 60,
  manuales: 2,
};

// Usos que la membresía ofrece "sin tope". Igual tienen un máximo muy
// alto en TOPES_MES_MEMBRESIA, que una persona usando la app para ella
// no alcanza: cada prenda y cada combinación se pagan, y sin ningún
// freno una sola cuenta podría costar más de lo que paga.
export const USO_JUSTO: UsoMensual[] = ["prendasCloset", "combinaciones"];

const NOMBRE_USO: Record<UsoMensual, string> = {
  busquedas: "búsquedas",
  prendasCloset: "prendas nuevas en tu clóset",
  combinaciones: "combinaciones",
  manuales: "manuales nuevos",
};

/** El mensaje al llegar a un tope del mes, con la fecha en que se renueva. */
export function mensajeTopeMensual(uso: UsoMensual, renueva: Date): string {
  const fecha = renueva.toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" });
  if (USO_JUSTO.includes(uso)) {
    return `Llegaste al máximo de uso de este mes (${TOPES_MES_MEMBRESIA[uso]} ${NOMBRE_USO[uso]}). Es un límite de seguridad: se renueva el ${fecha}.`;
  }
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
