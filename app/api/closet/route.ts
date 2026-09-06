import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { uploadImage } from "@/lib/cloudinary";
import { analyzeClosetItem } from "@/lib/garment-ai";

// Límite de prendas en el plan gratis. Placeholder de la Fase de
// monetización (ver roadmap) — cuando exista el cobro, se salta este límite
// para usuarias con is_premium = true.
const FREE_CLOSET_LIMIT = 15;

// Helper: obtiene el user_id interno (y si es premium) a partir de la sesión
async function getUser(
  pinterestId: string | undefined
): Promise<{ id: string; is_premium: boolean } | null> {
  if (!pinterestId) return null;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("users")
    .select("id, is_premium")
    .eq("pinterest_id", pinterestId)
    .maybeSingle();
  return data ?? null;
}

// GET /api/closet → lista las prendas del clóset de la usuaria autenticada
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = await getUser(session?.pinterestId);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("closet_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

// POST /api/closet → sube una foto de prenda, la analiza con Claude y la
// guarda. Body: { imageBase64: "data:image/..." }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = await getUser(session?.pinterestId);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.imageBase64) {
    return NextResponse.json(
      { error: "Falta imageBase64" },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();

  // Límite del plan gratis. Se cuenta antes de subir para no gastar
  // Cloudinary/Claude en una prenda que no vamos a poder guardar.
  if (!user.is_premium) {
    const { count, error: countError } = await sb
      .from("closet_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    if ((count ?? 0) >= FREE_CLOSET_LIMIT) {
      return NextResponse.json(
        {
          error: `Llegaste al límite de ${FREE_CLOSET_LIMIT} prendas del plan gratis.`,
          limitReached: true,
        },
        { status: 403 }
      );
    }
  }

  try {
    const imageUrl = await uploadImage(body.imageBase64);
    const analysis = await analyzeClosetItem(imageUrl);

    const { data: item, error } = await sb
      .from("closet_items")
      .insert({
        user_id: user.id,
        image_url: imageUrl,
        category: analysis.category,
        color: analysis.color,
        tags: analysis.tags,
        label: analysis.label,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ item });
  } catch (e: any) {
    console.error("[/api/closet] error:", e);
    return NextResponse.json(
      { error: "No pudimos analizar la prenda. Intenta con otra foto." },
      { status: 500 }
    );
  }
}

// DELETE /api/closet?id=xxx
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const user = await getUser(session?.pinterestId);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Falta el id" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { error } = await sb
    .from("closet_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
