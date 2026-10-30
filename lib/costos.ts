import { registrar } from "./eventos";

// =====================================================================
// Lo que cuesta operar LoleardLola
// =====================================================================
// Variables: se pagan por uso. Cada llamada a la IA anota lo que costó
// de verdad (tokens que reporta la API × precio), como evento
// "consumo_ia", y el tablero los suma por servicio.
// Fijos: lo que se paga al mes aunque nadie use la app. Hoy todo está en
// planes gratis; la lista dice también cuánto costaría pasar al plan
// pago, para que no tome por sorpresa.
// =====================================================================

/** Pesos por dólar. Es aproximado: actualizarlo si la tasa cambia mucho. */
export const TRM = 4000;

// Precio en dólares por millón de tokens (precios de Anthropic, octubre
// de 2026). La escritura de caché vale 1,25× la entrada; la lectura,
// una décima parte.
const PRECIOS_IA: Record<string, { entrada: number; salida: number; cacheEscritura: number; cacheLectura: number }> = {
  "claude-sonnet-5": { entrada: 2, salida: 10, cacheEscritura: 2.5, cacheLectura: 0.2 },
};

// Google Vision (respaldo de la búsqueda si Claude falla): US$1,50 por
// cada 1.000 imágenes después de las primeras 1.000 gratis del mes. Se
// anota a precio completo para no subestimar.
const PRECIO_GOOGLE_VISION_USD = 0.0015;

export type ServicioIA =
  | "busqueda"
  | "busqueda_respaldo"
  | "prenda_closet"
  | "combinacion"
  | "manual"
  | "personalidad_foto"
  | "personalidad_referencia";

export const NOMBRE_SERVICIO: Record<ServicioIA, string> = {
  busqueda: "Búsqueda por foto (Claude)",
  busqueda_respaldo: "Búsqueda de respaldo (Google Vision)",
  prenda_closet: "Prenda subida al clóset",
  combinacion: "Buscar combinaciones",
  manual: "Manual de estilo",
  personalidad_foto: "Personalidad de estilo por foto",
  personalidad_referencia: "Personalidad de estilo por referencia",
};

type Uso = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

export function costoUsd(modelo: string, uso: Uso): number {
  const p = PRECIOS_IA[modelo];
  if (!p) return 0;
  return (
    ((uso.input_tokens ?? 0) * p.entrada +
      (uso.output_tokens ?? 0) * p.salida +
      (uso.cache_creation_input_tokens ?? 0) * p.cacheEscritura +
      (uso.cache_read_input_tokens ?? 0) * p.cacheLectura) /
    1_000_000
  );
}

/**
 * Anota lo que costó una llamada a la IA. No se espera (no frena la
 * respuesta) y nunca falla: si no se puede anotar, se pierde el dato.
 */
export function anotarConsumo(servicio: ServicioIA, modelo: string, uso: Uso, userId?: string | null): void {
  const usd = costoUsd(modelo, uso);
  void registrar(
    "consumo_ia",
    { userId: userId ?? null },
    {
      servicio,
      modelo,
      entrada: uso.input_tokens ?? 0,
      salida: uso.output_tokens ?? 0,
      cache: (uso.cache_creation_input_tokens ?? 0) + (uso.cache_read_input_tokens ?? 0),
      usd: Math.round(usd * 1_000_000) / 1_000_000,
    }
  );
}

export function anotarConsumoGoogleVision(userId?: string | null): void {
  void registrar("consumo_ia", { userId: userId ?? null }, {
    servicio: "busqueda_respaldo",
    modelo: "google-vision",
    usd: PRECIO_GOOGLE_VISION_USD,
  });
}

// La comisión de Bold por cada pago (estimada: depende del medio de pago).
export const COMISION_BOLD = { porcentaje: 0.0329, fijoCop: 900 };

export type CostoFijo = {
  rubro: string;
  plan: string;
  cop: number;
  // Lo que cuesta el plan pago y por qué podría hacer falta.
  siCrece: string;
};

/** Lo que se paga al mes, en pesos, aunque nadie use la app. */
export const COSTOS_FIJOS: CostoFijo[] = [
  {
    rubro: "Hosting de la página (Vercel)",
    plan: "Hobby, gratis",
    cop: 0,
    siCrece: "Pro: US$20/mes (~$80.000). Vercel pide el plan Pro para uso comercial, es decir, para cobrar.",
  },
  {
    rubro: "Base de datos (Supabase)",
    plan: "Free, gratis",
    cop: 0,
    siCrece: "Pro: US$25/mes (~$100.000). Evita que el proyecto se pause por poco uso.",
  },
  {
    rubro: "Fotos (Cloudinary)",
    plan: "Free, gratis",
    cop: 0,
    siCrece: "Plus: US$99/mes. El gratis trae 25 créditos al mes (unas 25 GB de fotos o de tráfico).",
  },
  {
    rubro: "Correos del código de ingreso (Resend)",
    plan: "Free, gratis",
    cop: 0,
    siCrece: "Pro: US$20/mes. El gratis trae 3.000 correos al mes (100 al día).",
  },
  {
    rubro: "Dominio",
    // Comprado en Vercel el 30 de octubre de 2026, con renovación anual.
    plan: "loleardlola.com: US$11,25 al año",
    cop: Math.round((11.25 * TRM) / 12),
    siCrece: "No cambia con el uso. Se renueva solo cada año en Vercel (revisa que la tarjeta esté al día).",
  },
  {
    rubro: "IA (Claude, Anthropic)",
    plan: "Sin mensualidad: solo se paga lo que se usa",
    cop: 0,
    siCrece: "Va en los costos variables.",
  },
  {
    rubro: "Pasarela de pagos (Bold)",
    plan: "Sin mensualidad: comisión por venta",
    cop: 0,
    siCrece: "Va en los costos variables.",
  },
];
