import Anthropic from "@anthropic-ai/sdk";
import type { VisionResult } from "@/types";

// =====================================================================
// Analizador de outfits con Claude (multimodal)
// =====================================================================
// Por qué Claude en vez de Google Vision:
//   - Vision regresa labels genéricos ("jacket", "trousers") y un solo bag de
//     colores dominantes para toda la imagen → no podemos atribuir colores a
//     prendas específicas. Resultado: "pantalón café" cuando el café era la
//     pared.
//   - Un LLM multimodal mira la imagen completa, identifica cada prenda, su
//     color real, su estilo, y devuelve términos listos para Google Shopping
//     en español colombiano.
//
// Usamos:
//   - Claude Haiku 4.5: barato (~$1/MTok input, $5/MTok output) y rápido.
//   - Tool use para forzar output estructurado (sin parsear JSON ad-hoc).
//   - Prompt caching en el system prompt: el system es ~1KB y se repite en
//     cada análisis → 90% menos costo en cache hits.
//   - Descarga server-side + base64: NO usamos image.source.type "url" porque
//     Anthropic respeta robots.txt y Pinterest CDN lo bloquea ("This URL is
//     disallowed by the website's robots.txt"). El server descarga los bytes
//     y se los pasa a Claude inline.
// =====================================================================

const MODEL = "claude-haiku-4-5";

// System prompt: persona + instrucciones de formato. Cacheable porque no
// cambia entre llamadas.
const SYSTEM_PROMPT = `Eres una stylist colombiana experta en moda urbana y casual. Tu trabajo es mirar una foto de outfit (de Pinterest, Instagram o similar) e identificar las prendas y accesorios con precisión para que la usuaria los pueda buscar en Google Shopping Colombia.

REGLAS:

1. Identifica entre 3 y 7 prendas/accesorios principales del outfit. NO inventes prendas que no se ven claramente. NO listes detalles internos (botones, costuras, etc).

2. Para cada prenda usa este formato: "[prenda] [color] [estilo opcional]". Ejemplos:
   - "jean azul oscuro wide leg"
   - "chaqueta bomber café"
   - "tenis blancos chunky"
   - "vestido midi negro"
   - "bolso de mano café cuero"
   - "blazer beige oversize"
   - "falda midi denim"
   - "botas negras cuero altas"

3. Vocabulario en español COLOMBIANO:
   - "tenis" (no zapatillas, no sneakers)
   - "buzo" o "hoodie" (sudadera con capucha)
   - "saco" (sweater)
   - "jean" (pantalón de mezclilla)
   - "pantaloneta" o "short" (no bermudas)
   - "chaqueta" (jacket)
   - "gorra" (cap), "sombrero" (hat)
   - "bolso" (bag), "cartera" para clutch o cartera pequeña
   - "gafas de sol" (sunglasses)
   - "vestido" (dress), "enterizo" (jumpsuit)

4. COLORES: usa nombres comunes en español (negro, blanco, azul, azul oscuro, azul claro, rojo, vinotinto, verde, verde olivo, café, beige, crema, amarillo, mostaza, naranja, rosa, rosado, morado, lila, gris, multicolor). Si una prenda es estampada, di "estampado floral", "rayas", "cuadros", etc. Si no estás 99% segura del color, omítelo (mejor "chaqueta" sin color que el color equivocado).

5. ESTILO opcional: agrégalo solo si es claro y útil para la búsqueda — "oversize", "wide leg", "skinny", "midi", "crop", "cuero", "denim", "chunky", "bajos", "altos", "cropped". No metas más de 1-2 modificadores por prenda.

6. NO MARCAS: nunca menciones marcas registradas (Nike, Zara, etc).

7. PRESUPUESTO (si te llega en el mensaje del usuario):
   - El usuario te dará un presupuesto TOTAL en pesos colombianos (COP).
   - Reparte ese total entre las prendas considerando lo que vale típicamente
     cada una en Colombia. Las prendas grandes/centrales (vestido, chaqueta,
     tenis, jean) se llevan más; los accesorios (gafas, gorra, cinturón)
     menos. Cuida que la suma NO supere el total dado.
   - Devuelve un priceMaxCop entero (sin decimales, sin separadores) por cada
     prenda, EN EL MISMO ORDEN que searchTerms.
   - Si NO te llega presupuesto, omite priceMaxCop o devuelve un array vacío.

8. Devuelve también:
   - dominantColors: 2-4 colores principales del outfit en español
   - rawLabels: lista en inglés de las prendas que ves (debug)

Llama SIEMPRE a la herramienta report_outfit. No respondas con texto plano.`;

