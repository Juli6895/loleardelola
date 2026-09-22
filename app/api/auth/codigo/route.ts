import { NextResponse } from "next/server";
import { crearCodigo, normalizarCorreo } from "@/lib/sesion";
import { enviarCodigo } from "@/lib/email";

// POST /api/auth/codigo  { email }
// Manda un código de 6 dígitos al correo.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const correo = normalizarCorreo(body.email);
    if (!correo) {
      return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
    }

    const resultado = await crearCodigo(correo);
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.motivo }, { status: 429 });
    }

    const envio = await enviarCodigo(correo, resultado.codigo, resultado.expiraEn);
    if (!envio.enviado && process.env.NODE_ENV === "production") {
      // En local no importa (el código sale por consola), pero en
      // producción un correo que no sale es un usuario que no entra.
      return NextResponse.json(
        { error: "No pudimos enviarte el correo. Inténtalo en un momento." },
        { status: 502 }
      );
    }

    // En local y sin servicio de correo configurado, el código se
    // devuelve para poder probar el ingreso de punta a punta. Las dos
    // condiciones importan: en producción NUNCA se devuelve, aunque
    // falte la llave, porque sería regalarle la cuenta a cualquiera
    // que sepa un correo ajeno.
    const soloEnLocal =
      process.env.NODE_ENV !== "production" && !envio.enviado
        ? { codigoDePrueba: resultado.codigo }
        : {};

    return NextResponse.json({ ok: true, expiraEn: resultado.expiraEn, ...soloEnLocal });
  } catch (e) {
    console.error("[auth/codigo] falló:", e);
    return NextResponse.json({ error: "No pudimos enviarte el código." }, { status: 500 });
  }
}
