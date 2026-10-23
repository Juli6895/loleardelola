import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";
import { esAdmin } from "@/lib/admin-correos";
import { tiendaDeUrl } from "@/lib/catalogo-tiendas";
import { precioActual } from "@/lib/precios";
import { contextoDe, registrar } from "@/lib/eventos";

// GET    /api/seguimientos            → las prendas que sigue
// POST   /api/seguimientos  { url, titulo, imagen?, precioCop? } → "Avísame si baja"
// DELETE /api/seguimientos?url=...    → dejar de seguirla
//
// Los avisos de rebaja son parte de la membresía (o de la cuenta de
// administración, para probar). Solo prendas de las tiendas de la
// lista: son las únicas de las que se puede leer el precio.

const MAXIMO_ACTIVOS = 30;

async function cargar(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario?.conSesion) return { error: "Entra con tu correo para usar los avisos de rebaja.", status: 401 as const };
  if (usuario.plan !== "membresia" && !esAdmin(usuario.email)) {
    return { error: "Los avisos de rebaja son parte de la membresía.", status: 402 as const };
  }
  return { usuario };
}

export async function GET(req: Request) {
  const r = await cargar(req);
  if ("error" in r) return NextResponse.json({ seguimientos: [], puede: false, motivo: r.error });

  const { data } = await supabaseAdmin()
    .from("seguimientos")
    .select("url, titulo, tienda, imagen, precio_inicial, precio_ultimo, avisado_at, created_at")
    .eq("user_id", r.usuario.id)
    .eq("activo", true)
    .order("created_at", { ascending: false });
  return NextResponse.json({ seguimientos: data ?? [], puede: true });
}

export async function POST(req: Request) {
  const r = await cargar(req);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const tienda = tiendaDeUrl(url);
  if (!url || url.length > 1000 || !tienda) {
    return NextResponse.json({ error: "Solo se pueden seguir prendas de las tiendas de la lista." }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { count } = await sb
    .from("seguimientos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", r.usuario.id)
    .eq("activo", true);
  if ((count ?? 0) >= MAXIMO_ACTIVOS) {
    return NextResponse.json(
      { error: `Ya sigues ${MAXIMO_ACTIVOS} prendas. Deja de seguir alguna en Mis outfits para agregar otra.` },
      { status: 429 }
    );
  }

  // El precio de partida lo lee el servidor en la tienda, no el que
  // manda el navegador: contra este se decide si "bajó".
  const hoy = await precioActual(url);
  const precio = hoy?.precioCop ?? (Number.isInteger(body?.precioCop) && body.precioCop > 0 ? body.precioCop : null);
  if (!precio) {
    return NextResponse.json({ error: "No pudimos leer el precio de esa prenda en la tienda." }, { status: 502 });
  }

  const { error } = await sb.from("seguimientos").upsert(
    {
      user_id: r.usuario.id,
      url,
      titulo: String(body?.titulo ?? "").slice(0, 200) || "Prenda",
      tienda: tienda.nombre,
      dominio: tienda.dominio,
      imagen: typeof body?.imagen === "string" ? body.imagen.slice(0, 1000) : null,
      precio_inicial: precio,
      precio_ultimo: precio,
      precio_avisado: null,
      activo: true,
      avisado_at: null,
      revisado_at: new Date().toISOString(),
    },
    { onConflict: "user_id,url" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  registrar("seguimiento_creado", contextoDe(req, r.usuario.id), { tienda: tienda.dominio });
  return NextResponse.json({ ok: true, precioCop: precio });
}

export async function DELETE(req: Request) {
  const r = await cargar(req);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

  const url = new URL(req.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Falta la prenda." }, { status: 400 });

  await supabaseAdmin()
    .from("seguimientos")
    .update({ activo: false })
    .eq("user_id", r.usuario.id)
    .eq("url", url);
  return NextResponse.json({ ok: true });
}
