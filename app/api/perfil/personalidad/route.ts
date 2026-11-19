import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";
import { esAdmin } from "@/lib/admin-correos";
import { revisarCupo } from "@/lib/limites";
import { uploadImage } from "@/lib/cloudinary";
import { contextoDe, registrar } from "@/lib/eventos";
import {
  inferirPersonalidadPorImagen,
  inferirPersonalidadPorReferencia,
} from "@/lib/personalidad-ai";

// POST /api/perfil/personalidad
// Body: { referencia: string } — nombre de celebridad/personaje, o
//       { imageBase64: string } — foto propia o de inspiración
export async function POST(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario) {
    return NextResponse.json({ error: "Falta el id de dispositivo" }, { status: 400 });
  }
  const userId = usuario.id;

  // Cada análisis cuesta: es parte de la membresía y tiene su cupo.
  if (usuario.plan !== "membresia" && !esAdmin(usuario.email)) {
    return NextResponse.json(
      { error: "La personalidad de estilo es parte de la membresía.", destrabaCon: "membresia", limite: true },
      { status: 402 }
    );
  }

  const body = await req.json();
  const porReferencia = typeof body.referencia === "string" && !!body.referencia.trim();
  if (porReferencia || body.imageBase64) {
    const cupo = await revisarCupo(usuario, porReferencia ? "personalidadReferencia" : "personalidadFoto");
    if (!cupo.permitido) {
      return NextResponse.json({ error: cupo.mensaje, limite: true }, { status: 429 });
    }
  }

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
      registrar("personalidad_error", contextoDe(req, userId), { motivo: error.message.slice(0, 120) });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await registrar("personalidad_calculada", contextoDe(req, userId), { fuente: fuente === "foto" ? "foto" : "referencia" });
    return NextResponse.json({ resultado, fuente });
  } catch (e: any) {
    console.error("[/api/perfil/personalidad] error:", e);
    registrar("personalidad_error", contextoDe(req, userId), { motivo: String(e?.message ?? e).slice(0, 120) });
    return NextResponse.json(
      { error: "No pudimos analizar el estilo. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
