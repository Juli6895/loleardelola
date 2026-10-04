import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";
import { puedeVerFotoDelOutfit } from "@/lib/limites";
import { fotoDelOutfit, type PiezaDelOutfit } from "@/lib/foto-prenda";
import { contextoDe, registrar } from "@/lib/eventos";

export const maxDuration = 90;

// POST /api/closet/outfit-foto
//   { itemId, piezas: [{ foto: url de la tienda, nombre: "blazer negro" }] }
//
// La foto del outfit que se acaba de armar en "Buscar combinaciones": la
// prenda de ella con las prendas de tienda sugeridas, compuesta por
// Gemini. Una foto por combinación buscada (ver puedeVerFotoDelOutfit).
export async function POST(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario) return NextResponse.json({ error: "No pudimos identificarte." }, { status: 400 });

  const permiso = await puedeVerFotoDelOutfit(usuario);
  if (!permiso.permitido) {
    return NextResponse.json({ error: permiso.mensaje, limite: true }, { status: 402 });
  }

  const body = await req.json().catch(() => null);
  const itemId = typeof body?.itemId === "string" ? body.itemId : null;
  const piezas: PiezaDelOutfit[] = (Array.isArray(body?.piezas) ? body.piezas : [])
    .filter(
      (p: any) =>
        typeof p?.foto === "string" &&
        /^https:\/\//.test(p.foto) &&
        p.foto.length < 1000 &&
        typeof p?.nombre === "string"
    )
    .slice(0, 4)
    .map((p: any) => ({ foto: p.foto, nombre: p.nombre.slice(0, 80) }));
  if (!itemId || piezas.length === 0) {
    return NextResponse.json({ error: "Faltan las prendas del outfit." }, { status: 400 });
  }

  const { data: item } = await supabaseAdmin()
    .from("closet_items")
    .select("user_id, image_url, label")
    .eq("id", itemId)
    .maybeSingle();
  if (!item || item.user_id !== usuario.id) {
    return NextResponse.json({ error: "No encontramos esa prenda." }, { status: 404 });
  }

  try {
    const url = await fotoDelOutfit({ foto: item.image_url, nombre: item.label ?? "her garment" }, piezas);
    registrar("outfit_foto_generada", contextoDe(req, usuario.id), { piezas: piezas.length });
    return NextResponse.json({ fotoUrl: url });
  } catch (e) {
    console.error("[api/closet/outfit-foto] falló:", e);
    registrar("outfit_foto_error", contextoDe(req, usuario.id), {
      motivo: e instanceof Error ? e.message.slice(0, 120) : "desconocido",
    });
    return NextResponse.json({ error: "No pudimos armar la foto del outfit." }, { status: 500 });
  }
}
