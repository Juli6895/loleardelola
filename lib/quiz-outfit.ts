import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { resolve } from "path";

// =====================================================================
// Diseñador de outfits a partir del quiz de /personalizar
// =====================================================================
// Aislado de `lib/garment-ai.ts`: aquel analiza una imagen existente; este
// genera un outfit "desde cero" usando solo texto (las respuestas del
// cuestionario). Devuelve dos cosas:
//
//   1) Una lista de prendas (`searchTerms`) lista para buscar en Google
//      Shopping Colombia — mismo formato y vocabulario que el resto del app
//      (español colombiano, género al final, queries cortas y buscables).
//
//   2) Un `imagePrompt` en inglés, optimizado para gpt-image-1, que describe
//      con detalle visual el outfit completo sobre un avatar humano que
//      corresponde al género y tipo de cuerpo del usuario. Esto se pasa
//      directamente a `lib/image-gen.ts`.
// =====================================================================

const MODEL = "claude-sonnet-4-6";

// Mismo helper de fallback de API key que usa garment-ai (evita import
// cruzado).
function getAnthropicKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const content = readFileSync(
      resolve(process.cwd(), ".env.local"),
      "utf-8"
    );
    for (const raw of content.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (key === "ANTHROPIC_API_KEY") {
        const value = line.slice(eq + 1).trim();
        if (value) {
          process.env.ANTHROPIC_API_KEY = value;
          return value;
        }
      }
    }
  } catch {
    // ignorar
  }
  throw new Error(
    "Falta ANTHROPIC_API_KEY en .env.local o variables de entorno"
  );
}

// =====================================================================
// Tipos de entrada y salida del quiz
// =====================================================================

export type QuizGender = "mujer" | "hombre" | "niña" | "niño";
export type QuizBodyType =
  | "delgada"
  | "atletica"
  | "curvilinea"
  | "plus_size"
  | "no_especifica";
export type QuizClima = "calido" | "templado" | "frio";

export type QuizAnswers = {
  // Datos del cuerpo
  gender: QuizGender;
  heightCm?: number | null;
  bodyType?: QuizBodyType;
  ageGroup?: "adulta" | "adolescente" | "nino"; // opcional, lo deriva el gender

  // Estilo
  styles: string[]; // ej: ["casual", "minimalista", "vintage"]
  favoriteColors: string[]; // ej: ["negro", "beige", "vinotinto"]

  // Ocasión
  occasion: string; // ej: "salida casual", "oficina", "fiesta"
  climate?: QuizClima;

  // Contexto extra opcional
  freeText?: string;
};

export type QuizOutfitResult = {
  // Lista de prendas en español colombiano (4-6 ítems típicamente), cada una
  // con género al final ("mujer" / "hombre" / "niña" / "niño") para que
  // Google Shopping filtre la sección correcta del catálogo.
  searchTerms: string[];
  // 3-5 colores dominantes del outfit (en español).
  dominantColors: string[];
  // Prompt en inglés para gpt-image-1.
  imagePrompt: string;
  // Resumen corto en español de cómo se ve el outfit (para mostrar en UI).
  outfitSummary: string;
};

// =====================================================================
// System prompt: estilista personal colombiana + reglas de output
// =====================================================================