// Tool de Anthropic para output estructurado.
const REPORT_TOOL: Anthropic.Tool = {
  name: "report_outfit",
  description:
    "Reporta las prendas y accesorios detectados en el outfit, con términos listos para buscar en Google Shopping.",
  input_schema: {
    type: "object",
    properties: {
      searchTerms: {
        type: "array",
        items: { type: "string" },
        description:
          "Lista de 3-7 términos de búsqueda en español colombiano, formato '[prenda] [color] [estilo opcional]'. Ej: 'jean azul oscuro wide leg'.",
      },
      priceMaxCop: {
        type: "array",
        items: { type: "integer" },
        description:
          "Precio máximo en pesos colombianos (COP, entero, sin decimales) por cada prenda, mismo orden que searchTerms. SOLO incluir si el usuario dio un presupuesto en su mensaje. Distribuye el total realisticamente entre prendas (jean/chaqueta/tenis pesan más, accesorios menos). La suma no debe superar el presupuesto total.",
      },
      dominantColors: {
        type: "array",
        items: { type: "string" },
        description:
          "Lista de 2-4 colores principales del outfit, en español (negro, beige, café, etc).",
      },
      rawLabels: {
        type: "array",
        items: { type: "string" },
        description:
          "Lista cruda de las prendas detectadas en inglés (para debugging). Ej: ['bomber jacket', 'jeans', 'sneakers'].",
      },
    },
    required: ["searchTerms", "dominantColors", "rawLabels"],
  },
};

type SupportedMedia = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/**
 * Descarga una imagen y la convierte a base64. Pinterest, Cloudinary y la
 * mayoría de CDNs sirven sin auth pero bloquean bots vía robots.txt — por eso
 * no podemos delegarle el fetch a Anthropic.
 */
async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ base64: string; mediaType: SupportedMedia }> {
  const res = await fetch(imageUrl, {
    headers: {
      // Pinterest entrega 403 a User-Agents desconocidos. Mismo header que
      // usamos para scrapear el HTML del pin.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(
      `No se pudo descargar la imagen (HTTP ${res.status}): ${imageUrl}`
    );
  }

  const contentType = (res.headers.get("content-type") ?? "image/jpeg")
    .split(";")[0]
    .trim()
    .toLowerCase();

  // Anthropic acepta jpeg/png/gif/webp. Si llega algo raro (ej. avif),
  // reportamos jpeg como mejor adivinanza — Claude suele decodificar igual.
  const mediaType: SupportedMedia = (
    ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(contentType)
      ? contentType
      : "image/jpeg"
  ) as SupportedMedia;

  const buffer = Buffer.from(await res.arrayBuffer());
  return { base64: buffer.toString("base64"), mediaType };
}

export type AnalyzeOptions = {
  // Presupuesto total del outfit en COP. Si está, le pedimos a Claude que
  // distribuya el monto entre las prendas y devuelva priceMaxCop por cada una.
  budgetCop?: number | null;
};

/**
 * Analiza una foto de outfit con Claude y devuelve términos de búsqueda
 * estructurados, opcionalmente con priceMaxCop por prenda si se da un
 * presupuesto total.
 *
 * @throws si falta ANTHROPIC_API_KEY, la imagen no se puede descargar, o la
 * API responde con error.
 */
export async function analyzeImageWithClaude(
  imageUrl: string,
  options: AnalyzeOptions = {}
): Promise<VisionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");

  const { base64, mediaType } = await fetchImageAsBase64(imageUrl);

  const client = new Anthropic({ apiKey });

  // Construir el mensaje del usuario. Si hay presupuesto, lo metemos en el
  // texto para que Claude lo use al calcular priceMaxCop.
  const budget = options.budgetCop && options.budgetCop > 0 ? options.budgetCop : null;
  const userText = budget
    ? `Analiza este outfit. Presupuesto total disponible: ${budget.toLocaleString("es-CO")} COP. Distribuye ese total entre las prendas y devuelve priceMaxCop por cada una. Reporta con report_outfit.`
    : "Analiza este outfit y reporta las prendas con report_outfit. NO incluyas priceMaxCop (no hay presupuesto definido).";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    // Prompt caching: el system prompt se cachea (TTL 5min). En el segundo
    // request consecutivo, los ~1.2KB del system se cobran al 10% del costo.
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [REPORT_TOOL],
    // tool_choice fuerza a Claude a llamar EXACTAMENTE report_outfit.
    // Sin esto a veces responde con texto explicando lo que ve.
    tool_choice: { type: "tool", name: "report_outfit" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: userText,
          },
        ],
      },
    ],
  });

  // Buscar el bloque de tool_use en la respuesta.
  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUse || toolUse.name !== "report_outfit") {
    throw new Error("Claude no devolvió un report_outfit válido");
  }

  const input = toolUse.input as {
    searchTerms?: string[];
    priceMaxCop?: number[];
    dominantColors?: string[];
    rawLabels?: string[];
  };

  const searchTerms = Array.isArray(input.searchTerms) ? input.searchTerms : [];

  // Alinear priceMaxCop con searchTerms. Si Claude se equivoca de longitud,
  // truncamos/rellenamos con null para mantener invariante (i-ésimo precio
  // pertenece al i-ésimo término).
  const rawPrices = Array.isArray(input.priceMaxCop) ? input.priceMaxCop : [];
  const priceMaxCop: (number | null)[] = searchTerms.map((_, i) => {
    const v = rawPrices[i];
    return typeof v === "number" && v > 0 ? Math.round(v) : null;
  });

  return {
    searchTerms,
    priceMaxCop,
    dominantColors: Array.isArray(input.dominantColors)
      ? input.dominantColors
      : [],
    rawLabels: Array.isArray(input.rawLabels) ? input.rawLabels : [],
  };
}
