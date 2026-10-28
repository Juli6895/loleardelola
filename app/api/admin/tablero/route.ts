import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { exigirAdmin } from "@/lib/admin";
import { CORREOS_PRUEBA, DISPOSITIVOS_PRUEBA } from "@/lib/admin-correos";
import { COMISION_BOLD, COSTOS_FIJOS, NOMBRE_SERVICIO, TRM, type ServicioIA } from "@/lib/costos";
import { cloudinary } from "@/lib/cloudinary";
import { tiendasConCatalogo } from "@/lib/catalogo-tiendas";
import { getTiendasInstagram } from "@/lib/tiendas-instagram";
import { getAllowedMerchants } from "@/lib/merchant-allowlist";
import { getExcludedMerchants } from "@/lib/merchant-exclusions";

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
  { clave: "promociones", nombre: "Promociones", evento: "promociones_visto" },
  { clave: "buscar", nombre: "Buscar", evento: "buscar_visto" },
  { clave: "closet", nombre: "Mi clóset", evento: "closet_visto" },
  { clave: "perfil", nombre: "Mi perfil", evento: "perfil_visto" },
  { clave: "outfits", nombre: "Mis outfits", evento: "outfits_visto" },
  { clave: "manual", nombre: "Mi manual", evento: "manual_visto" },
  { clave: "membresia", nombre: "Membresía", evento: "membresia_vista" },
  { clave: "preguntas", nombre: "Preguntas frecuentes", evento: "preguntas_visto" },
];

