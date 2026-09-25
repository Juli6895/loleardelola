import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { exigirAdmin } from "@/lib/admin";

// GET /api/admin/tablero → todo lo que pinta la página /admin.
//
// Va en una sola petición y no en ocho: son consultas chicas sobre
// vistas ya agregadas, y así la página se dibuja de una en vez de ir
// apareciendo por pedazos.
//
// Las vistas viven en la base (ver supabase/migracion-eventos.sql) para
// que la definición del embudo esté en un solo lugar.
export async function GET(req: Request) {
  const permiso = await exigirAdmin(req);
  if (!permiso.ok) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  const sb = supabaseAdmin();

  // Si una vista falla (por ejemplo porque falta correr la migración),
  // esa sección se muestra vacía en vez de tumbar el tablero entero.
  const leer = async (vista: string, orden?: string) => {
    const q = sb.from(vista).select("*");
    const { data, error } = orden ? await q.order(orden) : await q;
    if (error) {
      console.warn(`[admin/tablero] ${vista}:`, error.message);
      return [];
    }
    return data ?? [];
  };

  const inicioDeMes = new Date();
  inicioDeMes.setDate(1);
  inicioDeMes.setHours(0, 0, 0, 0);

  const contarDelMes = (nombreEvento: string) =>
    sb
      .from("eventos")
      .select("id", { count: "exact", head: true })
      .eq("nombre", nombreEvento)
      .gte("created_at", inicioDeMes.toISOString())
      .then((r) => r.count ?? 0);

  const [
    niveles,
    embudo,
    embudoPago,
    errores,
    seQuedaron,
    actividad,
    servicios,
    porVencer,
    pagos,
    registrosDelMes,
    ingresosDelMes,
  ] = await Promise.all([
    leer("v_resumen_niveles"),
    leer("v_embudo_general", "orden"),
    leer("v_embudo_pago", "orden"),
    leer("v_errores"),
    leer("v_se_quedaron_pagando"),
    leer("v_actividad_diaria", "dia"),
    leer("v_servicios_usados", "orden"),
    sb
      .from("users")
      .select("email, name, premium_until")
      .not("premium_until", "is", null)
      .order("premium_until")
      .then((r) => r.data ?? []),
    sb
      .from("pagos")
      .select("monto_cop, acreditado_at")
      .eq("estado", "acreditado")
      .then((r) => r.data ?? []),
    contarDelMes("registro_ok"),
    contarDelMes("ingreso_ok"),
  ]);

  // Lo cobrado este mes, menos la comisión estimada de Bold
  // (3,29% + $900 por transacción). Es estimación: la tarifa exacta
  // depende del medio de pago y del volumen del mes.
  const delMes = pagos.filter(
    (p: any) => p.acreditado_at && new Date(p.acreditado_at) >= inicioDeMes
  );
  const bruto = delMes.reduce((a: number, p: any) => a + (p.monto_cop ?? 0), 0);
  const comision = delMes.reduce(
    (a: number, p: any) => a + (p.monto_cop ?? 0) * 0.0329 + 900,
    0
  );

  return NextResponse.json({
    niveles,
    embudo,
    embudoPago,
    errores: errores.slice(0, 20),
    seQuedaron,
    actividad,
    servicios,
    dinero: {
      pagosDelMes: delMes.length,
      brutoCop: Math.round(bruto),
      netoEstimadoCop: Math.round(bruto - (delMes.length ? comision : 0)),
    },
    cuentas: {
      registrosDelMes,
      ingresosDelMes,
    },
    porVencer: porVencer.filter((u: any) => {
      const dias = (new Date(u.premium_until).getTime() - Date.now()) / 86400000;
      return dias > 0 && dias <= 15;
    }),
  });
}
