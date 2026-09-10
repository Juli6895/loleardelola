import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { uploadImage } from "@/lib/cloudinary";
import {
  inferirPersonalidadPorImagen,
  inferirPersonalidadPorReferencia,
} from "@/lib/personalidad-ai";

async function getUserId(pinterestId: string | undefined): Promise<string | null> {
  if (!pinterestId) return null;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("users")
    .select("id")
    .eq("pinterest_id", pinterestId)
    .maybeSingle();
  return data?.id ?? null;
}

// POST /api/perfil/personalidad
// Body: { referencia: string } — nombre de celebridad/personaje, o
//       { imageBase64: string } — foto propia o de inspiración
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = await getUserId(session?.pinterestId);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
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
