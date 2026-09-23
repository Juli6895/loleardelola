import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolverUserId } from "@/lib/sesion";
import { revisarTope } from "@/lib/limites";
import { uploadImage } from "@/lib/cloudinary";
import { analyzeClosetItem } from "@/lib/garment-ai";

// El tope de prendas ya no vive acá: está en lib/planes.ts junto con
// los de búsquedas y outfits, y se aplica con revisarTope().

// Helper: resuelve el usuario de este dispositivo.
async function getUser(req: Request): Promise<{ id: string } | null> {
  const userId = await resolverUserId(req);
  if (!userId) return null;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  return data ?? null;
}

// GET /api/closet → lista las prendas del clóset de este dispositivo
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Falta el id de dispositivo" }, { status: 400 });
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
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Falta el id de dispositivo" }, { status: 400 });
  }

  const body = await req.json();
  if (!body.imageBase64) {
    return NextResponse.json(
      { error: "Falta imageBase64" },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();

  // Tope de prendas según el plan (ver lib/planes.ts). Se revisa antes
  // de subir para no gastar Cloudinary ni Claude en una prenda que no
  // vamos a poder guardar.
  const tope = await revisarTope(req, "prendasCloset");
  if (!tope.permitido) {
    return NextResponse.json(
      { error: tope.mensaje, destrabaCon: tope.destrabaCon, limite: true },
      { status: 402 }
    );
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
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Falta el id de dispositivo" }, { status: 400 });
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
