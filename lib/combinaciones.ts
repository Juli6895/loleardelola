import Anthropic from "@anthropic-ai/sdk";
import {
  buscarEnCatalogos,
  COLORES_BUSCABLES,
  TIPOS_BUSCABLES,
  type ProductoTienda,
} from "./catalogo-tiendas";
import { expediente, type DatosManual } from "./manual-estilo";
import { PROYECCIONES } from "./image-consulting/proyeccion";
import { PERSONALIDADES } from "./image-consulting/personalidad";
import type { ClosetCategory } from "@/types";

// =====================================================================
// "Buscar combinaciones" desde el clóset
// =====================================================================
// La usuaria YA tiene una prenda —la subió a su clóset— y quiere saber
// cómo llevarla. La respuesta es UN outfit completo con esa prenda de
// protagonista, armado para lo que ella dijo en su perfil que quiere
// proyectar y con su personalidad de estilo: la misma camiseta morada
// se combina distinto para proyectar autoridad que para proyectar
// cercanía.
//
// Las prendas que le faltan se buscan en el catálogo real de las
// tiendas, igual que en el manual: lo que no existe no se muestra.
//
// Va con Sonnet, como el manual: ya no es "qué color combina", es
// cruzar la prenda con los pilares de su perfil, y ahí Haiku se queda
// corto.
// =====================================================================

const MODELO = "claude-sonnet-5";

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
  // El nombre que le puso la IA al subirla ("Pantalón lunares blanco
  // negro"). Dice más que el color solo: una prenda estampada pide
  // combinaciones lisas.
  label: string | null;
};

export type ComboSugerido = {
  tipo: string;
  color: string;
  rasgos: string[];
  porque: string;
};

export type ComboConFotos = ComboSugerido & { fotos: ProductoTienda[] };

export type OutfitDelCloset = {
  titulo: string;
  // Cómo se ve puesto y por qué transmite lo que ella quiere.
  descripcion: string;
  // Lo que se va a proyectar, en palabras para la pantalla ("Creatividad").
  proyeccion: string | null;
  personalidad: string | null;
  prendas: ComboConFotos[];
  // Lo que se sugirió pero hoy no está en ninguna tienda ("tenis
  // blanco"). Se dice en pantalla en vez de esconderlo: si ya tiene
  // algo así en su clóset, lo puede usar.
  sinEncontrar: string[];
};

const SISTEMA = `Eres una asesora de imagen colombiana. Una clienta ya tiene UNA prenda de su clóset y quiere saber cómo llevarla. Tu trabajo es armarle UN outfit completo en el que ESA prenda es la protagonista, y decirle qué más necesita para completarlo.

Te entregan su perfil ya resuelto (lo que quiere proyectar, su personalidad de estilo, su silueta, su color y su edad) con sus reglas. El outfit tiene que servir para ESO que ella quiere proyectar — no un outfit genérico que "combine". La misma prenda se lleva distinto para proyectar autoridad que para proyectar cercanía.

REGLAS:

1. Lo que quiere proyectar MANDA. Usa los recursos que lo construyen y evita lo que lo desarma, según su perfil. Su personalidad de estilo decide el tono (qué tan estructurado, qué telas, qué accesorios). Su silueta decide los cortes. Su edad ajusta el detalle, no la calidad.

2. Sugiere 3 a 5 prendas que completen el outfit, cada una de un tipo distinto entre sí y distinto al de la prenda que ya tiene (si tiene una camiseta, no sugieras otra parte de arriba salvo una capa encima, como blazer, chaqueta o cárdigan). Un outfit completo tiene al menos la otra mitad (arriba o abajo, si no es vestido), calzado y un accesorio o una capa.

3. Color: el outfit es coherente con la prenda que ya tiene. Decide una paleta de 2-3 colores que incluya el de su prenda, que le quede bien a su piel y cabello, y repártela. Si su prenda es estampada o de varios colores, lo demás va LISO, en uno de los colores del estampado o en un neutro.

4. tipo y color de cada prenda: SOLO de las listas permitidas del esquema — son los nombres con que las tiendas titulan sus prendas, y con otros nombres no se encuentran. Si el matiz exacto no está (ej. "blanco roto"), usa el más cercano ("marfil"). El denim es una tela, no un color. rasgos: 2-4 palabras o frases muy cortas (corte, tela, largo, manga...).

5. titulo: corto, nombra su prenda y la intención (ej. "Tu camiseta morada, con autoridad").

6. descripcion: 2-3 frases, de tú, cercana y directa: cómo se ve el outfit puesto y POR QUÉ transmite lo que ella quiere proyectar. Nombra lo que quiere proyectar con sus palabras. Habla del efecto del conjunto y de SU prenda; no enumeres las otras prendas una por una (cada una trae su propio "porque", y alguna puede no estar hoy en las tiendas).

7. porque (de cada prenda): una frase concreta de qué aporta ESA prenda al outfit y a lo que quiere proyectar ("el blazer negro estructura el hombro: es lo que más rápido lee el ojo como autoridad"), no "combina con tu prenda".

8. Si en el perfil falta lo que quiere proyectar o su personalidad, arma el outfit con lo que haya y no lo menciones.

9. Todas las prendas son para una mujer adulta. Nunca ropa de hombre. NO menciones marcas.

10. NUNCA hables de disimular, esconder ni corregir el cuerpo.

Llama siempre a report_outfit.`;

