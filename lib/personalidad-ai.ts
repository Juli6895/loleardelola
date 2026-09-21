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

// Ubicar a alguien en un arquetipo es un juicio fino, y con Haiku salía
// impreciso. Va con Sonnet: el volumen es bajo (una vez por usuaria) y
// aquí la precisión importa más que el costo.
const MODEL = "claude-sonnet-5";

// Antes solo se le pasaban la etiqueta y la descripción de cada
// arquetipo. Al mirar una foto eso es demasiado abstracto — el modelo
// tiene que decidir entre "romántica" y "creativa" sin saber en qué se
// nota cada una. Ahora recibe también las prendas, telas y accesorios
// típicos, que es contra lo que de verdad puede comparar lo que ve.
const PERSONALIDADES_DESC = (Object.keys(PERSONALIDADES) as Personalidad[])
  .map((p) => {
    const i = PERSONALIDADES[p];
    return [
      `- "${p}" (${i.label}): ${i.descripcion}`,
      `  Prendas típicas: ${i.prendasClave.join(", ")}.`,
      `  Telas: ${i.telasFavoritas.join(", ")}.`,
      `  Accesorios: ${i.accesorios}`,
      `  En una palabra: ${i.palabrasClave.join(", ")}.`,
    ].join("\n");
  })
  .join("\n\n");

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
      // Primero, por lo mismo que en report_outfit: obliga a mirar antes
      // de clasificar. No se guarda ni se muestra.
      observacion: {
        type: "string",
        description:
          "ANTES de decidir el arquetipo, enumera en 2-3 frases las señales concretas en las que te estás basando: prendas, cortes, colores, telas y accesorios. Si es una foto, solo lo que se ve en ella. Si es un personaje, el estilo por el que se le conoce — y si no lo reconoces, dilo aquí.",
      },
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
    required: [
      "observacion",
      "personalidad",
      "personalidadSecundaria",
      "explicacion",
      "confiable",
    ],
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
    max_tokens: 1024,
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
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: `Eres una estilista colombiana experta en asesoría de imagen. Te llega una foto — puede ser de la propia usuaria o una imagen de inspiración de estilo que le gusta. Analiza SOLO las decisiones de estilo visibles: prendas, cortes, colores, texturas, accesorios y la estética general del outfit. NUNCA comentes ni tengas en cuenta el cuerpo, la cara, el peso u otros rasgos físicos de la persona en la foto — el análisis es 100% sobre la ropa y el styling, no sobre la persona.\n\nUbica esa estética en uno de estos 6 arquetipos de personalidad de estilo:\n\n${PERSONALIDADES_DESC}\n\nCÓMO DECIDIR, que es donde más se falla:\n- Basa el arquetipo en el CORTE y la SILUETA antes que en el color. Un vestido negro puede ser clásico, dramático o sensual según cómo esté cortado; el color solo no decide.\n- Una sola foto es un solo outfit, no la vida entera de alguien. Si lo que ves es un look puntual (ropa de gimnasio, uniforme, una foto de fiesta), dilo en la explicación y marca confiable=false en vez de sacar una conclusión grande de poca evidencia.\n- Usa el arquetipo secundario de verdad: casi nadie es 100% uno solo. Si ves una base clásica con detalles románticos, repórtalo así en vez de forzar una sola etiqueta.\n- No confundas "arreglada" con "clásica" ni "cómoda" con "natural". Fíjate en las decisiones concretas de las prendas, no en qué tan producida se ve la foto.\n- Si la imagen no muestra ropa/estilo claro (una foto muy de cerca de la cara, mal iluminada, o donde casi no se ve el outfit), dilo en la explicación y marca confiable=false.\n\nLlama siempre a report_personalidad.`,
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
