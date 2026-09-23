import { NextResponse } from "next/server";
import { analyzeImage, extraerConMotivo } from "@/lib/vision";
import { analyzeImageWithClaude } from "@/lib/garment-ai";
import { uploadImage } from "@/lib/cloudinary";
import { getExcludedMerchants } from "@/lib/merchant-exclusions";
import { getAllowedMerchants } from "@/lib/merchant-allowlist";
import { getTiendasInstagram } from "@/lib/tiendas-instagram";
import { revisarTope, registrarBusqueda } from "@/lib/limites";
import { contextoDe, registrar } from "@/lib/eventos";
import type { VisionResult } from "@/types";

// Endpoint: POST /api/vision
// Body:
//   - { pinterestUrl: string }          → extrae og:image y analiza
//   - { imageUrl: string }              → analiza URL pública
//   - { imageBase64: "data:image/..." } → sube a Cloudinary + analiza
//   - opcional: { budgetCop: number }   → presupuesto total en COP; Claude
//     reparte el monto y devuelve priceMaxCop por prenda.
// Devuelve: { imageUrl, result, source, excludedMerchants, allowedMerchants }
//   donde source ∈ {"claude", "vision"} y ambas listas de comercios vienen
//   de la config de administración (.txt en /config, no editable desde la UI).
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
    // El tope se revisa ANTES de analizar: si ya no le quedan
    // búsquedas, no tiene sentido gastar una llamada a Claude (que
    // cuesta plata) para después negarle el resultado.
    const tope = await revisarTope(req, "busquedas");
    if (!tope.permitido) {
      return NextResponse.json(
        { error: tope.mensaje, destrabaCon: tope.destrabaCon, limite: true },
        { status: 402 }
      );
    }

    const body = await req.json();

    let imageUrl: string | null = null;

    if (body.pinterestUrl) {
      // Antes esto solo devolvía true/false, sin decir por qué falló —
      // el mismo mensaje genérico salía si el link estaba mal escrito,
      // si Pinterest se demoró, o si bloqueó el request. Con el motivo
      // explícito, cada caso dice algo distinto y accionable.
      const extraido = await extraerConMotivo(body.pinterestUrl);
      if (!extraido.ok) {
        const mensajes: Record<typeof extraido.motivo, string> = {
          "url-invalida": "Ese link no parece de Pinterest. Revísalo.",
          "tiempo-agotado":
            "Pinterest se demoró en responder. Intenta de nuevo en un momento.",
          red: "No pudimos conectarnos a Pinterest. Intenta de nuevo.",
          "sin-imagen":
            "No encontramos la foto en ese pin. Prueba subiéndola como archivo en vez del link.",
        };
        registrar("busqueda_error", contextoDe(req, tope.usuario?.id), {
          motivo: `pinterest-${extraido.motivo}`,
        });
        return NextResponse.json({ error: mensajes[extraido.motivo] }, { status: 400 });
      }
      imageUrl = extraido.imageUrl;
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

    // Se cuenta solo si el análisis salió bien: una foto que falló no
    // le debe gastar una búsqueda a nadie.
    await registrarBusqueda(tope.usuario.id, result.data.searchTerms);
    registrar("busqueda_ok", contextoDe(req, tope.usuario.id), {
      motor: result.source,
      prendas: result.data.prendas.length,
    });

    return NextResponse.json({
      imageUrl,
      result: result.data,
      source: result.source,
      excludedMerchants: getExcludedMerchants(),
      allowedMerchants: getAllowedMerchants(),
      tiendasInstagram: getTiendasInstagram(),
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
