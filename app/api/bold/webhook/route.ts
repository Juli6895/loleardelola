import { NextResponse } from "next/server";
import { confirmarOrden } from "@/lib/confirmar-pago";
import { avisoFirmadoPorBold, type Voucher } from "@/lib/bold";

// POST /api/bold/webhook
//
// El aviso que manda Bold cuando cambia una venta (se configura en el
// panel de Bold: Integraciones → Webhooks → https://www.loleardlola.com/api/bold/webhook).
// Con esto la membresía se activa apenas se aprueba el pago, aunque la
// usuaria nunca vuelva a la página de resultado.
//
// La orden viene en data.metadata.reference (el order-id del botón).
// - Si el aviso trae la firma de Bold (x-bold-signature), se le cree y
//   se acredita de una vez: Bold pide respuesta en 2 segundos, y en los
//   primeros minutos su consulta todavía puede decir que no encuentra la
//   venta.
// - Si la firma no cuadra, solo se usa la referencia y se le pregunta a
//   Bold (confirmarOrden): un aviso falso no logra nada.
// Si no se pudo confirmar un pago aprobado, se responde 503 para que
// Bold vuelva a avisar (a los 15 minutos, 1 hora, 4, 8 y 24 horas).
export const dynamic = "force-dynamic";

const TRANSITORIOS = ["NO_TRANSACTION_FOUND", "PENDING", "PROCESSING", "DESCONOCIDO", "sin-respuesta"];

export async function POST(req: Request) {
  const crudo = await req.text();
  let body: any = null;
  try {
    body = JSON.parse(crudo);
  } catch {
    return NextResponse.json({ ok: true });
  }
  const d = body?.data ?? {};
  const referencia = [d?.metadata?.reference, d?.reference, body?.reference].find(
    (r): r is string => typeof r === "string" && r.startsWith("lola-") && r.length <= 80
  );
  if (!referencia) return NextResponse.json({ ok: true });

  const tipo = String(body?.type ?? "");
  let aviso: Voucher | undefined;
  if (avisoFirmadoPorBold(crudo, req.headers.get("x-bold-signature"))) {
    const total = Number(d?.amount?.total);
    const metodo = typeof d?.payment_method === "string" ? d.payment_method : null;
    const pagador = typeof d?.payer_email === "string" ? d.payer_email : null;
    if (tipo === "SALE_APPROVED") {
      aviso = { estado: "APPROVED", totalCop: Number.isFinite(total) ? total : null, metodo, correoPagador: pagador };
    } else if (tipo === "SALE_REJECTED") {
      aviso = { estado: "REJECTED", totalCop: null, metodo, correoPagador: pagador };
    }
  }

  try {
    const r = await confirmarOrden(referencia, {}, aviso);
    if (!r.ok && tipo === "SALE_APPROVED" && TRANSITORIOS.includes(r.estado)) {
      return NextResponse.json({ ok: false, reintentar: true }, { status: 503 });
    }
  } catch (e) {
    console.error("[bold/webhook] no se pudo confirmar:", e);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
