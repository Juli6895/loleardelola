import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";
import { esAdmin } from "@/lib/admin-correos";
import { uploadImage } from "@/lib/cloudinary";
import { generarImagen } from "@/lib/gemini";
import { describirFigura, huellaFigura, type DatosFigura } from "@/lib/figura";
import { contextoDe, registrar } from "@/lib/eventos";
import { revisarUsoMensual } from "@/lib/limites";

// GET  /api/perfil/figura → la ilustración guardada y si se puede pedir una
// POST /api/perfil/figura { otra?: boolean } → la dibuja con Gemini
//
// Cada imagen cuesta (ver lib/gemini.ts), así que:
// - solo con membresía (o la cuenta de administración, para probar);
// - si los datos del perfil no cambiaron, se devuelve la que ya está
//   guardada, salvo que pida "otra" porque no le gustó;
// - tope mensual de la membresía (TOPES_MES_MEMBRESIA.ilustraciones).

const COLUMNAS =
  "silueta, tono_piel, color_cabello, largo_cabello, rango_edad, bust_cm, waist_cm, hip_cm, height_cm, figura_url, figura_hash";

async function cargar(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario?.conSesion) return { error: "Entra con tu correo para crear tu ilustración.", status: 401 as const };

  const { data } = await supabaseAdmin().from("users").select(COLUMNAS).eq("id", usuario.id).maybeSingle();
  if (!data?.silueta) {
    return { error: "Primero calcula tu silueta con tus medidas.", status: 400 as const };
  }

  const datos: DatosFigura = {
    silueta: data.silueta,
    tonoPiel: data.tono_piel,
    colorCabello: data.color_cabello,
    largoCabello: data.largo_cabello,
    edad: data.rango_edad,
    busto: data.bust_cm,
    cintura: data.waist_cm,
    cadera: data.hip_cm,
    estatura: data.height_cm,
  };
  const puede = usuario.plan === "membresia" || esAdmin(usuario.email);
  return { usuario, datos, fila: data, puede, huella: huellaFigura(datos) };
}

export async function GET(req: Request) {
  const r = await cargar(req);
  if ("error" in r) return NextResponse.json({ figuraUrl: null, puede: false, motivo: r.error });
  return NextResponse.json({
    figuraUrl: r.fila.figura_url,
    // La guardada ya no corresponde a su perfil actual.
    desactualizada: !!r.fila.figura_url && r.fila.figura_hash !== r.huella,
    puede: r.puede,
    motivo: r.puede ? null : "La ilustración personalizada es parte de la membresía.",
  });
}

export async function POST(req: Request) {
  const r = await cargar(req);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  if (!r.puede) {
    return NextResponse.json(
      { error: "La ilustración personalizada es parte de la membresía.", limite: true },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => ({}));
  if (!body?.otra && r.fila.figura_url && r.fila.figura_hash === r.huella) {
    return NextResponse.json({ figuraUrl: r.fila.figura_url, reusada: true });
  }

  const sb = supabaseAdmin();
  const mensual = await revisarUsoMensual(r.usuario, "ilustraciones");
  if (!mensual.permitido) {
    return NextResponse.json({ error: mensual.mensaje, limite: true }, { status: 429 });
  }

  try {
    const imagen = await generarImagen(describirFigura(r.datos), { aspecto: "2:3" });
    const url = await uploadImage(`data:${imagen.mimeType};base64,${imagen.base64}`);
    await sb
      .from("users")
      .update({ figura_url: url, figura_hash: r.huella, figura_generada_at: new Date().toISOString() })
      .eq("id", r.usuario.id);
    await registrar("figura_generada", contextoDe(req, r.usuario.id), {
      formato: imagen.formatoRechazado ? `rechazado: ${imagen.formatoRechazado}` : "2:3",
    });
    return NextResponse.json({ figuraUrl: url, reusada: false });
  } catch (e) {
    console.error("[api/perfil/figura] falló:", e);
    registrar("figura_error", contextoDe(req, r.usuario.id), {
      motivo: e instanceof Error ? e.message.slice(0, 120) : "desconocido",
    });
    return NextResponse.json(
      { error: "No pudimos crear tu ilustración. Intenta en un momento." },
      { status: 500 }
    );
  }
}
