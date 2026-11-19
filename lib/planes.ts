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
  // Sin cuenta: nada que use la IA (octubre de 2026, a pedido de
  // Juliana: si llega mucha gente de golpe, cada búsqueda, prenda o
  // combinación anónima es plata sin siquiera un correo a cambio). Solo
  // mira las promociones (ver DIAS_PRUEBA_PROMOS).
  anonimo: {
    busquedas: 0,
    outfits: 0,
    prendasCloset: 0,
    manualDeEstilo: false,
    combinacionesClosetGratis: 0,
  },
  // Con cuenta gratis (noviembre de 2026, tabla de Juliana): nada que
  // use la IA. Guarda hasta 3 outfits, da 3 me gusta y ve las promociones
  // 2 días. Aplica a todas las cuentas gratis, también a las que ya existían.
  gratis: {
    busquedas: 0,
    outfits: 3,
    prendasCloset: 0,
    manualDeEstilo: false,
    combinacionesClosetGratis: 0,
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
// Para quien tiene membresía y se le acaban las búsquedas. Se gastan solo
// cuando ya usó las de su membresía y se vencen con ella. El saldo sale de
// los pagos y de los eventos (ver busquedasExtra en lib/limites.ts).
//
// Se vende solo PAQUETE_VIGENTE. paquete30 queda para poder acreditar una
// orden que se haya abierto antes del cambio.
export const PAQUETES_BUSQUEDAS = {
  paquete20: { busquedas: 20, precio: 7900 },
  paquete30: { busquedas: 30, precio: 7900 },
} as const;

export type TipoPaquete = keyof typeof PAQUETES_BUSQUEDAS;

export const PAQUETE_VIGENTE = "paquete20" as const;

// ---------------------------------------------------------------------
// Límites mensuales de la membresía
// ---------------------------------------------------------------------
// Las condiciones de quienes pagaron ANTES de INICIO_CUPOS_NUEVOS: se
// cuentan desde el día 1 de cada mes (hora de Colombia) y las conservan
// hasta que se les venza lo que ya pagaron. Lo nuevo es CUPOS_MEMBRESIA.
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

/**
 * Las promociones de todas las tiendas son el gancho de la membresía:
 * sin cuenta se ven 1 día desde la primera visita, con cuenta gratis 2
 * días desde que la crea, y con membresía siempre.
 */
export const DIAS_PRUEBA_PROMOS: Record<Exclude<Plan, "membresia">, number> = {
  anonimo: 1,
  gratis: 2,
};

/** Cuántos días de membresía da cada plan. */
export const DIAS_DE_PLAN: Record<TipoPlan, number> = {
  mensual: 31,
  anual: 365,
};

// ---------------------------------------------------------------------
// Cupos de la membresía (tabla de Juliana, noviembre de 2026)
// ---------------------------------------------------------------------
// Aplican a cada pago hecho desde INICIO_CUPOS_NUEVOS. El cupo es por
// membresía pagada, no por mes del calendario: la anual usa sus 60 a su
// ritmo durante todo el año. null = sin tope.
export type UsoMembresia =
  | UsoMensual
  | "outfits"
  | "meGusta"
  | "personalidadFoto"
  | "personalidadReferencia";

export const CUPOS_MEMBRESIA: Record<TipoPlan, Record<UsoMembresia, number | null>> = {
  mensual: {
    busquedas: 5,
    outfits: 105,
    prendasCloset: 5,
    combinaciones: 5,
    manuales: 1,
    meGusta: 100,
    personalidadFoto: 1,
    personalidadReferencia: 1,
  },
  anual: {
    busquedas: 60,
    outfits: null,
    prendasCloset: 60,
    combinaciones: 60,
    manuales: 1,
    meGusta: null,
    personalidadFoto: 1,
    personalidadReferencia: 1,
  },
};

export const INICIO_CUPOS_NUEVOS = "2026-11-19T00:00:00.000Z";

export const ME_GUSTA_GRATIS = 3;
// El máximo que ya tenían quienes pagaron antes del cambio.
export const ME_GUSTA_ANTERIOR = 30;

export type PagoMembresia = { plan: string; acreditado_at: string | null };
export type PeriodoMembresia = { plan: TipoPlan; inicio: Date; fin: Date; anterior: boolean };

/**
 * Qué membresía está corriendo hoy. Pagar antes de que se venza suma días,
 * así que cada pago empieza cuando termina el anterior.
 */
export function periodoActual(pagos: PagoMembresia[], ahora: Date = new Date()): PeriodoMembresia | null {
  let cursor = 0;
  let ultimo: PeriodoMembresia | null = null;
  const ordenados = pagos
    .filter((p) => (p.plan === "mensual" || p.plan === "anual") && p.acreditado_at)
    .sort((a, b) => new Date(a.acreditado_at!).getTime() - new Date(b.acreditado_at!).getTime());
  for (const p of ordenados) {
    const plan = p.plan as TipoPlan;
    const pagado = new Date(p.acreditado_at!).getTime();
    const inicio = Math.max(pagado, cursor);
    const fin = inicio + DIAS_DE_PLAN[plan] * 86_400_000;
    cursor = fin;
    const periodo = {
      plan,
      inicio: new Date(inicio),
      fin: new Date(fin),
      anterior: pagado < new Date(INICIO_CUPOS_NUEVOS).getTime(),
    };
    if (inicio > ahora.getTime()) break;
    ultimo = periodo;
    if (ahora.getTime() < fin) break;
  }
  return ultimo;
}

const NOMBRE_CUPO: Record<UsoMembresia, string> = {
  busquedas: "búsquedas",
  prendasCloset: "prendas nuevas en tu clóset",
  combinaciones: "combinaciones",
  manuales: "manual de estilo",
  outfits: "outfits guardados",
  meGusta: "me gusta",
  personalidadFoto: "análisis de personalidad por foto",
  personalidadReferencia: "análisis de personalidad por referencia",
};

/** El mensaje al llegar a un cupo de la membresía. */
export function mensajeCupo(uso: UsoMembresia, tope: number, fin: Date): string {
  if (uso === "outfits" || uso === "meGusta") {
    return `Llegaste a ${tope} ${NOMBRE_CUPO[uso]}. Quita alguno para agregar otro.`;
  }
  const fecha = fin.toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" });
  if (uso === "busquedas") {
    return `Llegaste a tus ${tope} búsquedas de esta membresía, vigente hasta el ${fecha}. Si quieres seguir, compra un paquete de búsquedas en Membresía.`;
  }
  return `Ya usaste ${tope === 1 ? "tu" : `tus ${tope}`} ${NOMBRE_CUPO[uso]} de esta membresía, vigente hasta el ${fecha}.`;
}

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

  // Sin cuenta no hay búsquedas ni outfits: no es que "llegó" a nada.
  if (tope === 0) {
    const que = recurso === "busquedas" ? "buscar tu outfit" : recurso === "outfits" ? "guardar tus outfits" : "subir prendas";
    return destrabaCon === "gratis"
      ? `Para ${que}, crea tu cuenta gratis con tu correo.`
      : `Para ${que} necesitas la membresía.`;
  }

  const llegaste = `Llegaste a ${tope} ${nombre}.`;
  if (destrabaCon === "gratis") {
    return `${llegaste} Crea tu cuenta gratis con tu correo y sigues.`;
  }
  if (destrabaCon === "membresia") {
    return `${llegaste} Con la membresía tienes mucho más cada mes.`;
  }
  return llegaste;
}