const SYSTEM_PROMPT = `Eres una personal stylist colombiana experta. Recibes un perfil corto de una persona (género, tipo de cuerpo, estilo preferido, ocasión, colores favoritos) y diseñas UN outfit completo que:

1. Le quede según su tipo de cuerpo y género.
2. Sea apropiado para la ocasión y el clima descritos.
3. Refleje su estilo y colores preferidos.
4. Sea buscable en Google Shopping Colombia (ropa real que existe en tiendas).

━━━ FORMATO DE LAS PRENDAS (searchTerms) ━━━

Devuelve entre 4 y 6 prendas/accesorios. Cada prenda en una sola línea con este patrón corto:

[PRENDA] [COLOR] [MODIFICADOR opcional] [GÉNERO al final]

- MÁXIMO 5 palabras por término (4 descriptivas + género).
- Vocabulario colombiano: "tenis" (no zapatillas), "jean" (no vaqueros), "buzo" o "hoodie", "chaqueta", "blusa", "vestido", "bolso", "gafas de sol".
- Una sola palabra para el color preferiblemente (negro, beige, café, vinotinto, verde olivo, etc.).
- Si hay estampado, escoge UN solo descriptor (rayas, floral, cuadros, animal print).
- Un solo modificador de silueta: oversize, wide leg, midi, cropped, chunky, etc.
- Al FINAL siempre el género: "mujer", "hombre", "niña" o "niño".
- NUNCA marcas.

Ejemplos buenos:
- "jean wide leg azul mujer"
- "chaqueta bomber café hombre"
- "tenis blancos chunky mujer"
- "blusa rayas mujer"
- "vestido midi negro mujer"
- "blazer beige oversize hombre"
- "bolso tote camel mujer"
- "vestido floral niña"

Ejemplos malos:
- ❌ "jean azul oscuro wide leg cropped mujer" (6 palabras)
- ❌ "chaqueta bomber Nike café hombre" (tiene marca)
- ❌ "ropa bonita para fiesta" (no es buscable)

━━━ COHERENCIA DEL OUTFIT ━━━

- Las prendas deben combinar entre sí (no pongas vestido + jean).
- Considera la pirámide: 1 pieza principal (vestido / chaqueta llamativa / pantalón con personalidad) + piezas básicas que la complementen.
- Si la ocasión es deportiva, no incluyas tacones. Si es formal, no incluyas tenis chunky.
- Si el clima es frío, incluye prenda externa (chaqueta / abrigo / cardigan). Si es cálido, ropa ligera.

━━━ COLORES DOMINANTES (dominantColors) ━━━

3-5 colores que dominen el outfit. Respeta los colores favoritos del usuario cuando puedas; balancea con neutros si es necesario.

━━━ IMAGEN DEL AVATAR (imagePrompt) ━━━

Genera UN prompt en INGLÉS (no español) para un modelo de generación de imágenes (gpt-image-1) que renderice una foto realista de UNA persona vistiendo el outfit completo. El prompt debe:

- Empezar con: "Photorealistic full-body fashion photo of a [age group] [gender], [body type description if relevant], standing pose against a neutral light gray studio background, soft natural lighting."
- Después describir CADA prenda con detalle visual: nombre en inglés, color exacto, material si aplica, silueta, largo. Ejemplo: "wearing a wide-leg medium-wash blue denim jean, a cream oversized cotton bomber jacket, white chunky platform sneakers, a small camel leather crossbody bag, and black cat-eye sunglasses."
- Terminar con: "Editorial fashion magazine style, sharp focus, high detail, 4K, no text, no watermark."
- Sin marcas, sin nombres propios, sin texto en la imagen.

Ejemplo completo:
"Photorealistic full-body fashion photo of an adult woman with an athletic build, standing pose against a neutral light gray studio background, soft natural lighting. She is wearing a wide-leg medium-wash blue denim jean, a cream oversized cotton bomber jacket, white chunky platform sneakers, a small camel leather crossbody bag, and black cat-eye sunglasses. Editorial fashion magazine style, sharp focus, high detail, 4K, no text, no watermark."

━━━ RESUMEN (outfitSummary) ━━━

Una sola frase en español, casual y conversacional, describiendo el look en una línea. Ej: "Outfit casual chic con jean wide leg, bomber crema y tenis chunky — ideal para un brunch de domingo."

━━━ REGLAS FINALES ━━━

- Llama SIEMPRE a la herramienta design_outfit. No respondas con texto plano.
- Si algún dato del quiz falta, asume valores razonables (ej. clima templado si no se especifica).`;

