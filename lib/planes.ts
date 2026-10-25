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

// Cada uso de la IA cuesta (en pesos, con el dólar a ~$4.000, medido en
// octubre de 2026 con lib/costos.ts): una búsqueda por foto ~$137, una
// prenda al clóset ~$61, una combinación ~$89 y un manual ~$223. Guardar
// outfits no cuesta nada (es una fila en la base; la foto ya se subió).
//
// Precio de LANZAMIENTO (octubre de 2026, "camino 1" de la estrategia
// de costos): $5.000 al mes y $49.900 al año. Después de la comisión de
// Bold (calculada por lo alto, con IVA) dejan ~$3.733 y ~$3.906 al mes.
// Una usuaria que use TODO lo de TOPES_MES_MEMBRESIA cuesta ~$3.569: no
// hay pérdida ni con ella, y una usuaria normal (~40% del tope) deja
// ~$2.300 al mes. Mientras los costos fijos sigan en $0 hay utilidad
// desde la primera membresía; con Vercel Pro + Supabase Pro ($180.000
// al mes) hacen falta ~80 membresías.
//
// Después del lanzamiento la idea es pasar a PRECIOS_NORMALES ("camino
// 2"): $9.900 y $79.900, con 12 búsquedas y 2 manuales al mes.
export const PRECIOS = {
  mensual: 5000,
  anual: 49900,
} as const;

// Se muestran tachados junto al de lanzamiento.
export const PRECIOS_NORMALES = {
  mensual: 9900,
  anual: 79900,
} as const;

// ---------------------------------------------------------------------
// Paquetes de búsquedas adicionales
// ---------------------------------------------------------------------
// Para quien tiene membresía y se le acaban las búsquedas del mes. Se
// suman a users.busquedas_extra, se gastan solo cuando ya usó las del
// mes, y no se vencen. El paquete de 25 por $5.000 casi no dejaba nada
// (~$300) por el fijo de Bold. Juliana eligió un solo paquete: 30
// búsquedas por $7.900 (cuestan ~$4.110 y dejan ~$2.400).
export const PAQUETES_BUSQUEDAS = {
  paquete30: { busquedas: 30, precio: 7900 },
} as const;

export type TipoPaquete = keyof typeof PAQUETES_BUSQUEDAS;

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
  busquedas: 8,
  prendasCloset: 15,
  combinaciones: 15,
  manuales: 1,
};

// Usos que se ofrecen "sin tope" pero tienen un máximo alto de
// seguridad. Con el precio de lanzamiento no hay ninguno: todos los
// límites se dicen tal cual en pantalla.
export const USO_JUSTO: UsoMensual[] = [];

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
  if (uso === "busquedas") {
    return `Llegaste a tus ${TOPES_MES_MEMBRESIA.busquedas} búsquedas de este mes (se renuevan el ${fecha}). Si quieres seguir, compra un paquete de búsquedas en Membresía.`;
  }
  return `Llegaste a tus ${TOPES_MES_MEMBRESIA[uso]} ${NOMBRE_USO[uso]} de este mes. Se renuevan el ${fecha}.`;
}

export type TipoPlan = keyof typeof PRECIOS;

/** Lo que se le puede cobrar a alguien: la membresía o un paquete. */
export type Producto = TipoPlan | TipoPaquete;

export function esPaquete(p: string): p is TipoPaquete {
  return p in PAQUETES_BUSQUEDAS;
}

export function precioDe(p: Producto): number {
  return esPaquete(p) ? PAQUETES_BUSQUEDAS[p].precio : PRECIOS[p];
}

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
