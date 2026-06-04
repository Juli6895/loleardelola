import { NextResponse } from "next/server";
import {
  generateOutfitFromQuiz,
  type QuizAnswers,
} from "@/lib/quiz-outfit";
import { generateOutfitImage } from "@/lib/image-gen";

// =====================================================================
// Endpoint: POST /api/personalizar
// =====================================================================
// Body: QuizAnswers (ver lib/quiz-outfit.ts)
//
// Respuesta:
// {
//   imageUrl: string,                        // URL pública en Cloudinary
//   result: {
//     searchTerms: string[],
//     dominantColors: string[],
//     rawLabels: string[],                    // se deja vacío (compat con VisionResult)
//     outfitSummary: string,
//   }
// }
//
// Flujo:
//   1) Claude diseña el outfit a partir de las respuestas del quiz, devolviendo
//      la lista de prendas en español + un prompt en inglés para la imagen.
//   2) gpt-image-1 renderiza la imagen del avatar con el outfit completo y la
//      sube a Cloudinary.
//   3) Se devuelve todo al cliente, en el mismo formato que /api/vision para
//      que el componente de resultado pueda reusar UX consistente.
//
// Costo aproximado por request: ~$0.025 (Claude $0.005 + gpt-image-1 $0.02).
// =====================================================================

export const dynamic = "force-dynamic";
// La generación de imagen tarda 15-30s y Vercel hobby tiene timeout default
// de 10s. Forzamos a 60s para no cortar requests en producción.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<QuizAnswers>;

    // Validación mínima: género y ocasión son obligatorios para que Claude
    // pueda diseñar algo coherente.
    if (!body.gender) {
      return NextResponse.json(
        { error: "Falta el género en el cuestionario." },
        { status: 400 }
      );
    }
    if (!body.occasion || !body.occasion.trim()) {
      return NextResponse.json(
        { error: "Falta la ocasión en el cuestionario." },
        { status: 400 }
      );
    }

    // Normalizar entrada (defaults razonables).
    const answers: QuizAnswers = {
      gender: body.gender,
      heightCm: typeof body.heightCm === "number" ? body.heightCm : null,
      bodyType: body.bodyType ?? "no_especifica",
      styles: Array.isArray(body.styles) ? body.styles : [],
      favoriteColors: Array.isArray(body.favoriteColors)
        ? body.favoriteColors
        : [],
      occasion: body.occasion.trim(),
      climate: body.climate,
      freeText: body.freeText,
    };

    console.log("[/api/personalizar] quiz recibido:", {
      gender: answers.gender,
      bodyType: answers.bodyType,
      stylesCount: answers.styles.length,
      colorsCount: answers.favoriteColors.length,
      occasion: answers.occasion,
      climate: answers.climate,
      hasFreeText: !!answers.freeText,
    });

    // Paso 1: Claude diseña el outfit.
    const design = await generateOutfitFromQuiz(answers);
    console.log("[/api/personalizar] outfit diseñado:", {
      terms: design.searchTerms.length,
      colors: design.dominantColors.length,
      summary: design.outfitSummary.slice(0, 80),
    });

    if (design.searchTerms.length === 0) {
      return NextResponse.json(
        {
          error:
            "Claude no devolvió prendas. Revisa las respuestas del cuestionario.",
        },
        { status: 500 }
      );
    }

    // Paso 2: gpt-image-1 renderiza la imagen.
    const imageUrl = await generateOutfitImage({
      prompt: design.imagePrompt,
      size: "1024x1536",
      quality: "medium",
    });
    console.log("[/api/personalizar] imagen generada:", imageUrl);

    return NextResponse.json({
      imageUrl,
      result: {
        searchTerms: design.searchTerms,
        dominantColors: design.dominantColors,
        rawLabels: [], // compat con VisionResult; el quiz no produce labels
        outfitSummary: design.outfitSummary,
      },
    });
  } catch (e: any) {
    console.error("[/api/personalizar] error:", e);
    return NextResponse.json(
      {
        error:
          e?.message ??
          "Algo salió mal generando el outfit personalizado. Intenta de nuevo.",
      },
      { status: 500 }
    );
  }
}
