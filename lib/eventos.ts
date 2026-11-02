import { createHash } from "node:crypto";
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
  // Solo la primera vez que ESE correo entra — ver unirIdentidades en
  // lib/sesion.ts. Sin esto, "ingreso_ok" mezcla registros nuevos con
  // gente que vuelve, y el tablero no puede contarlos aparte.
  "registro_ok",
  "ingreso_error",
  "nombre_puesto",

  // Uso — una por servicio, para saber qué usa de verdad cada persona
  // y no solo cuánta gente hay.
  "buscar_visto",
  "closet_visto",
  "outfits_visto",
  "perfil_visto",
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
  // Un manual guardado que se pasó al formato nuevo (no cuenta en el tope).
  "manual_formato_nuevo",
  "manual_error",

  // Combinar desde el clóset
  "combinacion_buscada",
  "combinacion_error",

  // Clic a un comercio puntual (no la búsqueda genérica de Google
  // Shopping, que no dice a cuál tienda entró) — de dónde: buscar,
  // clóset, manual o el directorio de Instagram.
  "comercio_clic",

  // La app instalable (PWA): cuántas la instalan y cuántas la abren
  // como app y no desde el navegador.
  "app_instalar_clic",
  "app_instalada",
  "app_abierta",

  // Avisos de rebaja (membresía): quién activa las notificaciones, qué
  // prendas sigue y cuántos avisos salen.
  "push_suscrito",
  "seguimiento_creado",
  "aviso_rebaja_enviado",
  "aviso_error",

  // Cuánto tiempo pasó en cada sección (segundos, solo con la pestaña a
  // la vista) y los errores de la página en el navegador.
  "tiempo_pagina",
  "inicio_visto",
  "preguntas_visto",
  "promociones_visto",
  "pagina_error",

  // Promociones: se le acabó la prueba gratis y vio el aviso de la
  // membresía (el gancho), y cuántas abren todas las de una marca.
  "promo_bloqueada",
  "promo_marca_abierta",
  // Cambió entre "Solo promociones" y "Ver todo" (props.vista).
  "promos_vista",

  // Puso su celular al crear la cuenta.
  "celular_puesto",

  // Tocó "Escríbenos" para sugerir un comercio (ver SugerirComercio).
  "comercio_sugerido",

  // Descubrir y moverse por la app: de dónde salen los clics y qué
  // páginas se leen. El catálogo completo, por etapa, está en
  // lib/etiquetas.ts.
  "entrar_visto",
  "terminos_visto",
  "privacidad_visto",
  "cta_inicio_clic",
  "servicio_clic",
  "otras_secciones_clic",

  // Filtros de Promociones: cuándo se abre el panel y qué se escoge
  // (props.filtro: marcas, talla o prenda; props.cantidad).
  "filtros_abiertos",
  "filtro_aplicado",

  // Errores que antes no quedaban anotados (se cuentan en Errores).
  "prenda_error",
  "perfil_error",
  "personalidad_error",
  "outfit_error",

  // Lo que costó cada llamada a la IA (ver lib/costos.ts).
  "consumo_ia",

  // Ilustración de la usuaria hecha con Gemini (Mi perfil). Ya no se
  // usa; queda para leer los eventos viejos.
  "figura_generada",
  "figura_error",

  // Fotos del clóset hechas con Gemini: la foto de catálogo de cada
  // prenda y la foto del outfit armado.
  "foto_catalogo_generada",
  "foto_catalogo_error",
  "outfit_foto_generada",
  "outfit_foto_error",
] as const;

export type NombreEvento = (typeof EVENTOS)[number];

export type ContextoEvento = {
  userId?: string | null;
  deviceId?: string | null;
  sesionId?: string | null;
  // La huella del aparato (ver huellaDe): se guarda en props.huella.
  huella?: string | null;
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
  // Solo cuenta lo que pasa en la página publicada. Las pruebas en un
  // computador (next dev / next start) usan la misma base de datos, y
  // cada pestaña de prueba quedaba como una "persona" más en el tablero.
  if (process.env.VERCEL_ENV !== "production") return;
  try {
    await supabaseAdmin().from("eventos").insert({
      nombre,
      user_id: ctx.userId ?? null,
      device_id: ctx.deviceId ?? null,
      sesion_id: ctx.sesionId ?? null,
      props: ctx.huella ? { ...props, huella: ctx.huella } : props,
    });
  } catch (e) {
    console.warn(`[eventos] no se pudo anotar "${nombre}":`, e);
  }
}

const DEVICE_ID_HEADER = "x-device-id";

/**
 * La huella del aparato: un código de 16 letras sacado de la conexión
 * (IP) y del modelo de celular o computador (user-agent), revueltos con
 * una clave. No se puede volver atrás para saber la IP, y no se guarda
 * nada más. Sirve para contar UNA persona por celular o computador: el
 * device_id vive en el navegador, y abrir el enlace desde Instagram o
 * WhatsApp, una ventana privada o borrar los datos le daba uno nuevo
 * (ver "quién es cada persona" en app/api/admin/tablero).
 */
export function huellaDe(req: Request): string | null {
  const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "").split(",")[0].trim();
  const aparato = req.headers.get("user-agent") ?? "";
  if (!ip || !aparato) return null;
  const clave = process.env.HUELLA_CLAVE || process.env.CRON_SECRET || "loleardlola";
  return createHash("sha256").update(`${clave}|${ip}|${aparato}`).digest("hex").slice(0, 16);
}

/** Saca el contexto de una petición, sin costo extra de base de datos. */
export function contextoDe(req: Request, userId?: string | null): ContextoEvento {
  return {
    userId: userId ?? null,
    deviceId: req.headers.get(DEVICE_ID_HEADER),
    sesionId: req.headers.get("x-sesion-id"),
    huella: huellaDe(req),
  };
}
