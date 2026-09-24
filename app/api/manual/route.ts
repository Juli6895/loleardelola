import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";
import {
  generarManual,
  huella,
  loQueFalta,
  type DatosManual,
  type ManualGenerado,
} from "@/lib/manual-estilo";

// GET  /api/manual → devuelve el manual guardado, o qué falta para armarlo
// POST /api/manual → lo genera (o lo regenera si el perfil cambió)
//
// Es lo que da la membresía, así que el permiso se revisa acá y no solo
// en la pantalla: esconder un botón no impide que alguien llame la API.
//
// El manual se guarda como JSON en la misma columna de texto de
// siempre (manual_md): { texto, outfits, prendasClave }. La página pide
// aparte las fotos de esas prendas contra /api/catalogo, igual que los
// resultados de búsqueda — este endpoint solo entrega los datos, no las
// fotos.

/** Lee manual_md como el objeto estructurado. null si no hay o está mal. */
function parsearManual(manualMd: string | null): ManualGenerado | null {
  if (!manualMd) return null;
  try {
    const obj = JSON.parse(manualMd);
    if (obj && typeof obj.texto === "string") return obj as ManualGenerado;
    return null;
  } catch {
    return null;
  }
}

async function cargar(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario) return { error: "No pudimos identificarte.", status: 401 as const };

  const { data } = await supabaseAdmin()
    .from("users")
    .select(
      "name, silueta, bust_cm, waist_cm, hip_cm, height_cm, tono_piel, color_cabello, largo_cabello, contraste, personalidad, personalidad_secundaria, proyeccion, manual_md, manual_hash, manual_generado_at"
    )
    .eq("id", usuario.id)
    .maybeSingle();

  if (!data) return { error: "No encontramos tu perfil.", status: 404 as const };

  const datos: DatosManual = {
    nombre: data.name,
    silueta: data.silueta,
    medidas: {
      busto: data.bust_cm,
      cintura: data.waist_cm,
      cadera: data.hip_cm,
      estatura: data.height_cm,
    },
    tonoPiel: data.tono_piel,
    colorCabello: data.color_cabello,
    largoCabello: data.largo_cabello,
    contraste: data.contraste,
    personalidad: data.personalidad,
    personalidadSecundaria: data.personalidad_secundaria,
    proyeccion: data.proyeccion,
  };

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
    // El manual solo viaja si de verdad tiene membresía.
    manual: conMembresia && alDia ? parsearManual(r.guardado.manual_md) : null,
    generadoEl: conMembresia ? r.guardado.manual_generado_at : null,
    // Hay manual guardado pero el perfil cambió desde entonces.
    desactualizado: conMembresia && !!r.guardado.manual_md && !alDia,
  });
}

export async function POST(req: Request) {
  const r = await cargar(req);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

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

  try {
    const manual = await generarManual(r.datos);
    await supabaseAdmin()
      .from("users")
      .update({
        manual_md: JSON.stringify(manual),
        manual_hash: h,
        manual_generado_at: new Date().toISOString(),
      })
      .eq("id", r.usuario.id);

    return NextResponse.json({ manual, reusado: false });
  } catch (e) {
    console.error("[api/manual] no se pudo generar:", e);
    return NextResponse.json(
      { error: "No pudimos armar tu manual. Intenta en un momento." },
      { status: 500 }
    );
  }
}
