import Anthropic from "@anthropic-ai/sdk";
import { buscarEnCatalogos, type ProductoTienda } from "./catalogo-tiendas";
import type { ClosetCategory } from "@/types";

// =====================================================================
// "Buscar combinaciones" desde el clóset
// =====================================================================
// El Manual de estilo (lib/manual-estilo.ts) arma un outfit completo a
// partir del perfil. Esto es más chico y más concreto: la usuaria YA
// tiene una prenda —la subió a su clóset— y lo que quiere es "¿con qué
// la combino?", con fotos de prendas reales que sí existen en las
// tiendas del catálogo.
//
// Por eso pesa menos que el manual: no hay que cruzar cuatro pilares de
// asesoría, solo proponer 2-3 prendas de OTRO tipo que le queden bien a
// esta en color, y buscarlas de verdad. Va con Haiku, no Sonnet — es el
// mismo tamaño de tarea que clasificar una prenda (ver garment-ai.ts).
// =====================================================================

const MODELO = "claude-haiku-4-5";

const NOMBRE_CATEGORIA: Record<ClosetCategory, string> = {
  top: "una parte de arriba (blusa, camiseta, top)",
  bottom: "una parte de abajo (pantalón, falda, short)",
  vestido: "un vestido",
  abrigo: "un abrigo o chaqueta",
  calzado: "un calzado",
  accesorio: "un accesorio",
};

export type PrendaDelCloset = {
  categoria: ClosetCategory;
  color: string | null;
  tags: string[];
};

export type ComboSugerido = {
  tipo: string;
  color: string;
  rasgos: string[];
  porque: string;
};

export type ComboConFotos = ComboSugerido & { fotos: ProductoTienda[] };

const SISTEMA = `Eres una asesora de imagen colombiana. Una clienta ya tiene UNA prenda de su clóset y quiere saber con qué combinarla — no un outfit inventado desde cero, sino qué MÁS comprar para que esa prenda puntual rinda.

REGLAS:

1. Sugiere 2 a 4 prendas de un tipo DISTINTO al de la prenda que ya tiene (si tiene un pantalón, sugiere tops, calzado o abrigo — no otro pantalón).

2. El color de cada sugerencia tiene que combinar de verdad con el color de la prenda que ya tiene: o hace juego en la misma familia de color, o es un neutro que la deja lucir, o es un acento puntual a propósito. Nunca un color que choque sin razón.

3. tipo: SOLO el tipo de prenda, sin color ni estilo, 1-2 palabras (ej. "blusa", "tenis", "chaqueta"). color: un color en español, una o dos palabras. rasgos: 2-4 palabras o frases muy cortas (corte, tela, largo, manga...).

4. Todas las prendas son para una mujer adulta. Nunca sugieras ni describas ropa de hombre.

5. NO MENCIONES MARCAS. Describe la prenda, no dónde comprarla.

6. porque: una frase corta de por qué esa prenda combina con la que ya tiene — concreto, no genérico ("por el color camel de tu pantalón, un top blanco roto lo deja neutro y versátil" en vez de "queda bien con tu prenda").

Llama siempre a report_combinaciones con la lista completa.`;

const REPORT_TOOL: Anthropic.Tool = {
  name: "report_combinaciones",
  description: "Reporta las prendas sugeridas para combinar con la que la clienta ya tiene.",
  input_schema: {
    type: "object",
    properties: {
      combinaciones: {
        type: "array",
        description: "2 a 4 prendas de tipo distinto a la que ya tiene, que combinen en color.",
        items: {
          type: "object",
          properties: {
            tipo: { type: "string", description: "Solo el tipo de prenda, 1-2 palabras." },
            color: { type: "string", description: "Un color, en español." },
            rasgos: {
              type: "array",
              items: { type: "string" },
              description: "2 a 4 rasgos cortos (corte, tela, largo, manga...).",
            },
            porque: { type: "string", description: "1 frase concreta de por qué combina." },
          },
          required: ["tipo", "color", "rasgos", "porque"],
        },
      },
    },
    required: ["combinaciones"],
  },
};

function limpiarCombo(c: any): ComboSugerido | null {
  const tipo = typeof c?.tipo === "string" ? c.tipo.trim() : "";
  const color = typeof c?.color === "string" ? c.color.trim() : "";
  if (!tipo) return null;
  const rasgos = Array.isArray(c?.rasgos)
    ? c.rasgos.filter((r: unknown): r is string => typeof r === "string" && r.trim().length > 0).map((r: string) => r.trim())
    : [];
  const porque = typeof c?.porque === "string" ? c.porque.trim() : "";
  return { tipo, color, rasgos, porque };
}

async function sugerirCombinaciones(p: PrendaDelCloset): Promise<ComboSugerido[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");

  const descripcion = [
    NOMBRE_CATEGORIA[p.categoria],
    p.color ? `color ${p.color}` : null,
    p.tags.length > 0 ? p.tags.join(", ") : null,
  ]
    .filter(Boolean)
    .join(", ");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODELO,
    max_tokens: 1200,
    system: SISTEMA,
    tools: [REPORT_TOOL],
    tool_choice: { type: "tool", name: "report_combinaciones" },
    messages: [
      { role: "user", content: `La prenda que ya tiene: ${descripcion}.` },
    ],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  if (!toolUse || toolUse.name !== "report_combinaciones") {
    throw new Error("Claude no devolvió un report_combinaciones válido");
  }

  const input = toolUse.input as { combinaciones?: unknown[] };
  return (Array.isArray(input.combinaciones) ? input.combinaciones : [])
    .map(limpiarCombo)
    .filter((c): c is ComboSugerido => c !== null);
}

/**
 * Sugiere combinaciones y las busca en el catálogo real, igual que el
 * manual: lo que no se encuentra en ninguna tienda no se muestra — de
 * nada sirve sugerir algo que la usuaria no puede ir a comprar.
 */
export async function combinacionesConFotos(p: PrendaDelCloset): Promise<ComboConFotos[]> {
  const sugeridas = await sugerirCombinaciones(p);

  const conFotos = await Promise.all(
    sugeridas.map(async (c) => {
      try {
        const fotos = await buscarEnCatalogos({ tipo: c.tipo, color: c.color || null, rasgos: c.rasgos }, 4);
        return { ...c, fotos };
      } catch (e) {
        console.warn("[combinaciones] no se pudo buscar en catálogo:", c.tipo, e);
        return { ...c, fotos: [] };
      }
    })
  );

  return conFotos.filter((c) => c.fotos.length > 0);
}
