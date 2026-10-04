import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";
import { analyzeClosetItem } from "@/lib/garment-ai";
import { esFotoDeCatalogo, fotoDeCatalogo } from "@/lib/foto-prenda";
import { contextoDe, registrar } from "@/lib/eventos";
import type { ClosetCategory } from "@/types";

export const maxDuration = 90;

// POST /api/closet/foto  { itemId }
//
// Para las prendas que se subieron antes de la foto de catálogo: Gemini
// la hace a partir de la foto que ya estaba, y Claude vuelve a leer la
// prenda con ella (tipo, color, estampado), que es de donde sale la
// búsqueda de combinaciones.
//
// Una sola vez por prenda: si ya tiene foto de catálogo, se devuelve
// como está. Eso acota el costo sin un tope mensual aparte — nadie
// tiene más prendas viejas que las que ya subió. Solo con cuenta.
export async function POST(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario?.conSesion) {
    return NextResponse.json(
      { error: "Crea tu cuenta gratis y dejamos tus prendas en foto de catálogo." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const itemId = typeof body?.itemId === "string" ? body.itemId : null;
  if (!itemId) return NextResponse.json({ error: "Falta la prenda." }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: item } = await sb.from("closet_items").select("*").eq("id", itemId).maybeSingle();
  if (!item || item.user_id !== usuario.id) {
    return NextResponse.json({ error: "No encontramos esa prenda." }, { status: 404 });
  }
  if (esFotoDeCatalogo(item.image_url)) return NextResponse.json({ item });

  const categoria = item.category as ClosetCategory;
  let imageUrl: string;
  try {
    imageUrl = await fotoDeCatalogo(item.image_url, categoria);
  } catch (e) {
    console.error("[api/closet/foto] Gemini falló:", e);
    registrar("foto_catalogo_error", contextoDe(req, usuario.id), {
      motivo: e instanceof Error ? e.message.slice(0, 120) : "desconocido",
    });
    return NextResponse.json(
      { error: "No pudimos mejorar la foto. Intenta en un momento." },
      { status: 500 }
    );
  }
  registrar("foto_catalogo_generada", contextoDe(req, usuario.id), { origen: "mejorar" });

  // La foto ya está pagada: se guarda aunque la lectura falle.
  let cambios: Record<string, unknown> = { image_url: imageUrl };
  try {
    const a = await analyzeClosetItem(imageUrl, categoria, item.image_url);
    cambios = { ...cambios, color: a.color, tags: a.tags, label: a.label };
  } catch (e) {
    console.warn("[api/closet/foto] no se pudo volver a leer la prenda:", e);
  }

  const { data: actualizado, error } = await sb
    .from("closet_items")
    .update(cambios)
    .eq("id", item.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: actualizado });
}
