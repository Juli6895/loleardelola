import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getOrCreateUserId } from "@/lib/device-user";
import { revisarTope } from "@/lib/limites";

// GET /api/outfits → lista los outfits guardados en este dispositivo
export async function GET(req: Request) {
  const userId = await getOrCreateUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Falta el id de dispositivo" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("outfits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ outfits: data ?? [] });
}

// POST /api/outfits → guarda un outfit
// Body: { imageUrl, tags: string[], pinterestUrl? }
export async function POST(req: Request) {
  const userId = await getOrCreateUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Falta el id de dispositivo" }, { status: 400 });
  }

  const body = await req.json();
  if (!body.imageUrl || !Array.isArray(body.tags)) {
    return NextResponse.json(
      { error: "Faltan campos: imageUrl y tags son obligatorios" },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();
  const { data: outfit, error } = await sb
    .from("outfits")
    .insert({
      user_id: userId,
      image_url: body.imageUrl,
      tags: body.tags,
      pinterest_url: body.pinterestUrl ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Registramos también la búsqueda asociada
  await sb.from("searches").insert({
    user_id: userId,
    outfit_id: outfit.id,
    search_terms: body.tags,
  });

  return NextResponse.json({ outfit });
}

// DELETE /api/outfits?id=xxx
export async function DELETE(req: Request) {
  const userId = await getOrCreateUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Falta el id de dispositivo" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Falta el id" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { error } = await sb
    .from("outfits")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
