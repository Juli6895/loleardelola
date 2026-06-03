import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { VisionResult } from "@/types";

/**
 * Lee ANTHROPIC_API_KEY de process.env primero.
 * Si no está (puede pasar cuando Next.js no terminó de inyectar .env.local
 * antes de que el módulo se inicialice), lee el archivo .env.local
 * directamente para garantizar disponibilidad en cualquier entorno.
 */
function getAnthropicKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;

  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const raw of content.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      if (key === "ANTHROPIC_API_KEY") {
        const value = line.slice(eqIdx + 1).trim();
        if (value) {
          // Cacheamos en process.env para las siguientes llamadas
          process.env.ANTHROPIC_API_KEY = value;
          return value;
        }
      }
    }
  } catch {
    // No loguear en producción para no exponer paths
  }

  throw new Error("Falta ANTHROPIC_API_KEY en .env.local o variables de entorno");
}

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

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `Eres una personal shopper colombiana con ojo clínico para la moda. Analizas fotos de outfits y describes cada prenda con suficiente detalle para que alguien pueda encontrarla exactamente en Google Shopping Colombia.

━━━ CÓMO DESCRIBIR CADA PRENDA ━━━

Usa este orden: [PRENDA] [COLOR] [MATERIAL] [SILUETA/CORTE] [LARGO] [DETALLES]

Incluye SOLO los campos que puedas ver claramente. Cuantos más puedas confirmar, mejor.

▸ PRENDA — nombre preciso en español colombiano:
  Inferiores: jean, pantalón de lino, pantalón cargo, pantalón de cuero, falda, falda de tul, short, pantaloneta, leggings
  Superiores: camiseta, camiseta polo, blusa, camisa, camisa oversized, top, crop top, body, esqueleto, camiseta sin mangas
  Abrigos: chaqueta, chaqueta de cuero, chaqueta denim, chaqueta cargo, blazer, abrigo, trench, parka, cardigan, saco de punto
  Cuerpo entero: vestido, enterizo, mono, co-ord set, conjunto
  Calzado: tenis, tenis chunky, botas, botines, tacones, sandalias, mocasines, mulas, baletas, plataformas, oxfords
  Bolsos: bolso tote, bolso de hombro, bolso crossbody, mini bolso, clutch, mochila, riñonera, bolso de mano
  Accesorios: gafas de sol, gorra, sombrero de ala, gorro, bufanda, cinturón, collar, aretes, pulsera, reloj, gorro de lana

▸ COLOR — exacto como lo ves:
  Azules: azul marino, azul cobalto, azul medio, azul cielo, azul bebé, azul acero, azul pizarra, celeste
  Verdes: verde olivo, verde militar, verde esmeralda, verde menta, verde salvia, verde botella, verde lima
  Neutros: negro, blanco, blanco roto, crema, beige, arena, camel, café claro, café oscuro, chocolate, gris claro, gris medio, gris oscuro, gris carbón
  Cálidos: rojo, vinotinto, burdeos, terracota, naranja quemado, naranja, mostaza, amarillo, dorado
  Fríos/pasteles: rosa palo, rosa chicle, lila, lavanda, morado, nude, melocotón
  Estampados: estampado floral, rayas verticales, rayas horizontales, cuadros escoceses, cuadros vichy, animal print, tie-dye, camuflaje, lunares

▸ MATERIAL (si es visible):
  denim, cuero genuino, cuero sintético (PU), ante, punto, lana, lino, algodón, seda, satén, encaje, terciopelo, nylon, cargo (tela gruesa con bolsillos)

▸ SILUETA/CORTE:
  Pantalones: wide leg, straight leg, slim fit, skinny, bootcut, flare, cargo, jogger, palazzo, mom fit, boyfriend
  Faldas: línea A, recta, plisada, asimétrica, con abertura, con volantes
  Tops/camisas: oversize, cropped, ajustado, regular, off-shoulder, halter, corset
  Vestidos: bodycon, camisero, wrap, babydoll, shift
  Calzado: plataforma, suela gruesa, suela delgada, punta cuadrada, punta redonda, punta afilada, tacón bloque, tacón aguja, sin tacón

▸ LARGO:
  Tops: crop (deja abdomen visible), corto (tapa cadera), regular, largo
  Pantalones: tobillero, a la pantorrilla, capri, regular, con vuelta (cuffed)
  Faldas/vestidos: micro, mini, sobre la rodilla, a la rodilla, midi, maxi

▸ DETALLES (solo los que se ven):
  con bolsillos cargo, con cinturón, con hebilla, con botones dorados, con tiras, con volantes, con bordados, con tachas, con corte en V, con escote cuadrado, con cuello mao, transparente, con manga acampanada, con manga globo, rotos (distressed), efecto lavado, brillante, mateado

━━━ EJEMPLOS DE TÉRMINOS BIEN ESCRITOS ━━━
✅ "jean azul medio wide leg tiro alto con doblez tobillero"
✅ "blusa de seda negra off-shoulder manga larga"
✅ "tenis chunky blancos suela gruesa plataforma"
✅ "chaqueta cargo verde olivo oversize con bolsillos grandes"
✅ "vestido midi floral fondo blanco manga corta con botones"
✅ "botas de cuero café oscuro hasta la rodilla taco bloque"
✅ "bolso tote camel cuero grande asa corta"
✅ "blazer gris oscuro oversize con solapas"
✅ "falda midi satén negro con abertura lateral"
✅ "pantalón lino beige straight leg tiro alto"

❌ MAL: "jean azul" → demasiado genérico
❌ MAL: "camiseta" → sin color ni detalle
❌ MAL: "zapatos bonitos" → subjetivo, no buscable

━━━ REGLAS FINALES ━━━
- Entre 4 y 8 prendas/accesorios por outfit
- NUNCA menciones marcas (Nike, Zara, etc.)
- Si no ves bien una prenda, describe lo que SÍ puedes confirmar (no inventes)
- dominantColors: 3-5 colores del outfit, precisos
- rawLabels: nombres en inglés para debug
- Llama SIEMPRE a report_outfit. Nunca texto plano.`;

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
          "Lista de 4-8 términos de búsqueda en español colombiano. Cada término debe incluir: prenda + color exacto + material (si visible) + silueta/corte + largo + detalles clave. Cuanto más descriptivo, mejor. Ej: 'jean azul medio wide leg tiro alto con doblez tobillero', 'blusa de seda negra off-shoulder manga larga', 'tenis chunky blancos suela gruesa plataforma', 'bolso tote camel cuero grande asa corta'.",
      },
      dominantColors: {
        type: "array",
        items: { type: "string" },
        description:
          "Lista de 3-5 colores principales del outfit completo, precisos. Ej: ['azul medio', 'negro', 'camel', 'blanco roto'].",
      },
      rawLabels: {
        type: "array",
        items: { type: "string" },
        description:
          "Nombres de las prendas en inglés con sus detalles clave, para debugging. Ej: ['wide leg mid-blue jeans', 'black off-shoulder silk blouse', 'chunky white platform sneakers'].",
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

/**
 * Analiza una foto de outfit con Claude y devuelve términos de búsqueda
 * estructurados.
 *
 * @throws si falta ANTHROPIC_API_KEY, la imagen no se puede descargar, o la
 * API responde con error.
 */
export async function analyzeImageWithClaude(
  imageUrl: string
): Promise<VisionResult> {
  const apiKey = getAnthropicKey();

  const { base64, mediaType } = await fetchImageAsBase64(imageUrl);

  const client = new Anthropic({ apiKey });

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
            text: "Analiza este outfit con el máximo detalle posible. Para cada prenda describe: color exacto, material si lo ves, silueta/corte, largo y cualquier detalle diferenciador (bolsillos, escote, estampado, acabado). Genera términos de búsqueda precisos y descriptivos. Usa report_outfit.",
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
    dominantColors?: string[];
    rawLabels?: string[];
  };

  return {
    searchTerms: Array.isArray(input.searchTerms) ? input.searchTerms : [],
    dominantColors: Array.isArray(input.dominantColors)
      ? input.dominantColors
      : [],
    rawLabels: Array.isArray(input.rawLabels) ? input.rawLabels : [],
  };
}
