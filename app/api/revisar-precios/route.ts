import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { compararPrecio, precioActual } from "@/lib/precios";
import { notificar } from "@/lib/push";
import { enviarAvisoRebaja } from "@/lib/email";
import { esAdmin } from "@/lib/admin-correos";
import { registrar } from "@/lib/eventos";

// GET /api/revisar-precios — los avisos de rebaja.
//
// Vercel la llama una vez al día (ver "crons" en vercel.json). Mira el
// precio de hoy de cada prenda que alguna usuaria con membresía marcó
// con "Avísame si baja", y si bajó al menos REBAJA_MINIMA desde que la
// marcó (y más de lo que ya se le avisó), le manda una notificación.
//
// Se compara contra el precio que ELLA vio, no contra el "antes" que
// muestra la tienda: hay tiendas con "antes" en casi todo el catálogo.
//
// El aviso va por notificación. Solo si no tiene las notificaciones
// activadas en ningún celular ni navegador (no dio permiso, se dio de
// baja), se le manda por correo (decisión de Juliana, noviembre de 2026).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const POR_VEZ = 200;
const EN_PARALELO = 8;

const pesos = (n: number) => "$" + n.toLocaleString("es-CO");

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  // Primero las que hace más tiempo no se revisan.
  const { data: lista, error } = await sb
    .from("seguimientos")
    .select("id, user_id, url, titulo, tienda, imagen, precio_inicial, precio_avisado, users!inner(premium_until, email)")
    .eq("activo", true)
    .order("revisado_at", { ascending: true, nullsFirst: true })
    .limit(POR_VEZ);
  if (error) {
    console.error("[revisar-precios]", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const ahora = new Date();
  // Solo de quien tiene la membresía vigente.
  const vigentes = (lista ?? []).filter((s: any) => {
    const u = Array.isArray(s.users) ? s.users[0] : s.users;
    return (u?.premium_until && new Date(u.premium_until) > ahora) || esAdmin(u?.email);
  });
  const correoDe = (s: any): string | null => {
    const u = Array.isArray(s.users) ? s.users[0] : s.users;
    return u?.email ?? null;
  };

  let revisadas = 0;
  let avisos = 0;
  for (let i = 0; i < vigentes.length; i += EN_PARALELO) {
    await Promise.all(
      vigentes.slice(i, i + EN_PARALELO).map(async (s: any) => {
        const hoy = await precioActual(s.url);
        revisadas++;
        if (!hoy) {
          await sb.from("seguimientos").update({ revisado_at: ahora.toISOString() }).eq("id", s.id);
          return;
        }

        const { avisar: bajo, cambios } = compararPrecio(s, hoy);

        if (bajo) {
          const porcentaje = Math.round((1 - hoy.precioCop / s.precio_inicial) * 100);
          const aviso = {
            titulo: `¡Bajó ${porcentaje}%! ${s.titulo}`,
            cuerpo: `En ${s.tienda}: ahora ${pesos(hoy.precioCop)} (la viste en ${pesos(s.precio_inicial)}).`,
            url: s.url,
            imagen: s.imagen,
          };
          const llegaron = await notificar(s.user_id, aviso);
          const correo = correoDe(s);
          const porCorreo = llegaron === 0 && correo ? (await enviarAvisoRebaja(correo, aviso)).enviado : false;
          if (llegaron > 0 || porCorreo) avisos++;
          registrar("aviso_rebaja_enviado", { userId: s.user_id }, { porcentaje, llegaron, porCorreo });
        }

        await sb.from("seguimientos").update(cambios).eq("id", s.id);
      })
    );
  }

  return NextResponse.json({ ok: true, revisadas, avisos });
}
