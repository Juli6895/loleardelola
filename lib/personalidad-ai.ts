import Anthropic from "@anthropic-ai/sdk";
import { fetchImageAsBase64 } from "./garment-ai";
import { PERSONALIDADES, type Personalidad } from "./image-consulting/personalidad";

// =====================================================================
// Identifica la personalidad de estilo (Pilar 5 del manual) de dos
// formas, a elección de la usuaria:
//   1. Por referente: da el nombre de una celebridad/personaje con la
//      que se identifica en cuanto a estilo → Claude infiere el
//      arquetipo desde su conocimiento general de esa figura.
//   2. Por foto: sube una foto suya o de una referencia/inspiración de
//      estilo → Claude analiza las prendas y la estética visible.
//
// Ambas devuelven el mismo shape para que la UI (mi-perfil) las trate
// igual sin importar cómo se obtuvo el resultado.
// =====================================================================

const MODEL = "claude-haiku-4-5";

const PERSONALIDADES_DESC = (Object.keys(PERSONALIDADES) as Personalidad[])
  .map((p) => `- "${p}": ${PERSONALIDADES[p].label} — ${PERSONALIDADES[p].descripcion}`)
  .join("\n");

export type PersonalidadResultado = {
  personalidad: Personalidad;
  personalidadSecundaria: Personalidad | null;
  explicacion: string;
  // Por texto: si Claude realmente reconoce al personaje/celebridad.
  // Por foto: si la imagen mostraba ropa/estilo suficiente para analizar.
  confiable: boolean;
};

const REPORT_TOOL: Anthropic.Tool = {
  name: "report_personalidad",
  description: "Reporta el arquetipo de personalidad de estilo inferido.",
  input_schema: {
    type: "object",
    properties: {
      personalidad: {
        type: "string",
        enum: ["clasica", "romantica", "dramatica", "natural", "creativa", "sensual"],
        description: "Arquetipo de personalidad de estilo dominante.",
      },
      personalidadSecundaria: {
        type: "string",
        enum: ["clasica", "romantica", "dramatica", "natural", "creativa", "sensual", "ninguna"],
        description: "Arquetipo secundario si hay una mezcla clara, o 'ninguna' si el dominante ya lo describe bien.",
      },
      explicacion: {
        type: "string",
        description: "2-3 frases explicando por qué, con ejemplos concretos de prendas/estética observadas o conocidas de esa figura. En español colombiano, tono cercano.",
      },
      confiable: {
        type: "boolean",
        description: "true si reconoces al personaje con certeza (caso texto) o la imagen muestra ropa/estilo claro (caso foto). false si es una figura poco conocida o la imagen no deja ver bien el estilo.",
      },
    },
    required: ["personalidad", "personalidadSecundaria", "explicacion", "confiable"],
  },
};

function parseToolResult(response: Anthropic.Message): PersonalidadResultado {
  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse || toolUse.name !== "report_personalidad") {
    throw new Error("Claude no devolvió un report_personalidad válido");
  }
  const input = toolUse.input as {
    personalidad?: string;
    personalidadSecundaria?: string;
    explicacion?: string;
    confiable?: boolean;
  };

  const VALID: Personalidad[] = ["clasica", "romantica", "dramatica", "natural", "creativa", "sensual"];
  const personalidad: Personalidad = VALID.includes(input.personalidad as Personalidad)
    ? (input.personalidad as Personalidad)
    : "natural";
  const secundariaRaw = input.personalidadSecundaria;
  const personalidadSecundaria: Personalidad | null =
    secundariaRaw && VALID.includes(secundariaRaw as Personalidad)
      ? (secundariaRaw as Personalidad)
      : null;

  return {
    personalidad,
    personalidadSecundaria,
    explicacion: input.explicacion?.trim() || "",
    confiable: input.confiable ?? true,
  };
}

/**
 * Infiere la personalidad de estilo a partir del nombre de una celebridad
 * o personaje con el que la usuaria se identifica. Solo texto, no imagen.
 */
export async function inferirPersonalidadPorReferencia(
  nombreReferencia: string
): Promise<PersonalidadResultado> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: `Eres una estilista colombiana experta en asesoría de imagen. Una usuaria te dice con qué celebridad o personaje se identifica en cuanto a ESTILO DE VESTIR (no personalidad general, específicamente su forma de vestir). Tu trabajo es ubicarla en uno de estos 6 arquetipos de personalidad de estilo, según lo que sabes del estilo habitual de esa figura:\n\n${PERSONALIDADES_DESC}\n\nSi no reconoces a la persona/personaje o hay muy poca información pública sobre su estilo, dilo honestamente en la explicación, marca confiable=false, y elige el arquetipo más neutro ("natural") como valor por defecto — no inventes detalles de alguien que no conoces.\n\nLlama siempre a report_personalidad.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [REPORT_TOOL],
    tool_choice: { type: "tool", name: "report_personalidad" },
    messages: [
      {
        role: "user",
        content: `Me identifico con el estilo de: ${nombreReferencia.trim()}`,
      },
    ],
  });

  return parseToolResult(response);
}

/**
 * Infiere la personalidad de estilo a partir de una foto — puede ser una
 * foto de la propia usuaria o una imagen de inspiración/referencia.
 * Solo mira las decisiones de estilo (ropa, color, accesorios), nunca
 * comenta sobre cuerpo, cara u otros rasgos físicos.
 */
export async function inferirPersonalidadPorImagen(
  imageUrl: string
): Promise<PersonalidadResultado> {
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
        text: `Eres una estilista colombiana experta en asesoría de imagen. Te llega una foto — puede ser de la propia usuaria o una imagen de inspiración de estilo que le gusta. Analiza SOLO las decisiones de estilo visibles: prendas, cortes, colores, texturas, accesorios y la estética general del outfit. NUNCA comentes ni tengas en cuenta el cuerpo, la cara, el peso u otros rasgos físicos de la persona en la foto — el análisis es 100% sobre la ropa y el styling, no sobre la persona.\n\nUbica esa estética en uno de estos 6 arquetipos de personalidad de estilo:\n\n${PERSONALIDADES_DESC}\n\nSi la imagen no muestra ropa/estilo claro (por ejemplo, una foto muy de cerca de la cara, o mal iluminada), dilo en la explicación y marca confiable=false.\n\nLlama siempre a report_personalidad.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [REPORT_TOOL],
    tool_choice: { type: "tool", name: "report_personalidad" },
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
            text: "Analiza el estilo de esta foto y reporta con report_personalidad.",
          },
        ],
      },
    ],
  });

  return parseToolResult(response);
}
