import { NextResponse } from "next/server";
import { analyzeImage, extractPinterestImage } from "@/lib/vision";
import { analyzeImageWithClaude } from "@/lib/garment-ai";
import { uploadImage } from "@/lib/cloudinary";
import { getExcludedMerchants } from "@/lib/merchant-exclusions";
import type { VisionResult } from "@/types";

// Endpoint: POST /api/vision
// Body:
//   - { pinterestUrl: string }          → extrae og:image y analiza
//   - { imageUrl: string }              → analiza URL pública
//   - { imageBase64: "data:image/..." } → sube a Cloudinary + analiza
//   - opcional: { budgetCop: number }   → presupuesto total en COP; Claude
//     reparte el monto y devuelve priceMaxCop por prenda.
// Devuelve: { imageUrl, result, source, excludedMerchants } donde
//   source ∈ {"claude", "vision"} y excludedMerchants viene de la config.
//
// Estrategia de análisis:
//   1. Intenta Claude (mejor identificación de prendas + colores correctos).
//   2. Si Claude falla por cualquier razón (sin API key, rate limit, error de
//      red, imagen inaccesible), cae a Google Vision.
//   3. Si ambos fallan, devuelve 500.
//
// Loguea qué motor se usó para poder evaluar calidad en producción.
export async function POST(req: Request) {
  try {
    const body = await req.json();

    let imageUrl: string | null = null;

    if (body.pinterestUrl) {
      imageUrl = await extractPinterestImage(body.pinterestUrl);
      if (!imageUrl) {
        return NextResponse.json(
          { error: "No pudimos leer la imagen del pin. Revisa el link." },
          { status: 400 }
        );
      }
    } else if (body.imageUrl) {
      imageUrl = body.imageUrl;
    } else if (body.imageBase64) {
      // Subir a Cloudinary para tener URL pública (Claude/Vision aceptan
      // URLs públicas; además queremos persistir para guardar el outfit).
      imageUrl = await uploadImage(body.imageBase64);
    } else {
      return NextResponse.json(
        { error: "Debes enviar pinterestUrl, imageUrl o imageBase64." },
        { status: 400 }
      );
    }

    const budgetCop =
      typeof body.budgetCop === "number" && body.budgetCop > 0
        ? Math.round(body.budgetCop)
        : null;

    const result = await analyzeWithFallback(imageUrl!, budgetCop);

    return NextResponse.json({
      imageUrl,
      result: result.data,
      source: result.source,
      excludedMerchants: getExcludedMerchants(),
    });
  } catch (e: any) {
    console.error("[/api/vision] error:", e);
    return NextResponse.json(
      { error: "Algo salió mal analizando la imagen. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

/**
 * Intenta analizar con Claude; si falla, cae a Google Vision.
 * Devuelve también qué motor se usó (útil para logs y debugging).
 */
async function analyzeWithFallback(
  imageUrl: string,
  budgetCop: number | null
): Promise<{ data: VisionResult; source: "claude" | "vision" }> {
  console.log("[/api/vision] env check", {
    anthropicKeyPresent: !!process.env.ANTHROPIC_API_KEY,
    anthropicKeyPrefix: process.env.ANTHROPIC_API_KEY?.slice(0, 12) ?? null,
    budgetCop,
  });
  // Si no hay ANTHROPIC_API_KEY, no perdemos tiempo intentando Claude.
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const data = await analyzeImageWithClaude(imageUrl, { budgetCop });
      // Si Claude devuelve vacío (raro pero posible), también consideramos
      // que falló y caemos a Vision para tener algo.
      if (data.searchTerms.length === 0) {
        console.warn(
          "[/api/vision] Claude devolvió 0 prendas, cayendo a Vision"
        );
      } else {
        console.log("[/api/vision] análisis con Claude OK", {
          terms: data.searchTerms.length,
        });
        return { data, source: "claude" };
      }
    } catch (e: any) {
      console.warn(
        "[/api/vision] Claude falló, cayendo a Vision:",
        e?.message ?? e
      );
    }
  }

  const data = await analyzeImage({ url: imageUrl });
  console.log("[/api/vision] análisis con Vision OK", {
    terms: data.searchTerms.length,
  });
  return { data, source: "vision" };
}
