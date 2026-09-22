import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { activarMembresia, exigirAdmin } from "@/lib/admin";

// GET /api/admin/membresias → pagos anotados y quién tiene membresía.
export async function GET(req: Request) {
  const permiso = await exigirAdmin(req);
  if (!permiso.ok) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  const sb = supabaseAdmin();
  const { data: pagos } = await sb
    .from("pagos")
    .select("order_id, plan, monto_cop, estado, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(50);

  // El correo no está en `pagos`: se busca aparte para no duplicar el
  // dato en dos tablas y que puedan quedar distintos.
  const ids = Array.from(new Set((pagos ?? []).map((p) => p.user_id).filter(Boolean)));
  const { data: usuarios } = ids.length
    ? await sb.from("users").select("id, email, name, premium_until").in("id", ids)
    : { data: [] as any[] };

  const porId = new Map((usuarios ?? []).map((u) => [u.id, u]));

  const { data: conMembresia } = await sb
    .from("users")
    .select("email, name, premium_until")
    .not("premium_until", "is", null)
    .order("premium_until", { ascending: false });

  return NextResponse.json({
    pagos: (pagos ?? []).map((p) => ({
      ...p,
      correo: porId.get(p.user_id)?.email ?? null,
      nombre: porId.get(p.user_id)?.name ?? null,
    })),
    miembros: conMembresia ?? [],
  });
}

// POST /api/admin/membresias  { correo, plan }
// Activa la membresía después de verificar el pago en la app de Bold.
export async function POST(req: Request) {
  const permiso = await exigirAdmin(req);
  if (!permiso.ok) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  const body = await req.json();
  const correo = typeof body.correo === "string" ? body.correo : "";
  const plan = body.plan === "anual" ? "anual" : "mensual";
  if (!correo.trim()) {
    return NextResponse.json({ error: "Falta el correo." }, { status: 400 });
  }

  const r = await activarMembresia(correo, plan);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, hasta: r.hasta });
}
