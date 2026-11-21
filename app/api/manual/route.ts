import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";
import { revisarCupo } from "@/lib/limites";
import { contextoDe, registrar } from "@/lib/eventos";
import {
  adjuntarFotos,
  COLUMNAS_PERFIL,
  type ManualGenerado,
  datosDesdeFila,
  generarManual,
  huella,
  loQueFalta,
  VERSION_MANUAL,
  type DatosManual,
  type ManualListo,
  type PrendaDelClosetManual,
} from "@/lib/manual-estilo";

// Claude escribe el manual y después se buscan ~25 prendas en los
// catálogos de las tiendas: puede pasar del minuto.
export const maxDuration = 120;

/**
 * Las prendas del clóset para "Prendas favoritas (cómo combinar)": las 4
 * más nuevas.
 */
async function prendasFavoritas(userId: string): Promise<PrendaDelClosetManual[]> {
  const { data } = await supabaseAdmin()
    .from("closet_items")
    .select("id, label, image_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? [])
    .filter((p) => p.label && p.image_url)
    .slice(0, 4)
    .map((p) => ({ id: p.id, label: p.label, foto: p.image_url }));
}

// GET  /api/manual → devuelve el manual guardado, o qué falta para armarlo
// POST /api/manual → lo genera (o lo regenera si el perfil cambió)
//
// Es lo que da la membresía, así que el permiso se revisa acá y no solo
// en la pantalla: esconder un botón no impide que alguien llame la API.
//
// El manual se guarda como JSON en la misma columna de texto de
// siempre (manual_md): { texto, outfits, prendasClave }, con las fotos
// YA adjuntas a cada prenda (ver adjuntarFotos en lib/manual-estilo.ts)
// — se buscan una sola vez, al generar, y solo queda lo que sí existe
// en el catálogo real. La página no vuelve a preguntarle nada a
// /api/catalogo.

/** Lee manual_md como el objeto estructurado. null si no hay o está mal. */
function parsearManual(manualMd: string | null): ManualListo | null {
  if (!manualMd) return null;
  try {
    const obj = JSON.parse(manualMd);
    if (obj && typeof obj.texto === "string") return obj as ManualListo;
    return null;
  } catch {
    return null;
  }
}

/** Las marcas favoritas de la cuenta y cuándo se cambiaron por última vez. */
async function marcasDe(userId: string): Promise<{ lista: string[]; cambiaronEl: string | null }> {
  const { data } = await supabaseAdmin()
    .from("users")
    .select("marcas_favoritas, marcas_favoritas_at")
    .eq("id", userId)
    .maybeSingle();
  const lista = Array.isArray(data?.marcas_favoritas)
    ? (data.marcas_favoritas as unknown[]).filter((d): d is string => typeof d === "string")
    : [];
  return { lista, cambiaronEl: (data?.marcas_favoritas_at as string | null) ?? null };
}

/**
 * El manual guardado, sin sus fotos: las prendas que ya tiene, para volver
 * a buscarles foto (con otras marcas primero) sin pagar otra generación.
 */
function sinFotos(m: ManualListo): ManualGenerado {
  const quita = <T extends { fotos: unknown }>(p: T) => {
    const { fotos: _fotos, ...resto } = p;
    return resto;
  };
  return {
    texto: m.texto,
    paleta: m.paleta,
    evitar: m.evitar,
    favoritas: m.favoritas,
    outfits: m.outfits.map((o) => ({ titulo: o.titulo, descripcion: o.descripcion, prendas: o.prendas.map(quita) })),
    estilo: (m.estilo ?? []).map(quita),
    basicos: (m.basicos ?? []).map(quita),
  } as unknown as ManualGenerado;
}

/** Hay un manual guardado, pero con la forma de antes de la asesoría. */
function esFormatoViejo(manualMd: string | null): boolean {
  const m = parsearManual(manualMd);
  return !!m && (m.version ?? 1) < VERSION_MANUAL;
}

async function cargar(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario) return { error: "No pudimos identificarte.", status: 401 as const };

  const { data } = await supabaseAdmin()
    .from("users")
    .select(`${COLUMNAS_PERFIL}, manual_md, manual_hash, manual_generado_at`)
    .eq("id", usuario.id)
    .maybeSingle();

  if (!data) return { error: "No encontramos tu perfil.", status: 404 as const };

  const datos: DatosManual = datosDesdeFila(data);

  return { usuario, datos, guardado: data };
}

