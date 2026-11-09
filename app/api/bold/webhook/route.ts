import { NextResponse } from "next/server";
import { confirmarOrden } from "@/lib/confirmar-pago";

// POST /api/bold/webhook
//
// El aviso que manda Bold cuando cambia una venta (se configura en el
// panel de Bold: Integraciones → Webhooks → https://www.loleardlola.com/api/bold/webhook).
// Con esto la membresía se activa apenas se aprueba el pago, aunque la
// usuaria nunca vuelva a la página de resultado.
//
// De lo que trae el aviso solo se toma la referencia de la orden, y con
// ella se le pregunta a Bold (confirmarOrden): cualquiera podría mandar
// un aviso falso a esta dirección, y así no sirve de nada.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const d = body?.data ?? {};
  const referencia = [d?.metadata?.reference, d?.reference, d?.order_id, body?.reference].find(
    (r): r is string => typeof r === "string" && r.startsWith("lola-") && r.length <= 80
  );
  if (referencia) {
    try {
      await confirmarOrden(referencia);
    } catch (e) {
      console.error("[bold/webhook] no se pudo confirmar:", e);
    }
  }
  // Siempre 200: si no, Bold reintenta, y no hay nada que reintentar.
  return NextResponse.json({ ok: true });
}
