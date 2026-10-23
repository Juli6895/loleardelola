import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/despertar — mantiene despierta la base de datos.
//
// En el plan gratis, Supabase pausa el proyecto cuando pasa un tiempo
// sin uso, y con la base pausada la app entera deja de funcionar (pasó
// en octubre de 2026: "No pudimos identificar tu navegador" en todo).
// Vercel llama esta ruta una vez al día (ver "crons" en vercel.json) y
// hace una consulta mínima, para que siempre haya actividad.
//
// Si se configura CRON_SECRET en Vercel, Vercel lo manda solo en cada
// llamada y la ruta rechaza a cualquier otro. No devuelve ningún dato.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { error } = await supabaseAdmin()
    .from("users")
    .select("id", { count: "exact", head: true })
    .limit(1);

  if (error) {
    console.error("[api/despertar] la base no respondió:", error.message);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
