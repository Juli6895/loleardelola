import { supabaseAdmin } from "./supabase";

// =====================================================================
// Registro de eventos (para el embudo y el tablero)
// =====================================================================
// Sin esto no hay analítica posible: no se puede saber que alguien se
// quedó en el botón de pagar si nunca se anotó que lo tocó.
//
// Dos reglas que se respetan en todo el archivo:
//
// 1. UN EVENTO NUNCA PUEDE TUMBAR UNA PÁGINA. Si falla al guardar, se
//    anota en consola y se sigue. Medir es importante; funcionar lo es
//    más.
//
// 2. NO SE GUARDA NADA IDENTIFICABLE. Ni correos, ni nombres, ni lo que
//    la usuaria buscó, ni sus medidas. Solo qué pasó y de qué cuenta.
//    Para cruzar con la persona está user_id, y esos datos viven en
//    `users`, donde corresponde.
// =====================================================================

// Lista cerrada a propósito: si cualquiera puede inventar un nombre de
// evento, en tres meses el tablero es ilegible y nadie sabe si
// "pago_ok" y "pago_exitoso" son lo mismo.
export const EVENTOS = [
  // Recorrido general
  "pagina_vista",

  // Búsqueda de outfits
  "busqueda_iniciada",
  "busqueda_ok",
  "busqueda_error",

  // Topes: el momento exacto en que la app le dice "hasta acá"
  "tope_alcanzado",

  // Cuenta
  "ingreso_codigo_pedido",
  "ingreso_ok",
  "ingreso_error",
  "nombre_puesto",

  // Uso
  "outfit_guardado",
  "prenda_subida",
  "perfil_guardado",
  "personalidad_calculada",

  // Embudo de pago
  "membresia_vista",
  "pago_intentado",
  "pago_abierto",
  "pago_aprobado",
  "pago_rechazado",
  "pago_error",

  // Manual
  "manual_visto",
  "manual_generado",
  "manual_error",
] as const;

export type NombreEvento = (typeof EVENTOS)[number];

export type ContextoEvento = {
  userId?: string | null;
  deviceId?: string | null;
  sesionId?: string | null;
};

/**
 * Anota un evento. Nunca lanza: si falla, se pierde el dato y ya.
 *
 * No se espera (`await`) en los sitios donde la respuesta importa —
 * anotar no debe sumarle tiempo a lo que la usuaria está esperando.
 */
export async function registrar(
  nombre: NombreEvento,
  ctx: ContextoEvento = {},
  props: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabaseAdmin().from("eventos").insert({
      nombre,
      user_id: ctx.userId ?? null,
      device_id: ctx.deviceId ?? null,
      sesion_id: ctx.sesionId ?? null,
      props,
    });
  } catch (e) {
    console.warn(`[eventos] no se pudo anotar "${nombre}":`, e);
  }
}

const DEVICE_ID_HEADER = "x-device-id";

/** Saca el contexto de una petición, sin costo extra de base de datos. */
export function contextoDe(req: Request, userId?: string | null): ContextoEvento {
  return {
    userId: userId ?? null,
    deviceId: req.headers.get(DEVICE_ID_HEADER),
    sesionId: req.headers.get("x-sesion-id"),
  };
}
