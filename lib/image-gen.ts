import OpenAI from "openai";
import { uploadImage } from "@/lib/cloudinary";

// =====================================================================
// Generación de imágenes con OpenAI gpt-image-1
// =====================================================================
// Se usa exclusivamente desde /personalizar (feature/prenda-personalizada).
// El flujo de /buscar NO depende de este archivo.
//
// Por qué OpenAI gpt-image-1:
//   - Conocimiento muy bueno de moda y figuras humanas.
//   - Sigue prompts en español detallados con vocabulario técnico de ropa.
//   - Calidad consistente para "avatar de cuerpo entero con outfit X".
//
// Costo aprox: $0.02 por imagen 1024x1024 calidad media. Solo se llama una
// vez por sesión de quiz (cuando la usuaria termina el cuestionario).
//
// Devuelve la imagen ya subida a Cloudinary (URL pública) para que:
//   - El cliente la pueda mostrar sin lidiar con base64.
//   - Se pueda persistir si la usuaria guarda el outfit.
// =====================================================================

type GenerateOptions = {
  // Prompt principal (cómo se ve el outfit + el avatar).
  prompt: string;
  // Tamaño de imagen. gpt-image-1 acepta 1024x1024, 1024x1536 (retrato),
  // 1536x1024 (paisaje). Para outfits de cuerpo entero, retrato es ideal.
  size?: "1024x1024" | "1024x1536" | "1536x1024";
  // "low" | "medium" | "high". Default "medium" (balance costo/calidad).
  quality?: "low" | "medium" | "high";
};

/**
 * Genera una imagen con gpt-image-1, la sube a Cloudinary y devuelve la URL.
 *
 * @throws si falta OPENAI_API_KEY o la API responde con error.
 */
export async function generateOutfitImage(
  options: GenerateOptions
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta OPENAI_API_KEY. Agrega la variable a .env.local para usar /personalizar."
    );
  }

  const client = new OpenAI({ apiKey });

  // gpt-image-1 siempre devuelve base64 (no URLs como dall-e-3 antiguo).
  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt: options.prompt,
    size: options.size ?? "1024x1536",
    quality: options.quality ?? "medium",
    n: 1,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("gpt-image-1 no devolvió datos de imagen");
  }

  // Cloudinary acepta data URLs.
  const dataUrl = `data:image/png;base64,${b64}`;
  const cloudinaryUrl = await uploadImage(dataUrl);

  return cloudinaryUrl;
}
