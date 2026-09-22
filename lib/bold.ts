import crypto from "crypto";
import { PRECIOS, type TipoPlan } from "./planes";

// =====================================================================
// Cobro con Bold
// =====================================================================
// Bold NO hace cobros recurrentes: cada pago es único. Por eso la
// membresía es una fecha de vencimiento y no una suscripción — se paga,
// se suman los días, y cuando se acerca la fecha se vuelve a cobrar.
//
// Cómo funciona el botón:
//   1. El servidor arma una orden con un identificador único y firma el
//      monto con la llave secreta (SHA256).
//   2. El navegador muestra el botón de Bold con esa firma. Si alguien
//      cambia el monto en el navegador, la firma deja de cuadrar y Bold
//      rechaza el cobro.
//   3. Al terminar, Bold devuelve a la usuaria a nuestra página.
//
// ⚠️ LO MÁS IMPORTANTE: al volver, Bold pone el resultado en la
// dirección (bold-tx-status=approved). NO SE PUEDE CONFIAR EN ESO —
// cualquiera puede escribir esa dirección a mano y darse la membresía
// gratis. Por eso `consultarPago` le pregunta a Bold directamente,
// desde el servidor, y solo eso cuenta.
// =====================================================================

// El dominio correcto es .co — la documentación de Bold dice .com en
// una página, pero ese ni siquiera resuelve. Verificado contra la API.
const API = "https://payments.api.bold.co";

export const SCRIPT_BOLD = "https://checkout.bold.co/library/boldPaymentButton.js";

export function llaves() {
  const identidad = process.env.BOLD_IDENTITY_KEY;
  const secreta = process.env.BOLD_SECRET_KEY;
  if (!identidad || !secreta) return null;
  return { identidad, secreta, pruebas: process.env.BOLD_MODO !== "produccion" };
}

/** Identificador único de la venta. Máximo 60 caracteres según Bold. */
export function nuevaOrden(userId: string): string {
  // Se mezcla el id de la usuaria con algo aleatorio: así la orden se
  // puede rastrear hasta su dueña sin tener que confiar en lo que
  // mande el navegador.
  const azar = crypto.randomBytes(6).toString("hex");
  return `lola-${userId.slice(0, 8)}-${Date.now().toString(36)}-${azar}`;
}

/**
 * Firma de integridad: SHA256 de {orden}{monto}{divisa}{llave secreta},
 * concatenados en ESE orden y sin separadores. Se calcula en el
 * servidor a propósito: en el navegador quedaría expuesta la llave
 * secreta y cualquiera podría firmar el monto que quisiera.
 */
export function firmar(orden: string, montoCop: number, secreta: string): string {
  return crypto
    .createHash("sha256")
    .update(`${orden}${montoCop}COP${secreta}`)
    .digest("hex");
}

export type DatosBoton = {
  apiKey: string;
  orden: string;
  montoCop: number;
  divisa: "COP";
  firma: string;
  descripcion: string;
  urlRetorno: string;
  pruebas: boolean;
};

export function armarBoton(
  userId: string,
  plan: TipoPlan,
  urlBase: string
): DatosBoton | null {
  const k = llaves();
  if (!k) return null;
  const orden = nuevaOrden(userId);
  const montoCop = PRECIOS[plan];
  return {
    apiKey: k.identidad,
    orden,
    montoCop,
    divisa: "COP",
    firma: firmar(orden, montoCop, k.secreta),
    descripcion:
      plan === "anual"
        ? "Membresía LoleardLola - 1 año"
        : "Membresía LoleardLola - 1 mes",
    urlRetorno: `${urlBase}/membresia/resultado`,
    pruebas: k.pruebas,
  };
}

export type EstadoPago =
  | "APPROVED"
  | "REJECTED"
  | "FAILED"
  | "VOIDED"
  | "PENDING"
  | "PROCESSING"
  | "NO_TRANSACTION_FOUND"
  | "DESCONOCIDO";

export type Voucher = {
  estado: EstadoPago;
  totalCop: number | null;
  metodo: string | null;
  correoPagador: string | null;
};

/**
 * Le pregunta a Bold si esa venta se pagó. Es la ÚNICA fuente de
 * verdad: lo que diga el navegador al volver no vale.
 */
export async function consultarPago(orden: string): Promise<Voucher | null> {
  const k = llaves();
  if (!k) return null;

  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), 12000);
  try {
    const res = await fetch(`${API}/v2/payment-voucher/${encodeURIComponent(orden)}`, {
      headers: { Authorization: `x-api-key ${k.identidad}` },
      signal: control.signal,
    });

    // 404 = Bold no conoce esa orden. No es un fallo nuestro: es que
    // nadie llegó a pagarla.
    if (res.status === 404) {
      return { estado: "NO_TRANSACTION_FOUND", totalCop: null, metodo: null, correoPagador: null };
    }
    if (!res.ok) {
      console.error("[bold] la consulta respondió", res.status, await res.text());
      return null;
    }

    const d = (await res.json()) as {
      payment_status?: string;
      total?: number;
      payment_method?: string;
      payer_email?: string;
    };

    return {
      estado: (d.payment_status as EstadoPago) ?? "DESCONOCIDO",
      totalCop: typeof d.total === "number" ? d.total : null,
      metodo: d.payment_method ?? null,
      correoPagador: d.payer_email ?? null,
    };
  } catch (e) {
    console.error("[bold] no se pudo consultar el pago:", e);
    return null;
  } finally {
    clearTimeout(corte);
  }
}
