import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getOrCreateUserId } from "@/lib/device-user";
import { uploadImage } from "@/lib/cloudinary";
import {
  inferirPersonalidadPorImagen,
  inferirPersonalidadPorReferencia,
} from "@/lib/personalidad-ai";

// POST /api/perfil/personalidad
// Body: { referencia: string } — nombre de celebridad/personaje, o
//       { imageBase64: string } — foto propia o de inspiración
export async function POST(req: Request) {
  const userId = await getOrCreateUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Falta el id de dispositivo" }, { status: 400 });
  }

  const body = await req.json();

  try {
    let resultado;
    let fuente: string;

    if (body.referencia && typeof body.referencia === "string" && body.referencia.trim()) {
      resultado = await inferirPersonalidadPorReferencia(body.referencia.trim());
      fuente = `referente: ${body.referencia.trim()}`;
    } else if (body.imageBase64) {
      const imageUrl = await uploadImage(body.imageBase64);
      resultado = await inferirPersonalidadPorImagen(imageUrl);
      fuente = "foto";
    } else {
      return NextResponse.json(
        { error: "Envía 'referencia' (nombre) o 'imageBase64' (foto)." },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();
    const { error } = await sb
      .from("users")
      .update({
        personalidad: resultado.personalidad,
        personalidad_secundaria: resultado.personalidadSecundaria,
        personalidad_fuente: fuente,
      })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ resultado, fuente });
  } catch (e: any) {
    console.error("[/api/perfil/personalidad] error:", e);
    return NextResponse.json(
      { error: "No pudimos analizar el estilo. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