const EMBUDO = [
  { paso: "Entraron a la página", evento: null },
  { paso: "Buscaron un outfit", evento: "busqueda_ok" },
  { paso: "Crearon su cuenta", evento: "registro_ok" },
  // El gancho: se acabó la prueba gratis de promociones y vio el aviso.
  { paso: "Se les acabó la prueba de promos", evento: "promo_bloqueada" },
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
  const dispositivosPrueba = new Set([
    ...DISPOSITIVOS_PRUEBA,
    ...(deprueba ?? []).map((u) => u.device_id).filter(Boolean),
  ]);

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

  // ---------------------------------------------- quién es cada persona
  // Una persona es su cuenta. El navegador donde entró con su correo
  // cuenta como esa misma cuenta: antes, la visita sin sesión y la
  // visita ya con sesión sumaban dos personas.
  const { data: conCorreo } = await sb
    .from("users")
    .select("id, email, created_at, premium_until")
    .not("email", "is", null);
  const idsConCorreo = new Set((conCorreo ?? []).map((u) => u.id));
  const cuentaDelNavegador = new Map<string, string>();
  for (const e of eventos) {
    if (e.device_id && e.user_id && idsConCorreo.has(e.user_id)) cuentaDelNavegador.set(e.device_id, e.user_id);
  }
  const persona = (e: Evento) =>
    (e.device_id && cuentaDelNavegador.get(e.device_id)) || e.user_id || e.device_id || "?";
  // Lo que anota el servidor sin saber de quién es (el costo de cada
  // llamada a la IA) no es una visita: no cuenta como persona.
  const visitas = eventos.filter((e) => e.nombre !== "consumo_ia" && (e.user_id || e.device_id));
  const personasCon = (nombre: string | null) =>
    new Set(visitas.filter((e) => nombre === null || e.nombre === nombre).map(persona)).size;

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
  // Solo cuentan los pagos de membresía, no los paquetes de búsquedas.
  for (const p of pagosReales) {
    if ((p.plan === "mensual" || p.plan === "anual") && !planDe.has(p.user_id)) planDe.set(p.user_id, p.plan);
  }
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
    const deLaSeccion = eventos.filter((e) => e.nombre === s.evento);
    const tiempos = eventos
      .filter((e) => e.nombre === "tiempo_pagina" && e.props?.seccion === s.clave)
      .map((e) => Number(e.props?.segundos) || 0)
      .filter((n) => n > 0);
    const promedio = tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : 0;
    return {
      seccion: s.nombre,
      visitas: deLaSeccion.length,
      personas: new Set(deLaSeccion.map(persona)).size,
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

  // ---------------------------------------------- comercios vinculados
  // Las tres listas con que trabaja la app (ver config/ y
  // lib/catalogo-tiendas.ts), unidas por dominio: un mismo comercio
  // puede estar en varias.
  const limpio = (d: string) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  const vinculados = new Map<
    string,
    { dominio: string; nombre: string; instagram: string | null; catalogo: boolean; enInstagram: boolean; google: boolean }
  >();
  const fila = (dominio: string) => {
    const d = limpio(dominio);
    const f = vinculados.get(d) ?? { dominio: d, nombre: d, instagram: null, catalogo: false, enInstagram: false, google: false };
    vinculados.set(d, f);
    return f;
  };
  for (const t of tiendasConCatalogo()) Object.assign(fila(t.dominio), { nombre: t.nombre, catalogo: true });
  for (const t of getTiendasInstagram()) {
    const f = fila(t.dominio ?? t.handle);
    f.enInstagram = true;
    f.instagram = t.handle;
    if (f.nombre === f.dominio) f.nombre = t.nombre;
  }
  for (const d of getAllowedMerchants()) fila(d).google = true;
  // Las que solo están en la lista de Google no traen nombre.
  const NOMBRES: Record<string, string> = {
    "zara.com": "Zara",
    "hm.com": "H&M",
    "pepitaperez.co": "Pepita Pérez",
    "tiendacomplicity.com": "Complicity",
  };
  for (const f of vinculados.values()) if (f.nombre === f.dominio && NOMBRES[f.dominio]) f.nombre = NOMBRES[f.dominio];
  const clicsPorDominio = new Map<string, number>();
  for (const e of clics) {
    const d = e.props?.dominio ? limpio(String(e.props.dominio)) : null;
    if (d) clicsPorDominio.set(d, (clicsPorDominio.get(d) ?? 0) + 1);
  }
  const comerciosVinculados = Array.from(vinculados.values())
    .map((f) => ({ ...f, clics: clicsPorDominio.get(f.dominio) ?? clicsPorDominio.get(f.instagram ?? "") ?? 0 }))
    .sort((a, b) => Number(b.catalogo) - Number(a.catalogo) || b.clics - a.clics || a.nombre.localeCompare(b.nombre));
  const comerciosExcluidos = getExcludedMerchants();

  // ------------------------------------- me gusta y marcas favoritas
  // Me gusta: el corazón de las prendas (tabla seguimientos, solo los
  // activos). Marcas favoritas: "Mis marcas favoritas" del menú
  // (users.marcas_favoritas, de la migración de marcas). Las dos, también
  // por el rango de edad que cada quien puso en Mi perfil.
  const nombreDe = (dominio: string) => vinculados.get(limpio(dominio))?.nombre ?? dominio;
  const { data: corazones } = await sb.from("seguimientos").select("user_id, tienda, dominio").eq("activo", true);
  const { data: conFavoritas } = await sb
    .from("users")
    .select("id, marcas_favoritas")
    .not("marcas_favoritas", "is", null);
  const likes = (corazones ?? []).filter((c) => !idsPrueba.has(c.user_id));
  const favoritas = ((conFavoritas ?? []) as Array<{ id: string; marcas_favoritas: string[] | null }>).filter(
    (u) => !idsPrueba.has(u.id) && (u.marcas_favoritas?.length ?? 0) > 0
  );
  const idsConGusto = Array.from(new Set([...likes.map((c) => c.user_id), ...favoritas.map((u) => u.id)]));
  const edadDe = new Map<string, string>();
  for (let i = 0; i < idsConGusto.length; i += 200) {
    const { data } = await sb.from("users").select("id, rango_edad").in("id", idsConGusto.slice(i, i + 200));
    for (const u of data ?? []) if (u.rango_edad) edadDe.set(u.id, u.rango_edad);
  }

  type Conteo = Map<string, { veces: number; personas: Set<string> }>;
  const sumar = (m: Conteo, clave: string, persona: string) => {
    const f = m.get(clave) ?? { veces: 0, personas: new Set<string>() };
    f.veces++;
    f.personas.add(persona);
    m.set(clave, f);
  };
  const ordenar = (m: Conteo) => Array.from(m.entries()).sort((a, b) => b[1].veces - a[1].veces);
  const top = (m: Conteo | undefined, n: number) =>
    m ? ordenar(m).slice(0, n).map(([d, f]) => `${nombreDe(d)} (${f.veces})`).join(", ") : "";

  const likesPorComercio: Conteo = new Map();
  const favoritasPorMarca: Conteo = new Map();
  const likesPorEdad = new Map<string, Conteo>();
  const favoritasPorEdad = new Map<string, Conteo>();
  const personasPorEdad = new Map<string, Set<string>>();
  const SIN_EDAD = "Sin edad en el perfil";
  const enEdad = (mapa: Map<string, Conteo>, edad: string) => {
    const m = mapa.get(edad) ?? new Map();
    mapa.set(edad, m);
    return m;
  };
  for (const c of likes) {
    const edad = edadDe.get(c.user_id) ?? SIN_EDAD;
    sumar(likesPorComercio, c.dominio, c.user_id);
    sumar(enEdad(likesPorEdad, edad), c.dominio, c.user_id);
    personasPorEdad.set(edad, (personasPorEdad.get(edad) ?? new Set()).add(c.user_id));
  }
  for (const u of favoritas) {
    const edad = edadDe.get(u.id) ?? SIN_EDAD;
    for (const d of u.marcas_favoritas ?? []) {
      sumar(favoritasPorMarca, d, u.id);
      sumar(enEdad(favoritasPorEdad, edad), d, u.id);
    }
    personasPorEdad.set(edad, (personasPorEdad.get(edad) ?? new Set()).add(u.id));
  }
  const RANGOS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+", SIN_EDAD];
  const gustos = {
    meGusta: ordenar(likesPorComercio)
      .slice(0, 20)
      .map(([d, f]) => ({ comercio: nombreDe(d), meGusta: f.veces, personas: f.personas.size })),
    favoritas: ordenar(favoritasPorMarca)
      .slice(0, 20)
      .map(([d, f]) => ({ comercio: nombreDe(d), personas: f.personas.size })),
    porEdad: RANGOS.filter((r) => personasPorEdad.has(r)).map((r) => ({
      edad: r,
      personas: personasPorEdad.get(r)!.size,
      masMeGusta: top(likesPorEdad.get(r), 3),
      masFavoritas: top(favoritasPorEdad.get(r), 3),
    })),
  };
  const prendas = agrupar((e) => (e.props?.prenda ? String(e.props.prenda) : null));

  // ------------------------------------------------- actividad diaria
  const hace30 = new Date(ahora.getTime() - 30 * 86400000).toISOString();
  const porDia = new Map<string, { personas: Set<string>; busquedas: number; registros: number; pagos: number }>();
  for (const e of visitas.filter((x) => x.created_at >= hace30)) {
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
  const comisionDe = (monto: number) => monto * COMISION_BOLD.porcentaje + COMISION_BOLD.fijoCop;
  const comision = delMes.reduce((a, p) => a + comisionDe(p.monto_cop ?? 0), 0);

  // ---------------------------------------------------------- costos
  // Lo que de verdad se gastó: cada llamada a la IA anota su costo
  // (ver lib/costos.ts). Acá van TODAS, también las de las cuentas de
  // prueba, porque esa plata también se paga.
  const resumirCostos = (desde: Date | null) => {
    const consumo = todos.filter(
      (e) => e.nombre === "consumo_ia" && (!desde || new Date(e.created_at) >= desde)
    );
    const porServicio = new Map<string, { veces: number; usd: number; personas: Set<string> }>();
    for (const e of consumo) {
      const servicio = String(e.props?.servicio ?? "otro");
      const fila = porServicio.get(servicio) ?? { veces: 0, usd: 0, personas: new Set<string>() };
      fila.veces++;
      fila.usd += Number(e.props?.usd) || 0;
      if (e.user_id || e.device_id) fila.personas.add(persona(e));
      porServicio.set(servicio, fila);
    }
    const ia = Array.from(porServicio.entries())
      .map(([servicio, f]) => {
        const totalCop = f.usd * TRM;
        return {
          rubro: NOMBRE_SERVICIO[servicio as ServicioIA] ?? servicio,
          veces: f.veces,
          totalCop: Math.round(totalCop),
          unitarioCop: Math.round(totalCop / Math.max(f.veces, 1)),
        };
      })
      .sort((a, b) => b.totalCop - a.totalCop);

    const pagosPeriodo = pagosReales.filter((p) => p.acreditado_at && (!desde || new Date(p.acreditado_at) >= desde));
    const bold = pagosPeriodo.reduce((a, p) => a + comisionDe(p.monto_cop ?? 0), 0);
    const variables = [
      ...ia,
      {
        rubro: "Comisión de Bold por cada pago",
        veces: pagosPeriodo.length,
        totalCop: Math.round(bold),
        unitarioCop: pagosPeriodo.length ? Math.round(bold / pagosPeriodo.length) : 0,
      },
      // Gratis dentro de su plan: se listan para ver el consumo.
      { rubro: "Catálogos de tiendas y promociones", veces: null, totalCop: 0, unitarioCop: 0 },
      { rubro: "Notificaciones al celular", veces: null, totalCop: 0, unitarioCop: 0 },
    ];
    const totalVariable = variables.reduce((a, v) => a + v.totalCop, 0);
    return { variables, totalVariable };
  };

  const delPeriodo = resumirCostos(inicioDeMes);
  const desdeSiempre = resumirCostos(null);
  const totalFijo = COSTOS_FIJOS.reduce((a, c) => a + c.cop, 0);
  // Por persona: lo variable del mes entre las personas que usaron la app
  // este mes (sin las de prueba), y por cada membresía activa.
  // Los servicios en plan gratis: cuánto de su límite se ha usado, para
  // saber con tiempo cuándo habría que pasar al plan pago.
  const planesGratis: Array<{ servicio: string; usado: string; limite: string; porcentaje: number | null; detalle: string }> = [];
  try {
    const u: any = await cloudinary.api.usage();
    const mb = (bytes: number) => `${Math.round((bytes ?? 0) / 1e6)} MB`;
    planesGratis.push({
      servicio: "Fotos (Cloudinary)",
      usado: `${(u.credits?.usage ?? 0).toLocaleString("es-CO")} créditos`,
      limite: `${u.credits?.limit ?? 25} créditos al mes`,
      porcentaje: u.credits?.used_percent ?? null,
      detalle: `${u.resources ?? 0} fotos · espacio ${mb(u.storage?.usage)} · tráfico ${mb(u.bandwidth?.usage)} · ${u.transformations?.usage ?? 0} transformaciones`,
    });
  } catch (e) {
    console.warn("[admin/tablero] cloudinary:", e);
  }
  const { count: correosDelMes } = await sb
    .from("login_codes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", inicioDeMes.toISOString());
  planesGratis.push({
    servicio: "Correos del código de ingreso (Resend)",
    usado: `${correosDelMes ?? 0} correos`,
    limite: "3.000 al mes (100 al día)",
    porcentaje: Math.round(((correosDelMes ?? 0) / 3000) * 1000) / 10,
    detalle: "Uno por cada vez que alguien pide su código para entrar.",
  });

  const personasDelMes = new Set(
    visitas.filter((e) => new Date(e.created_at) >= inicioDeMes).map(persona)
  ).size;

  // ------------------------------------------------- cuentas creadas
  // El listado de correos, sin las cuentas de prueba. "Desde" es cuando
  // creó la cuenta (registro_ok); si no quedó anotado, la fecha de la
  // fila en users.
  const registro = new Map<string, string>();
  const ultimaVez = new Map<string, string>();
  for (const e of visitas) {
    const p = persona(e);
    if (e.nombre === "registro_ok" && e.user_id && !registro.has(e.user_id)) registro.set(e.user_id, e.created_at);
    if (!ultimaVez.has(p) || e.created_at > ultimaVez.get(p)!) ultimaVez.set(p, e.created_at);
  }
  // Celular y fecha de registro: columnas de la migración de promos. Si
  // no se ha corrido, la consulta falla y el listado sale sin ellas.
  const { data: extra } = await sb
    .from("users")
    .select("id, celular, registrado_at")
    .not("email", "is", null);
  const extraDe = new Map((extra ?? []).map((u: any) => [u.id, u]));
  const cuentas = (conCorreo ?? [])
    .filter((u) => !idsPrueba.has(u.id))
    .map((u) => {
      const conMembresiaActiva = u.premium_until && new Date(u.premium_until).getTime() > ahora.getTime();
      return {
        email: u.email as string,
        celular: (extraDe.get(u.id)?.celular as string | null) ?? null,
        desde: registro.get(u.id) ?? extraDe.get(u.id)?.registrado_at ?? u.created_at,
        ultimaVez: ultimaVez.get(u.id) ?? null,
        plan: conMembresiaActiva ? (planDe.get(u.id) ?? "membresía") : "gratis",
        venceMembresia: conMembresiaActiva ? u.premium_until : null,
      };
    })
    .sort((a, b) => b.desde.localeCompare(a.desde));

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
    comerciosVinculados,
    gustos,
    comerciosExcluidos,
    actividad,
    dinero: {
      pagosDelMes: delMes.length,
      brutoCop: Math.round(bruto),
      netoEstimadoCop: Math.round(bruto - comision),
    },
    costos: {
      trm: TRM,
      delMes: delPeriodo,
      desdeSiempre,
      fijos: COSTOS_FIJOS,
      totalFijo,
      planesGratis,
      porPersonaCop: personasDelMes ? Math.round(delPeriodo.totalVariable / personasDelMes) : 0,
      porMembresiaCop: activas.length ? Math.round((delPeriodo.totalVariable + totalFijo) / activas.length) : 0,
      // Lo cobrado en el mes menos lo que costó operar en el mes.
      resultadoDelMesCop: Math.round(bruto - delPeriodo.totalVariable - totalFijo),
    },
    cuentas,
    porVencer: activas
      .filter((u) => (new Date(u.premium_until).getTime() - ahora.getTime()) / 86400000 <= 15)
      .map((u) => ({ email: u.email, name: u.name, premium_until: u.premium_until })),
  });
}
