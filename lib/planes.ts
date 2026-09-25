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

// El anual sale a $4.000 por mes: un 20% de descuento frente a pagar
// mes a mes. Es a propósito — Bold cobra un fijo de $900 por
// transacción, así que doce cobros de $5.000 dejan mucho menos que uno
// solo de $48.000.
export const PRECIOS = {
  mensual: 5000,
  anual: 48000,
} as const;

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
    return `${llegaste} Con la membresía no tienes tope.`;
  }
  return llegaste;
}
