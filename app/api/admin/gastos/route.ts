import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { exigirAdmin } from "@/lib/admin";

// Gastos que se ingresan a mano en /admin (ver supabase/migracion-gastos.sql):
// fijos (cada mes, mientras estén activos) y variables (puntuales, en el
// mes de su fecha). El tablero los suma a los costos.
//
//   GET                          → { gastos }
//   POST   { tipo, rubro, valor_cop, fecha?, detalle? } → { gasto }
//   PATCH  { id, ...campos }     → { gasto }   (p. ej. { id, activo: false })
//   DELETE ?id=…                 → { ok }
export const dynamic = "force-dynamic";

const TIPOS = ["fijo", "variable"] as const;

/** Los campos que se pueden guardar, ya revisados. null: algo no sirve. */
function limpiar(body: any, parcial: boolean): Record<string, unknown> | string {
  const fila: Record<string, unknown> = {};
  if (body.tipo !== undefined || !parcial) {
    if (!TIPOS.includes(body.tipo)) return "El tipo debe ser fijo o variable.";
    fila.tipo = body.tipo;
  }
  if (body.rubro !== undefined || !parcial) {
    const rubro = String(body.rubro ?? "").trim().slice(0, 80);
    if (!rubro) return "Escribe el nombre del gasto.";
    fila.rubro = rubro;
  }
  if (body.valor_cop !== undefined || !parcial) {
    const valor = Math.round(Number(String(body.valor_cop ?? "").replace(/[^\d.-]/g, "")));
    if (!Number.isFinite(valor) || valor < 0 || valor > 1_000_000_000) return "Escribe un valor en pesos.";
    fila.valor_cop = valor;
  }
  if (body.fecha !== undefined && body.fecha !== "") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.fecha))) return "La fecha no es válida.";
    fila.fecha = body.fecha;
  }
  if (body.detalle !== undefined) fila.detalle = String(body.detalle ?? "").trim().slice(0, 200) || null;
  if (body.activo !== undefined) fila.activo = !!body.activo;
  return fila;
}

const sinTabla = (msg: string) => /gastos/.test(msg) && /exist|relation|schema cache/i.test(msg);

export async function GET(req: Request) {
  const permiso = await exigirAdmin(req);
  if (!permiso.ok) return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  const { data, error } = await supabaseAdmin()
    .from("gastos")
    .select("id, tipo, rubro, detalle, valor_cop, fecha, activo, created_at")
    .order("tipo", { ascending: true })
    .order("fecha", { ascending: false });
  if (error) {
    if (sinTabla(error.message)) return NextResponse.json({ gastos: [], falta: "migracion-gastos.sql" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ gastos: data ?? [] });
}

export async function POST(req: Request) {
  const permiso = await exigirAdmin(req);
  if (!permiso.ok) return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  const fila = limpiar(await req.json().catch(() => ({})), false);
  if (typeof fila === "string") return NextResponse.json({ error: fila }, { status: 400 });
  const { data, error } = await supabaseAdmin().from("gastos").insert(fila).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ gasto: data });
}

export async function PATCH(req: Request) {
  const permiso = await exigirAdmin(req);
  if (!permiso.ok) return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "Falta cuál gasto." }, { status: 400 });
  const fila = limpiar(body, true);
  if (typeof fila === "string") return NextResponse.json({ error: fila }, { status: 400 });
  const { data, error } = await supabaseAdmin().from("gastos").update(fila).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ gasto: data });
}

export async function DELETE(req: Request) {
  const permiso = await exigirAdmin(req);
  if (!permiso.ok) return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta cuál gasto." }, { status: 400 });
  const { error } = await supabaseAdmin().from("gastos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
