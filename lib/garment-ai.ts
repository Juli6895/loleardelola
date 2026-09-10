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

2. **CADA término MÁXIMO 5 palabras**: prenda + color + (modificador opcional) + GÉNERO al final. Más palabras = búsqueda con cero resultados en Google Shopping. Piensa cómo una persona real escribiría la búsqueda — corto y directo.

   Ejemplos BUENOS (≤ 5 palabras, con género al final):
   - "jean wide leg azul mujer"
   - "chaqueta bomber café hombre"
   - "tenis blancos chunky mujer"
   - "vestido midi negro mujer"
   - "blazer beige oversize hombre"
   - "blusa rayas mujer"
   - "buzo gris niño"
   - "vestido floral niña"
   - "botas negras cuero mujer"

   Ejemplos MALOS (recortar):
   - ❌ "chaqueta azul oscuro estampado rayas mujer" (6) → ✅ "chaqueta rayas azul mujer"
   - ❌ "jean azul oscuro wide leg cropped hombre" (6) → ✅ "jean wide leg azul hombre"
   - ❌ "vestido midi blanco estampado floral mujer" (6) → ✅ "vestido floral midi mujer"

3. **GÉNERO obligatorio al final**: agrega "hombre", "mujer", "niño" o "niña" como última palabra de CADA término. Detecta el género según la persona que viste la prenda en la foto:
   - Adulta femenina → "mujer"
   - Adulto masculino → "hombre"
   - Niño hasta ~12 años, masculino → "niño"
   - Niña hasta ~12 años, femenina → "niña"
   Si la imagen no muestra persona o no es claro (foto solo de la prenda), usa "mujer" como default. Esto ayuda a Google Shopping a filtrar la sección correcta del catálogo.

4. Vocabulario en español COLOMBIANO:
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
   - "top corset" o "corset" (bustier/corset top, con o sin varillas visibles)
   - "collar" (necklace), "cadena" cuando es una cadena metálica fina

5. COLORES: usa nombres comunes en español, UNA sola palabra preferible (negro, blanco, azul, rojo, vinotinto, verde, café, beige, crema, amarillo, mostaza, naranja, rosa, morado, gris). Solo usa colores compuestos ("azul oscuro", "verde olivo") cuando sean cruciales — y NO agregues otro modificador después. Si no estás 99% segura del color, omítelo.

6. ESTAMPADOS Y TEXTURAS: si la prenda tiene estampado o un acabado especial, escoge UN solo descriptor:
   - Estampados: "rayas", "cuadros", "floral", "animal print", "estampado"
   - Acabados/pedrería: "brillante", "lentejuelas", "pedrería", "metalizado", "satinado" — usa estos para telas con brillo, cristales, strass o lentejuelas. ¡OJO! Un pantalón o top cubierto de piedras/cristales/lentejuelas NUNCA es "lunares" — es "brillante" o "pedrería", aunque a simple vista los puntos brillantes parezcan un patrón de lunares.
   NO combines color + estampado/textura en el mismo término salvo que sea esencial.

7. ESTILO opcional (UN solo modificador): "oversize", "wide leg", "skinny", "midi", "crop", "cuero", "denim", "chunky", "bajos", "altos", "cropped", "corset". Solo si la prenda lo necesita para buscarse bien.

8. NO MARCAS: nunca menciones marcas registradas (Nike, Zara, etc).

9. PRESUPUESTO (si te llega en el mensaje del usuario):
   - El usuario te dará un presupuesto TOTAL en pesos colombianos (COP).
   - Reparte ese total entre las prendas considerando lo que vale típicamente
     cada una en Colombia. Las prendas grandes/centrales (vestido, chaqueta,
     tenis, jean) se llevan más; los accesorios (gafas, gorra, cinturón)
     menos. Cuida que la suma NO supere el total dado.
   - Devuelve un priceMaxCop entero (sin decimales, sin separadores) por cada
     prenda, EN EL MISMO ORDEN que searchTerms.
   - Si NO te llega presupuesto, omite priceMaxCop o devuelve un array vacío.

