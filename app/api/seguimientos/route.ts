import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";
import { esAdmin } from "@/lib/admin-correos";
import { revisarCupo } from "@/lib/limites";
import { ME_GUSTA_GRATIS } from "@/lib/planes";
import { tiendaDeUrl } from "@/lib/catalogo-tiendas";
import { precioActual } from "@/lib/precios";
import { contextoDe, registrar } from "@/lib/eventos";

// GET    /api/seguimientos            → las prendas que sigue
// POST   /api/seguimientos  { url, titulo, imagen?, precioCop? } → "Avísame si baja"
// DELETE /api/seguimientos?url=...    → dejar de seguirla
//
// Con cuenta gratis se pueden dar hasta 3 me gusta, sin aviso de rebaja.
// Los avisos son de la membresía (o de la cuenta de administración, para
// probar): los filtra app/api/revisar-precios. Solo prendas de las tiendas
// de la lista: son las únicas de las que se puede leer el precio.

async function cargar(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario?.conSesion) return { error: "Entra con tu correo para dar me gusta a tus prendas.", status: 401 as const };
  const avisos = usuario.plan === "membresia" || esAdmin(usuario.email);
  return { usuario, avisos };
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
  return NextResponse.json({ seguimientos: data ?? [], puede: true, avisos: r.avisos });
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
  if (r.avisos) {
    const cupo = await revisarCupo(r.usuario, "meGusta");
    if (!cupo.permitido) return NextResponse.json({ error: cupo.mensaje }, { status: 429 });
  } else {
    const { count } = await sb
      .from("seguimientos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", r.usuario.id)
      .eq("activo", true);
    if ((count ?? 0) >= ME_GUSTA_GRATIS) {
      return NextResponse.json(
        { error: `Con tu cuenta gratis tienes ${ME_GUSTA_GRATIS} me gusta. Con la membresía tienes muchos más y te avisamos si bajan de precio.` },
        { status: 402 }
      );
    }
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
  return NextResponse.json({ ok: true, precioCop: precio, avisos: r.avisos });
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
