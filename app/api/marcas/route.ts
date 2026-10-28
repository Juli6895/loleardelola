import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolverUserId } from "@/lib/sesion";

// GET  /api/marcas → { marcas }: las "Mis marcas favoritas" guardadas.
// POST /api/marcas { marcas: string[] } → las guarda.
//
// De la cuenta si entró con su correo; si no, del navegador (cada
// navegador tiene su fila en users). Ver lib/marcas-favoritas.ts.
// Si la migración de marcas no se ha corrido, no hace nada: siguen
// funcionando desde el navegador.
export const dynamic = "force-dynamic";

const MAXIMO = 100;

export async function GET(req: Request) {
  const userId = await resolverUserId(req);
  if (!userId) return NextResponse.json({ marcas: null });
  const { data, error } = await supabaseAdmin()
    .from("users")
    .select("marcas_favoritas")
    .eq("id", userId)
    .maybeSingle();
  if (error) return NextResponse.json({ marcas: null });
  return NextResponse.json({ marcas: (data?.marcas_favoritas as string[] | null) ?? null });
}

export async function POST(req: Request) {
  const userId = await resolverUserId(req);
  if (!userId) return NextResponse.json({ ok: false }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const marcas = Array.isArray(body.marcas)
    ? Array.from(
        new Set(
          body.marcas
            .filter((d: unknown): d is string => typeof d === "string")
            .map((d: string) => d.trim().toLowerCase().slice(0, 100))
            .filter((d: string) => /^[a-z0-9.-]+$/.test(d))
        )
      ).slice(0, MAXIMO)
    : [];
  const { error } = await supabaseAdmin()
    .from("users")
    .update({ marcas_favoritas: marcas, marcas_favoritas_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    console.warn("[api/marcas] no se guardaron (¿falta la migración?):", error.message);
    return NextResponse.json({ ok: false });
  }
  return NextResponse.json({ ok: true });
}