10. Además de searchTerms, reporta CADA prenda también desglosada en piezas separadas (mismo orden, mismo largo que searchTerms) para que la usuaria vea el detalle claro, no solo el texto de búsqueda:
   - tipoPrenda: el tipo de prenda solo, sin color ni estilo (ej: "top corset", "jean", "collar")
   - colores: el color principal de ESA prenda específica (ej: "negro"). Cadena vacía "" solo si de verdad no es determinable.
   - detalles: textura/estampado/acabado de ESA prenda si aplica (ej: "pedrería", "rayas", "cuero", "wide leg"). Cadena vacía "" si no aplica.

11. Devuelve también:
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
          "Lista de 3-7 términos de búsqueda en español colombiano. MÁXIMO 5 palabras por término: prenda + color + (modificador opcional) + GÉNERO al final (hombre/mujer/niño/niña, default 'mujer' si no se ve persona). Ej: 'jean wide leg azul mujer', 'chaqueta bomber café hombre', 'vestido floral niña'. NO uses descripciones largas tipo 'chaqueta azul oscuro estampado rayas mujer' — Google Shopping no devuelve nada con queries largas.",
      },
      priceMaxCop: {
        type: "array",
        items: { type: "integer" },
        description:
          "Precio máximo en pesos colombianos (COP, entero, sin decimales) por cada prenda, mismo orden que searchTerms. SOLO incluir si el usuario dio un presupuesto en su mensaje. Distribuye el total realisticamente entre prendas (jean/chaqueta/tenis pesan más, accesorios menos). La suma no debe superar el presupuesto total.",
      },
      tipoPrenda: {
        type: "array",
        items: { type: "string" },
        description:
          "Tipo de cada prenda SOLO (sin color ni estilo), mismo orden y largo que searchTerms. Ej: ['top corset', 'pantalón', 'collar'].",
      },
      colores: {
        type: "array",
        items: { type: "string" },
        description:
          "Color principal de CADA prenda por separado, mismo orden y largo que searchTerms. Español, en lo posible una sola palabra. Cadena vacía '' solo si de verdad no es determinable para esa prenda.",
      },
      detalles: {
        type: "array",
        items: { type: "string" },
        description:
          "Textura, estampado o acabado de CADA prenda si aplica, mismo orden y largo que searchTerms. Ej: 'pedrería', 'rayas', 'cuero', 'wide leg', 'corset'. Cadena vacía '' si no aplica.",
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

export type SupportedMedia = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/**
 * Descarga una imagen y la convierte a base64. Pinterest, Cloudinary y la
 * mayoría de CDNs sirven sin auth pero bloquean bots vía robots.txt — por eso
 * no podemos delegarle el fetch a Anthropic. Exportada porque también la usa
 * lib/personalidad-ai.ts.
 */
export async function fetchImageAsBase64(
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
    tipoPrenda?: string[];
    colores?: string[];
    detalles?: string[];
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

  // Mismo alineamiento defensivo para el desglose por prenda — si Claude
  // omite el array o la longitud no coincide, rellenamos con null en vez
  // de romper el invariante "i-ésimo detalle pertenece a la i-ésima prenda".
  const alinear = (arr: unknown): (string | null)[] => {
    const raw = Array.isArray(arr) ? (arr as unknown[]) : [];
    return searchTerms.map((_, i) => {
      const v = raw[i];
      return typeof v === "string" && v.trim() ? v.trim() : null;
    });
  };

  return {
    searchTerms,
    priceMaxCop,
    tipoPrenda: alinear(input.tipoPrenda),
    colores: alinear(input.colores),
    detalles: alinear(input.detalles),
    dominantColors: Array.isArray(input.dominantColors)
      ? input.dominantColors
      : [],
    rawLabels: Array.isArray(input.rawLabels) ? input.rawLabels : [],
  };
}

// =====================================================================
// Analizador de UNA prenda para el Clóset digital (Fase 1 del roadmap
// premium). A diferencia de analyzeImageWithClaude (que mira un outfit
// completo puesto por una persona), esto clasifica una sola prenda —
// normalmente una foto plana ("flat lay") o colgada, sin modelo.
// =====================================================================

export type ClosetCategory =
  | "top"
  | "bottom"
  | "vestido"
  | "abrigo"
  | "calzado"
  | "accesorio";

export type ClosetItemAnalysis = {
  category: ClosetCategory;
  color: string | null;
  tags: string[];
  label: string;
};

const CLOSET_SYSTEM_PROMPT = `Eres una estilista colombiana organizando el clóset digital de una usuaria. Te llega la foto de UNA sola prenda (puede estar sobre una superficie, colgada, o puesta por alguien) y la tienes que clasificar para un guardarropa digital — no es un outfit completo.

REGLAS:

1. category: elige EXACTAMENTE una de estas 6 opciones según la prenda:
   - "top": camisas, blusas, camisetas, tops, sacos, buzos
   - "bottom": pantalones, jeans, faldas, shorts, pantalonetas
   - "vestido": vestidos y enterizos
   - "abrigo": chaquetas, blazers, abrigos, ruanas
   - "calzado": tenis, botas, tacones, sandalias
   - "accesorio": bolsos, gorras, gafas, cinturones, joyería, bufandas

2. color: el color principal en español, una sola palabra (negro, blanco, azul, café, beige, crema, rosa, etc). Si de verdad no es claro, usa null.

3. tags: 2-4 palabras sueltas en español que describan la prenda para poder combinarla después — tipo de tela aparente, corte, estampado, ocasión. Ej: ["denim", "wide leg", "casual"] o ["cuero", "formal"].

4. label: nombre corto para mostrar en la app, tipo "Jean wide leg azul" o "Blazer beige oversize" — prenda + color + (corte si aplica), máximo 4 palabras, SIN marcas.

Llama SIEMPRE a la herramienta report_garment. No respondas con texto plano.`;

const REPORT_GARMENT_TOOL: Anthropic.Tool = {
  name: "report_garment",
  description: "Reporta la clasificación de una prenda de clóset.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["top", "bottom", "vestido", "abrigo", "calzado", "accesorio"],
        description: "Categoría de la prenda, una de las 6 permitidas.",
      },
      color: {
        type: "string",
        description: "Color principal en español, una palabra. Vacío si no es claro.",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "2-4 tags cortos en español: tela, corte, estampado u ocasión.",
      },
      label: {
        type: "string",
        description: "Nombre corto para mostrar, máx 4 palabras, sin marcas.",
      },
    },
    required: ["category", "tags", "label"],
  },
};