// Tool de Anthropic para output estructurado.
const DESIGN_TOOL: Anthropic.Tool = {
  name: "design_outfit",
  description:
    "Diseña un outfit completo basado en el perfil del usuario, devolviendo las prendas, colores, prompt de imagen y un resumen.",
  input_schema: {
    type: "object",
    properties: {
      searchTerms: {
        type: "array",
        items: { type: "string" },
        description:
          "Lista de 4-6 prendas del outfit. MÁXIMO 5 palabras c/u, género al final (mujer/hombre/niña/niño). Vocabulario colombiano.",
      },
      dominantColors: {
        type: "array",
        items: { type: "string" },
        description:
          "3-5 colores que dominan el outfit, en español (negro, beige, café, etc.).",
      },
      imagePrompt: {
        type: "string",
        description:
          "Prompt EN INGLÉS para gpt-image-1, describiendo una foto full-body realista de una persona con el outfit completo. Sigue el formato del system prompt exactamente.",
      },
      outfitSummary: {
        type: "string",
        description:
          "Una sola frase en español describiendo el look y para qué sirve.",
      },
    },
    required: [
      "searchTerms",
      "dominantColors",
      "imagePrompt",
      "outfitSummary",
    ],
  },
};

// =====================================================================
// Construcción del mensaje del usuario a partir de las respuestas
// =====================================================================
function buildUserMessage(answers: QuizAnswers): string {
  const lines: string[] = ["Perfil del usuario:"];

  lines.push(`- Género: ${answers.gender}`);

  if (answers.heightCm) {
    lines.push(`- Estatura: ${answers.heightCm} cm`);
  }
  if (answers.bodyType && answers.bodyType !== "no_especifica") {
    const bodyMap: Record<QuizBodyType, string> = {
      delgada: "delgada / slim",
      atletica: "atlética / tonificada",
      curvilinea: "curvilínea / con curvas",
      plus_size: "plus size / talla grande",
      no_especifica: "",
    };
    lines.push(`- Tipo de cuerpo: ${bodyMap[answers.bodyType]}`);
  }

  if (answers.styles.length > 0) {
    lines.push(`- Estilo preferido: ${answers.styles.join(", ")}`);
  }
  if (answers.favoriteColors.length > 0) {
    lines.push(`- Colores favoritos: ${answers.favoriteColors.join(", ")}`);
  }
  lines.push(`- Ocasión: ${answers.occasion}`);
  if (answers.climate) {
    const climaMap: Record<QuizClima, string> = {
      calido: "cálido",
      templado: "templado",
      frio: "frío",
    };
    lines.push(`- Clima: ${climaMap[answers.climate]}`);
  }
  if (answers.freeText && answers.freeText.trim()) {
    lines.push(`- Contexto adicional: ${answers.freeText.trim()}`);
  }

  lines.push("");
  lines.push(
    "Diseña UN outfit que cumpla con esto y llama a design_outfit con los campos requeridos."
  );

  return lines.join("\n");
}

// =====================================================================
// Función pública
// =====================================================================

/**
 * Diseña un outfit a partir de las respuestas del quiz usando Claude.
 *
 * No genera la imagen — solo devuelve el prompt para gpt-image-1 y la lista
 * de prendas. La generación de la imagen vive en `lib/image-gen.ts`.
 */
export async function generateOutfitFromQuiz(
  answers: QuizAnswers
): Promise<QuizOutfitResult> {
  const apiKey = getAnthropicKey();
  const client = new Anthropic({ apiKey });

  const userMessage = buildUserMessage(answers);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    // Prompt caching: el system prompt se repite en cada quiz, así que vale
    // marcarlo para amortizar costo en sesiones consecutivas.
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [DESIGN_TOOL],
    tool_choice: { type: "tool", name: "design_outfit" },
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUse || toolUse.name !== "design_outfit") {
    throw new Error("Claude no devolvió un design_outfit válido");
  }

  const input = toolUse.input as {
    searchTerms?: string[];
    dominantColors?: string[];
    imagePrompt?: string;
    outfitSummary?: string;
  };

  return {
    searchTerms: Array.isArray(input.searchTerms) ? input.searchTerms : [],
    dominantColors: Array.isArray(input.dominantColors)
      ? input.dominantColors
      : [],
    imagePrompt: typeof input.imagePrompt === "string" ? input.imagePrompt : "",
    outfitSummary:
      typeof input.outfitSummary === "string" ? input.outfitSummary : "",
  };
}
