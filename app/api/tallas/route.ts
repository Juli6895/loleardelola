import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolverUserId } from "@/lib/sesion";

// GET  /api/tallas → { tallas }: "Mi talla" de las promociones.
// POST /api/tallas { tallas: string[] } → la guarda.
//
// De la cuenta si entró con su correo; si no, del navegador. Ver
// lib/tallas-favoritas.ts. Sin la migración de tallas no hace nada:
// sigue funcionando desde el navegador.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await resolverUserId(req);
  if (!userId) return NextResponse.json({ tallas: null });
  const { data, error } = await supabaseAdmin()
    .from("users")
    .select("tallas_favoritas")
    .eq("id", userId)
    .maybeSingle();
  if (error) return NextResponse.json({ tallas: null });
  return NextResponse.json({ tallas: (data?.tallas_favoritas as string[] | null) ?? null });
}

export async function POST(req: Request) {
  const userId = await resolverUserId(req);
  if (!userId) return NextResponse.json({ ok: false }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const tallas = Array.isArray(body.tallas)
    ? Array.from(
        new Set(
          body.tallas
            .filter((t: unknown): t is string => typeof t === "string")
            .map((t: string) => t.trim().slice(0, 10))
            .filter(Boolean)
        )
      ).slice(0, 30)
    : [];
  const { error } = await supabaseAdmin()
    .from("users")
    .update({ tallas_favoritas: tallas, tallas_favoritas_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    console.warn("[api/tallas] no se guardaron (¿falta la migración?):", error.message);
    return NextResponse.json({ ok: false });
  }
  return NextResponse.json({ ok: true });
}
