import { NextResponse } from "next/server";
import { revisarPendientes } from "@/lib/confirmar-pago";

// GET /api/membresia/revisar-pendientes — revisión diaria (ver "crons"
// en vercel.json) de todas las órdenes pendientes de los últimos 3 días.
// Es la última red: si el aviso de Bold no llegó y la persona no ha
// vuelto a abrir la app, a más tardar al día siguiente queda activa.
//
// Si se configura CRON_SECRET en Vercel, Vercel lo manda solo en cada
// llamada y la ruta rechaza a cualquier otro.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json(await revisarPendientes({ dias: 3 }));
}