/**
 * Clasifica una sola prenda (foto de clóset) con Claude: categoría, color,
 * tags y un nombre corto para mostrar en la grilla del clóset.
 *
 * @throws si falta ANTHROPIC_API_KEY, la imagen no se puede descargar, la
 * API responde con error, o Claude devuelve una categoría inválida.
 */
export async function analyzeClosetItem(
  imageUrl: string
): Promise<ClosetItemAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");

  const { base64, mediaType } = await fetchImageAsBase64(imageUrl);
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: CLOSET_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [REPORT_GARMENT_TOOL],
    tool_choice: { type: "tool", name: "report_garment" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: "Clasifica esta prenda de clóset y reporta con report_garment.",
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse || toolUse.name !== "report_garment") {
    throw new Error("Claude no devolvió un report_garment válido");
  }

  const input = toolUse.input as {
    category?: string;
    color?: string;
    tags?: string[];
    label?: string;
  };

  const VALID_CATEGORIES: ClosetCategory[] = [
    "top",
    "bottom",
    "vestido",
    "abrigo",
    "calzado",
    "accesorio",
  ];
  const category: ClosetCategory = VALID_CATEGORIES.includes(
    input.category as ClosetCategory
  )
    ? (input.category as ClosetCategory)
    : "accesorio"; // fallback razonable si Claude devuelve algo inesperado

  return {
    category,
    color: input.color?.trim() || null,
    tags: Array.isArray(input.tags) ? input.tags : [],
    label: input.label?.trim() || "Prenda sin nombre",
  };
}
