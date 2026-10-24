import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { exigirAdmin } from "@/lib/admin";
import { CORREOS_PRUEBA } from "@/lib/admin-correos";

// GET /api/admin/tablero → todo lo que pinta la página /admin.
//
// Se calcula acá, a partir de los eventos (lib/eventos.ts), y no con
// vistas en la base: así agregar una métrica no exige correr una
// migración, y es fácil dejar por fuera las cuentas de prueba.
//
// Las cuentas de prueba (CORREOS_PRUEBA) no cuentan en ninguna cifra,
// y tampoco lo que pase en los navegadores donde se entró con ellas.
export const dynamic = "force-dynamic";

type Evento = {
  nombre: string;
  props: Record<string, any> | null;
  user_id: string | null;
  device_id: string | null;
  created_at: string;
};

// Las secciones de la app, con el evento que anota cada visita y el
// nombre con que se anota el tiempo (ver useAnotarUnaVez).
const SECCIONES = [
  { clave: "inicio", nombre: "Inicio", evento: "inicio_visto" },
  { clave: "buscar", nombre: "Buscar", evento: "buscar_visto" },
  { clave: "closet", nombre: "Mi clóset", evento: "closet_visto" },
  { clave: "perfil", nombre: "Mi perfil", evento: "perfil_visto" },
  { clave: "outfits", nombre: "Mis outfits", evento: "outfits_visto" },
  { clave: "manual", nombre: "Mi manual", evento: "manual_visto" },
  { clave: "membresia", nombre: "Membresía", evento: "membresia_vista" },
];

const EMBUDO = [
  { paso: "Entraron a la página", evento: null },
  { paso: "Buscaron un outfit", evento: "busqueda_ok" },
  { paso: "Crearon su cuenta", evento: "registro_ok" },
  { paso: "Vieron la membresía", evento: "membresia_vista" },
  { paso: "Abrieron el pago", evento: "pago_abierto" },
  { paso: "Pagaron", evento: "pago_aprobado" },
];

// En qué parte de la app pasó cada error.
const LUGAR_ERROR: Record<string, string> = {
  busqueda_error: "Buscar por foto",
  combinacion_error: "Mi clóset · combinaciones",
  manual_error: "Mi manual",
  pago_error: "Membresía · abrir el pago",
  ingreso_error: "Entrar con el correo",
  aviso_error: "Avisos de rebaja",
  foto_catalogo_error: "Mi clóset · foto",
  outfit_foto_error: "Mi clóset · foto del outfit",
  figura_error: "Mi perfil · ilustración",
  tope_alcanzado: "Se topó con un límite",
};

function lugarDe(e: Evento): string {
  if (e.nombre === "pagina_error") return `Página ${e.props?.ruta ?? ""}`.trim();
  const base = LUGAR_ERROR[e.nombre] ?? e.nombre;
  if (e.nombre === "aviso_error" && e.props?.paso) return `${base} · ${e.props.paso}`;
  if (e.nombre === "tope_alcanzado" && e.props?.recurso) return `${base} · ${e.props.recurso}`;
  return base;
}

function esError(nombre: string): boolean {
  return nombre.endsWith("_error") || nombre === "tope_alcanzado";
}

