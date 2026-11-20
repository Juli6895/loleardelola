import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";
import { esAdmin } from "@/lib/admin-correos";
import { revisarCupo } from "@/lib/limites";
import { ME_GUSTA_GRATIS } from "@/lib/planes";
import { tiendaDeUrl } from "@/lib/catalogo-tiendas";
import { compararPrecio, precioActual } from "@/lib/precios";
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

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("seguimientos")
    .select("id, url, titulo, tienda, imagen, precio_inicial, precio_ultimo, precio_avisado, avisado_at, revisado_at, created_at")
    .eq("user_id", r.usuario.id)
    .eq("activo", true)
    .order("created_at", { ascending: false });
  const lista = data ?? [];

  // El precio se revisa una vez al día. Las que figuran rebajadas se
  // revisan otra vez al abrir la lista (si pasó más de una hora): si la
  // promoción ya se acabó, no siguen saliendo en rojo hasta mañana. El
  // aviso lo sigue mandando solo la revisión diaria.
  const haceUnaHora = Date.now() - 3600_000;
  const viejas = lista
    .filter((s) => s.precio_ultimo < s.precio_inicial && (!s.revisado_at || new Date(s.revisado_at).getTime() < haceUnaHora))
    .slice(0, 8);
  await Promise.all(
    viejas.map(async (s) => {
      const hoy = await precioActual(s.url);
      if (!hoy) return;
      const { cambios } = compararPrecio(s, hoy);
      delete cambios.precio_avisado;
      delete cambios.avisado_at;
      if (hoy.precioCop > s.precio_inicial * 0.9) cambios.precio_avisado = null;
      await sb.from("seguimientos").update(cambios).eq("id", s.id);
      Object.assign(s, cambios);
    })
  );

  const seguimientos = lista.map(({ id: _id, precio_avisado: _a, ...resto }) => resto);
  return NextResponse.json({ seguimientos, puede: true, avisos: r.avisos });
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
