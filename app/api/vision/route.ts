import { NextResponse } from "next/server";
import { analyzeImage, extractPinterestImage } from "@/lib/vision";
import { uploadImage } from "@/lib/cloudinary";

// Endpoint: POST /api/vision
// Body:
//   - { pinterestUrl: string }          → extrae og:image y analiza
//   - { imageUrl: string }              → analiza URL pública
//   - { imageBase64: "data:image/..." } → sube a Cloudinary + analiza
// Devuelve: { imageUrl, result }
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
      // Subir a Cloudinary para tener URL pública (Vision también acepta base64,
      // pero queremos persistir la imagen para poder guardarla luego)
      imageUrl = await uploadImage(body.imageBase64);
    } else {
      return NextResponse.json(
        { error: "Debes enviar pinterestUrl, imageUrl o imageBase64." },
        { status: 400 }
      );
    }

    const result = await analyzeImage({ url: imageUrl! });

    return NextResponse.json({ imageUrl, result });
  } catch (e: any) {
    console.error("[/api/vision] error:", e);
    return NextResponse.json(
      { error: "Algo salió mal analizando la imagen. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
