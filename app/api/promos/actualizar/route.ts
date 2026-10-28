import { NextResponse } from "next/server";
import { LOTES, actualizarLote } from "@/lib/promos-diarias";

// GET /api/promos/actualizar?lote=0..11 — la revisión diaria de promos.
//
// Vercel la llama una vez al día por cada lote (ver "crons" en
// vercel.json): cada lote es un grupo de tiendas, porque leer el
// catálogo entero de todas no cabe en el minuto que dura una función.
// Ver lib/promos-diarias.ts.
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

  const lote = Number(new URL(req.url).searchParams.get("lote"));
  if (!Number.isInteger(lote) || lote < 0 || lote >= LOTES) {
    return NextResponse.json({ error: `El lote va de 0 a ${LOTES - 1}` }, { status: 400 });
  }

  const tiendas = await actualizarLote(lote);
  return NextResponse.json({ lote, tiendas });
}