export async function GET(req: Request) {
  const r = await cargar(req);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

  const conMembresia = r.usuario.plan === "membresia";
  const falta = loQueFalta(r.datos);
  const alDia = r.guardado.manual_hash === huella(r.datos);

  return NextResponse.json({
    conMembresia,
    falta,
    // El manual solo viaja si de verdad tiene membresía. Si su perfil
    // cambió se manda igual (con el aviso de abajo): si ya usó sus
    // manuales del mes, no se queda sin ninguno.
    manual: conMembresia ? parsearManual(r.guardado.manual_md) : null,
    generadoEl: conMembresia ? r.guardado.manual_generado_at : null,
    // Hay manual guardado pero el perfil cambió desde entonces.
    desactualizado: conMembresia && !!r.guardado.manual_md && !alDia,
    // ...o lo que cambió fue la forma del manual, no su perfil: la
    // pantalla lo dice distinto ("hay una versión nueva").
    formatoViejo: conMembresia && esFormatoViejo(r.guardado.manual_md),
    // Cambió sus marcas favoritas después de armar el manual: sus fotos
    // pueden no ser de sus marcas. Se actualizan sin gastar un manual.
    fotosDesactualizadas: conMembresia && !!parsearManual(r.guardado.manual_md) && (await marcasCambiadasDespues(r.usuario.id, r.guardado.manual_generado_at)),
  });
}

async function marcasCambiadasDespues(userId: string, generadoEl: string | null): Promise<boolean> {
  const { cambiaronEl } = await marcasDe(userId);
  return !!cambiaronEl && !!generadoEl && new Date(cambiaronEl) > new Date(generadoEl);
}

export async function POST(req: Request) {
  const r = await cargar(req);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  const body = await req.json().catch(() => ({}));
  const { lista: favoritas } = await marcasDe(r.usuario.id);

  // Solo fotos: vuelve a buscar las prendas del manual guardado con sus
  // marcas favoritas primero. No llama a la IA ni gasta un manual del cupo.
  if (body?.soloFotos === true) {
    if (r.usuario.plan !== "membresia") {
      return NextResponse.json({ error: "El manual de estilo es parte de la membresía." }, { status: 402 });
    }
    const guardado = parsearManual(r.guardado.manual_md);
    if (!guardado) {
      return NextResponse.json({ error: "Primero arma tu manual." }, { status: 400 });
    }
    try {
      const manual = await adjuntarFotos(sinFotos(guardado), favoritas);
      await supabaseAdmin()
        .from("users")
        .update({ manual_md: JSON.stringify(manual), manual_generado_at: new Date().toISOString() })
        .eq("id", r.usuario.id);
      return NextResponse.json({ manual, reusado: true, fotosActualizadas: true });
    } catch (e) {
      console.error("[api/manual] no se pudieron actualizar las fotos:", e);
      return NextResponse.json({ error: "No pudimos actualizar las fotos. Intenta en un momento." }, { status: 500 });
    }
  }

  if (r.usuario.plan !== "membresia") {
    return NextResponse.json(
      { error: "El manual de estilo es parte de la membresía." },
      { status: 402 }
    );
  }

  const falta = loQueFalta(r.datos);
  if (falta.length > 0) {
    return NextResponse.json({ error: "Falta completar tu perfil.", falta }, { status: 400 });
  }

  const h = huella(r.datos);
  // Si ya está al día, no se vuelve a generar: cuesta plata y tarda.
  const yaGuardado = h === r.guardado.manual_hash ? parsearManual(r.guardado.manual_md) : null;
  if (yaGuardado) {
    return NextResponse.json({ manual: yaGuardado, reusado: true });
  }

  // Cada manual nuevo cuesta: la membresía tiene un cupo. Pasar un manual
  // guardado al formato nuevo no cuenta: no lo pidió ella.
  const formatoViejo = esFormatoViejo(r.guardado.manual_md);
  if (!formatoViejo) {
    const cupo = await revisarCupo(r.usuario, "manuales");
    if (!cupo.permitido) {
      return NextResponse.json({ error: cupo.mensaje, limite: true }, { status: 429 });
    }
  }

  try {
    const crudo = await generarManual(r.datos, await prendasFavoritas(r.usuario.id));
    // Se filtra ANTES de guardar: lo que queda en manual_md ya es solo
    // lo que de verdad existe en el catálogo, con sus fotos adjuntas.
    const manual = await adjuntarFotos(crudo, favoritas);
    await supabaseAdmin()
      .from("users")
      .update({
        manual_md: JSON.stringify(manual),
        manual_hash: h,
        manual_generado_at: new Date().toISOString(),
      })
      .eq("id", r.usuario.id);
    await registrar(formatoViejo ? "manual_formato_nuevo" : "manual_generado", contextoDe(req, r.usuario.id));

    return NextResponse.json({ manual, reusado: false });
  } catch (e) {
    console.error("[api/manual] no se pudo generar:", e);
    return NextResponse.json(
      { error: "No pudimos armar tu manual. Intenta en un momento." },
      { status: 500 }
    );
  }
}