const REPORT_TOOL: Anthropic.Tool = {
  name: "report_outfit",
  description: "Reporta el outfit armado alrededor de la prenda que la clienta ya tiene.",
  // Sin esto, a veces la lista de prendas llegaba rota — como texto en
  // vez de lista — y el outfit salía sin ninguna prenda. Con strict la
  // API garantiza que la respuesta respeta el esquema.
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      titulo: { type: "string", description: "Corto: su prenda y la intención." },
      descripcion: {
        type: "string",
        description: "2-3 frases: cómo se ve puesto y por qué transmite lo que quiere proyectar.",
      },
      prendas: {
        type: "array",
        description: "3 a 5 prendas que completan el outfit, de tipos distintos entre sí y distintos a la que ya tiene.",
        items: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: TIPOS_BUSCABLES, description: "El tipo de prenda." },
            color: { type: "string", enum: COLORES_BUSCABLES, description: "El color de la prenda." },
            rasgos: {
              type: "array",
              items: { type: "string" },
              description: "2 a 4 rasgos cortos (corte, tela, largo, manga...).",
            },
            porque: {
              type: "string",
              description: "1 frase: qué aporta esta prenda al outfit y a lo que quiere proyectar.",
            },
          },
          required: ["tipo", "color", "rasgos", "porque"],
          additionalProperties: false,
        },
      },
    },
    required: ["titulo", "descripcion", "prendas"],
    additionalProperties: false,
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

async function armarOutfit(
  p: PrendaDelCloset,
  perfil: DatosManual
): Promise<{ titulo: string; descripcion: string; prendas: ComboSugerido[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");

  const prenda = [
    p.label ? `"${p.label}"` : null,
    NOMBRE_CATEGORIA[p.categoria],
    p.color ? `color ${p.color}` : null,
    p.tags.length > 0 ? p.tags.join(", ") : null,
  ]
    .filter(Boolean)
    .join(", ");

  const datosDePerfil = expediente(perfil) || "No llenó su perfil todavía.";

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODELO,
    max_tokens: 1500,
    system: [{ type: "text", text: SISTEMA, cache_control: { type: "ephemeral" } }],
    tools: [REPORT_TOOL],
    tool_choice: { type: "tool", name: "report_outfit" },
    messages: [
      {
        role: "user",
        content: `LA PRENDA QUE YA TIENE (la protagonista): ${prenda}.\n\nSU PERFIL:\n\n${datosDePerfil}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  if (!toolUse || toolUse.name !== "report_outfit") {
    throw new Error("Claude no devolvió un report_outfit válido");
  }

  const input = toolUse.input as { titulo?: string; descripcion?: string; prendas?: unknown[] };
  return {
    titulo: typeof input.titulo === "string" ? input.titulo.trim() : "",
    descripcion: typeof input.descripcion === "string" ? input.descripcion.trim() : "",
    prendas: (Array.isArray(input.prendas) ? input.prendas : [])
      .map(limpiarCombo)
      .filter((c): c is ComboSugerido => c !== null),
  };
}

/**
 * Arma el outfit y busca cada prenda que falta en el catálogo real,
 * igual que el manual: lo que no se encuentra en ninguna tienda no se
 * muestra — de nada sirve sugerir algo que no se puede ir a comprar.
 */
export async function outfitConFotos(
  p: PrendaDelCloset,
  perfil: DatosManual
): Promise<OutfitDelCloset> {
  const outfit = await armarOutfit(p, perfil);

  const conFotos = await Promise.all(
    outfit.prendas.map(async (c) => {
      try {
        const fotos = await buscarEnCatalogos({ tipo: c.tipo, color: c.color || null, rasgos: c.rasgos }, 4);
        return { ...c, fotos };
      } catch (e) {
        console.warn("[combinaciones] no se pudo buscar en catálogo:", c.tipo, e);
        return { ...c, fotos: [] };
      }
    })
  );

  return {
    titulo: outfit.titulo,
    descripcion: outfit.descripcion,
    proyeccion: perfil.proyeccion ? PROYECCIONES[perfil.proyeccion].label : null,
    personalidad: perfil.personalidad ? PERSONALIDADES[perfil.personalidad].label : null,
    prendas: conFotos.filter((c) => c.fotos.length > 0),
    sinEncontrar: conFotos.filter((c) => c.fotos.length === 0).map((c) => `${c.tipo} ${c.color}`.trim()),
  };
}
