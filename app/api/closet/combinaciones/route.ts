import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";
import { puedeVerCombinaciones } from "@/lib/limites";
import { combinacionesConFotos } from "@/lib/combinaciones";
import { contextoDe, registrar } from "@/lib/eventos";
import type { ClosetCategory } from "@/types";

// POST /api/closet/combinaciones  { itemId }
//
// Busca, en el catálogo real de las tiendas, prendas que combinen con
// UNA prenda puntual del clóset de la usuaria. Gratis en sus primeras
// prendas subidas (ver combinacionesClosetGratis en lib/planes.ts);
// después de eso, pide membresía — igual que el Manual de estilo, usa
// la misma búsqueda en catálogos reales.
export async function POST(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario) {
    return NextResponse.json({ error: "No pudimos identificarte." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const itemId = typeof body?.itemId === "string" ? body.itemId : null;
  if (!itemId) {
    return NextResponse.json({ error: "Falta la prenda." }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: item } = await sb
    .from("closet_items")
    .select("id, user_id, category, color, tags, label")
    .eq("id", itemId)
    .maybeSingle();

  if (!item || item.user_id !== usuario.id) {
    return NextResponse.json({ error: "No encontramos esa prenda." }, { status: 404 });
  }

  const permiso = await puedeVerCombinaciones(usuario, itemId);
  if (!permiso.permitido) {
    return NextResponse.json(
      { error: permiso.mensaje, destrabaCon: permiso.destrabaCon, limite: true },
      { status: 402 }
    );
  }

  try {
    const combinaciones = await combinacionesConFotos({
      categoria: item.category as ClosetCategory,
      color: item.color,
      tags: item.tags ?? [],
      label: item.label ?? null,
    });
    registrar("combinacion_buscada", contextoDe(req, usuario.id), { categoria: item.category });
    return NextResponse.json({ combinaciones });
  } catch (e) {
    console.error("[api/closet/combinaciones] falló:", e);
    registrar("combinacion_error", contextoDe(req, usuario.id));
    return NextResponse.json(
      { error: "No pudimos buscar combinaciones. Intenta en un momento." },
      { status: 500 }
    );
  }
}