export async function GET(req: Request) {
  const permiso = await exigirAdmin(req);
  if (!permiso.ok) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }
  const sb = supabaseAdmin();

  // ---------------------------------------------- las cuentas de prueba
  const { data: deprueba } = await sb
    .from("users")
    .select("id, device_id")
    .in("email", CORREOS_PRUEBA);
  const idsPrueba = new Set((deprueba ?? []).map((u) => u.id));
  const dispositivosPrueba = new Set((deprueba ?? []).map((u) => u.device_id).filter(Boolean));

  // ----------------------------------------------------- los eventos
  const todos: Evento[] = [];
  for (let desde = 0; desde < 50000; desde += 1000) {
    const { data, error } = await sb
      .from("eventos")
      .select("nombre, props, user_id, device_id, created_at")
      .order("created_at", { ascending: true })
      .range(desde, desde + 999);
    if (error) {
      console.error("[admin/tablero] eventos:", error.message);
      break;
    }
    todos.push(...((data ?? []) as Evento[]));
    if (!data || data.length < 1000) break;
  }
  // Los navegadores donde alguna vez se entró con una cuenta de prueba.
  for (const e of todos) if (e.user_id && idsPrueba.has(e.user_id) && e.device_id) dispositivosPrueba.add(e.device_id);
  const eventos = todos.filter(
    (e) => !(e.user_id && idsPrueba.has(e.user_id)) && !(e.device_id && dispositivosPrueba.has(e.device_id))
  );

  const persona = (e: Evento) => e.user_id ?? e.device_id ?? "?";
  const personasCon = (nombre: string | null) =>
    new Set(eventos.filter((e) => nombre === null || e.nombre === nombre).map(persona)).size;

  // -------------------------------------------------------- resumen
  const ahora = new Date();
  const { data: conMembresia } = await sb
    .from("users")
    .select("id, email, name, premium_until")
    .not("premium_until", "is", null);
  const activas = (conMembresia ?? []).filter(
    (u) => !idsPrueba.has(u.id) && new Date(u.premium_until).getTime() > ahora.getTime()
  );

  const { data: pagos } = await sb
    .from("pagos")
    .select("user_id, plan, monto_cop, acreditado_at")
    .eq("estado", "acreditado")
    .order("acreditado_at", { ascending: false });
  const pagosReales = (pagos ?? []).filter((p) => !idsPrueba.has(p.user_id));
  // El plan de cada membresía activa: el de su último pago.
  const planDe = new Map<string, string>();
  for (const p of pagosReales) if (!planDe.has(p.user_id)) planDe.set(p.user_id, p.plan);
  const mensuales = activas.filter((u) => planDe.get(u.id) === "mensual").length;
  const anuales = activas.filter((u) => planDe.get(u.id) === "anual").length;

  const { count: cuentasCreadas } = await sb
    .from("users")
    .select("id", { count: "exact", head: true })
    .not("email", "is", null)
    .not("email", "in", `(${CORREOS_PRUEBA.map((c) => `"${c}"`).join(",")})`);

  // --------------------------------------------------------- embudo
  const embudo = EMBUDO.map((p) => ({ paso: p.paso, personas: personasCon(p.evento) }));

  // ------------------------------------------------------ secciones
  const secciones = SECCIONES.map((s) => {
    const visitas = eventos.filter((e) => e.nombre === s.evento);
    const tiempos = eventos
      .filter((e) => e.nombre === "tiempo_pagina" && e.props?.seccion === s.clave)
      .map((e) => Number(e.props?.segundos) || 0)
      .filter((n) => n > 0);
    const promedio = tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : 0;
    return {
      seccion: s.nombre,
      visitas: visitas.length,
      personas: new Set(visitas.map(persona)).size,
      minutosPromedio: Math.round((promedio / 60) * 10) / 10,
    };
  });

  // -------------------------------------------------------- errores
  const porError = new Map<string, { lugar: string; error: string; veces: number; personas: Set<string>; ultimaVez: string }>();
  for (const e of eventos.filter((x) => esError(x.nombre))) {
    const lugar = lugarDe(e);
    const error = String(e.props?.motivo ?? e.props?.estado ?? e.props?.recurso ?? "Sin detalle").slice(0, 160);
    const clave = `${lugar}|${error}`;
    const fila = porError.get(clave) ?? { lugar, error, veces: 0, personas: new Set<string>(), ultimaVez: e.created_at };
    fila.veces++;
    fila.personas.add(persona(e));
    if (e.created_at > fila.ultimaVez) fila.ultimaVez = e.created_at;
    porError.set(clave, fila);
  }
  const errores = Array.from(porError.values())
    .map((f) => ({ ...f, personas: f.personas.size }))
    .sort((a, b) => b.veces - a.veces)
    .slice(0, 30);

  // ---------------------------------------------- clics a comercios
  const clics = eventos.filter((e) => e.nombre === "comercio_clic");
  const agrupar = (clave: (e: Evento) => string | null) => {
    const m = new Map<string, { clics: number; personas: Set<string>; tienda: string }>();
    for (const e of clics) {
      const k = clave(e);
      if (!k) continue;
      const f = m.get(k) ?? { clics: 0, personas: new Set<string>(), tienda: String(e.props?.tienda ?? "") };
      f.clics++;
      f.personas.add(persona(e));
      m.set(k, f);
    }
    return Array.from(m.entries())
      .map(([nombre, f]) => ({ nombre, tienda: f.tienda, clics: f.clics, personas: f.personas.size }))
      .sort((a, b) => b.clics - a.clics)
      .slice(0, 20);
  };
  const comercios = agrupar((e) => (e.props?.tienda ? String(e.props.tienda) : null));
  const prendas = agrupar((e) => (e.props?.prenda ? String(e.props.prenda) : null));

  // ------------------------------------------------- actividad diaria
  const hace30 = new Date(ahora.getTime() - 30 * 86400000).toISOString();
  const porDia = new Map<string, { personas: Set<string>; busquedas: number; registros: number; pagos: number }>();
  for (const e of eventos.filter((x) => x.created_at >= hace30)) {
    // El día en Colombia (UTC-5), no en UTC.
    const dia = new Date(new Date(e.created_at).getTime() - 5 * 3600000).toISOString().slice(0, 10);
    const f = porDia.get(dia) ?? { personas: new Set<string>(), busquedas: 0, registros: 0, pagos: 0 };
    f.personas.add(persona(e));
    if (e.nombre === "busqueda_ok") f.busquedas++;
    if (e.nombre === "registro_ok") f.registros++;
    if (e.nombre === "pago_aprobado") f.pagos++;
    porDia.set(dia, f);
  }
  const actividad = Array.from(porDia.entries())
    .map(([dia, f]) => ({ dia, personas: f.personas.size, busquedas: f.busquedas, registros: f.registros, pagos: f.pagos }))
    .sort((a, b) => b.dia.localeCompare(a.dia));

  // ---------------------------------------------------------- dinero
  // Lo cobrado este mes, menos la comisión estimada de Bold
  // (3,29% + $900 por transacción). Es estimación: la tarifa exacta
  // depende del medio de pago y del volumen del mes.
  const inicioDeMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const delMes = pagosReales.filter((p) => p.acreditado_at && new Date(p.acreditado_at) >= inicioDeMes);
  const bruto = delMes.reduce((a, p) => a + (p.monto_cop ?? 0), 0);
  const comision = delMes.reduce((a, p) => a + (p.monto_cop ?? 0) * 0.0329 + 900, 0);

  return NextResponse.json({
    desde: todos[0]?.created_at ?? null,
    resumen: {
      personas: personasCon(null),
      cuentasCreadas: cuentasCreadas ?? 0,
      membresiasActivas: activas.length,
      mensuales,
      anuales,
    },
    embudo,
    secciones,
    errores,
    comercios,
    prendas,
    actividad,
    dinero: {
      pagosDelMes: delMes.length,
      brutoCop: Math.round(bruto),
      netoEstimadoCop: Math.round(bruto - comision),
    },
    porVencer: activas
      .filter((u) => (new Date(u.premium_until).getTime() - ahora.getTime()) / 86400000 <= 15)
      .map((u) => ({ email: u.email, name: u.name, premium_until: u.premium_until })),
  });
}
