import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { SILUETAS, type Silueta } from "./image-consulting/morfologia";
import { PERSONALIDADES, type Personalidad } from "./image-consulting/personalidad";
import { CONTRASTES, TONOS_PIEL, type Contraste, type TonoPiel } from "./image-consulting/colorimetria";
import { PROYECCIONES, type Proyeccion } from "./image-consulting/proyeccion";

// =====================================================================
// Manual de estilo personal (lo que da la membresía)
// =====================================================================
// La app ya tenía los cuatro pilares por separado: la silueta en una
// tarjeta, el contraste en otra, la personalidad en otra. El manual es
// lo que ninguna de esas tarjetas puede hacer sola: CRUZARLOS.
//
// Y cruzarlos importa porque se contradicen. A una silueta pera le
// favorece sumar volumen arriba; si además quiere proyectar autoridad,
// un volado no sirve —un hombro estructurado consigue lo mismo y sí
// dice lo que ella quiere decir. Esa reconciliación es el trabajo de
// una asesora, y es lo que se le pide a Claude.
//
// Lo que NO se le pide: inventar el contenido. Las reglas de cada pilar
// salen de lib/image-consulting/, que es material curado. Claude recibe
// esas reglas ya resueltas y su trabajo es tejerlas para UNA persona,
// no improvisar asesoría de imagen.
//
// DESDE ESTA VERSIÓN el manual ya no es solo texto: las prendas de las
// secciones "Tres outfits para ti" y "Lo primero que compraría" salen
// también como datos con tipo/color/rasgos, para poder buscarlas en el
// catálogo de las tiendas reales (lib/catalogo-tiendas.ts) y mostrar
// FOTOS de verdad — el mismo sistema que ya usan los resultados de
// búsqueda. Por eso el llamado a Claude pasa de texto libre a "tool
// use": se necesita esa parte estructurada, no solo prosa.
// =====================================================================

const MODELO = "claude-sonnet-5";

export type DatosManual = {
  nombre: string | null;
  silueta: Silueta | null;
  medidas: { busto: number | null; cintura: number | null; cadera: number | null; estatura: number | null };
  tonoPiel: TonoPiel | null;
  colorCabello: string | null;
  largoCabello: string | null;
  contraste: Contraste | null;
  personalidad: Personalidad | null;
  personalidadSecundaria: Personalidad | null;
  proyeccion: Proyeccion | null;
};

/** Una prenda tal como la necesita la búsqueda en catálogos. */
export type PrendaManual = {
  tipo: string;
  color: string;
  rasgos: string[];
};

export type OutfitManual = {
  titulo: string;
  descripcion: string;
  prendas: PrendaManual[];
};

export type PrendaClave = PrendaManual & { porque: string };

export type ManualGenerado = {
  // Markdown con las primeras cinco secciones (## títulos). Las dos
  // últimas ("Tres outfits" y "Lo primero que compraría") NO van acá:
  // se renderizan aparte, a partir de outfits/prendasClave, para poder
  // ponerles fotos.
  texto: string;
  outfits: OutfitManual[];
  prendasClave: PrendaClave[];
};

/**
 * Huella de los datos que alimentan el manual. Si no cambian, no hay
 * por qué volver a generarlo: cada generación cuesta plata y tarda.
 */
export function huella(d: DatosManual): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify([
        d.silueta, d.tonoPiel, d.colorCabello, d.largoCabello, d.contraste,
        d.personalidad, d.personalidadSecundaria, d.proyeccion,
        d.medidas.busto, d.medidas.cintura, d.medidas.cadera, d.medidas.estatura,
      ])
    )
    .digest("hex")
    .slice(0, 32);
}

/** Qué falta para poder armar el manual. Vacío = está completo. */
export function loQueFalta(d: DatosManual): string[] {
  const falta: string[] = [];
  if (!d.silueta) falta.push("tus medidas de busto, cintura y cadera");
  if (!d.contraste) falta.push("tu tono de piel y color de cabello");
  if (!d.personalidad) falta.push("tu personalidad de estilo");
  if (!d.proyeccion) falta.push("qué quieres proyectar");
  return falta;
}

/** El material curado que le corresponde a ESTA usuaria, ya resuelto. */
function expediente(d: DatosManual): string {
  const partes: string[] = [];

  if (d.silueta) {
    const s = SILUETAS[d.silueta];
    partes.push(
      [
        `## SU SILUETA: ${s.label}`,
        s.descripcion,
        `Objetivo visual: ${s.objetivoVisual}`,
        `Le favorecen: ${s.prendasFavorecen.join("; ")}`,
        `Le restan: ${s.prendasEvitar.join("; ")}`,
      ].join("\n")
    );
  }

  if (d.contraste) {
    const c = CONTRASTES[d.contraste];
    partes.push(
      [
        `## SU COLOR: ${c.label}`,
        `Piel ${d.tonoPiel ? TONOS_PIEL[d.tonoPiel].label.toLowerCase() : "sin dato"}, cabello ${d.colorCabello ?? "sin dato"}${d.largoCabello ? ` (${d.largoCabello})` : ""}.`,
        c.descripcion,
        `Cómo combinar: ${c.comoVestir.join("; ")}`,
        `Qué evitar: ${c.evitar.join("; ")}`,
      ].join("\n")
    );
  }

  if (d.personalidad) {
    const p = PERSONALIDADES[d.personalidad];
    partes.push(
      [
        `## SU PERSONALIDAD DE ESTILO: ${p.label}${
          d.personalidadSecundaria
            ? ` con toques de ${PERSONALIDADES[d.personalidadSecundaria].label}`
            : ""
        }`,
        p.descripcion,
        `Prendas suyas: ${p.prendasClave.join("; ")}`,
        `Telas: ${p.telasFavoritas.join("; ")}`,
        `Accesorios: ${p.accesorios}`,
        `Cuando choca con la figura: ${p.notaDeCombinacion}`,
      ].join("\n")
    );
  }

  if (d.proyeccion) {
    const pr = PROYECCIONES[d.proyeccion];
    partes.push(
      [
        `## QUÉ QUIERE PROYECTAR: ${pr.label}`,
        `En sus palabras: "${pr.enSusPalabras}"`,
        `Lo construye: ${pr.recursos.join("; ")}`,
        `Lo desarma: ${pr.loQueLoRompe.join("; ")}`,
      ].join("\n")
    );
  }

  const m = d.medidas;
  if (m.busto && m.cintura && m.cadera) {
    partes.push(
      `## SUS MEDIDAS\nBusto ${m.busto} cm, cintura ${m.cintura} cm, cadera ${m.cadera} cm${m.estatura ? `, estatura ${m.estatura} cm` : ""}.`
    );
  }

  return partes.join("\n\n");
}

const SISTEMA = `Eres una asesora de imagen colombiana escribiendo el manual de estilo personal de UNA clienta. Te entregan su expediente ya resuelto: su silueta, su contraste de color, su personalidad de estilo y lo que quiere proyectar, cada uno con sus reglas.

Tu trabajo NO es repetir ese expediente: es CRUZARLO. Lo que ella no puede hacer sola es saber qué pasa cuando sus cuatro pilares se contradicen, y ahí es donde este manual vale.

REGLAS:

1. Escribe en español colombiano, de tú, cercana y directa. Como una amiga que sabe del tema, no como un folleto.

2. NO inventes reglas de asesoría que no estén en el expediente. Puedes combinarlas, priorizarlas y traducirlas a ejemplos concretos, pero no agregar criterios nuevos.

3. CUANDO DOS PILARES SE CONTRADIGAN, DILO Y RESUÉLVELO. Es la parte más valiosa. Ejemplo: si su figura pide volumen arriba pero quiere proyectar autoridad, explica que el volumen va en forma de hombro estructurado y no de volados. Lo que quiere proyectar manda sobre el gusto; la figura manda sobre el corte.

4. Sé concreta hasta el detalle. "Escote en V" sirve; "prendas favorecedoras" no. Nombra prendas, largos, telas y colores.

5. NUNCA hables de bajar de peso, de "disimular", "esconder" ni "corregir" el cuerpo. El cuerpo no es un problema a resolver. Se habla de proporción y de equilibrio visual, nunca de defectos.

6. Si en el expediente falta un pilar, trabaja con lo que hay y dilo en una línea, sin dramatizar.

7. NO MARCAS: nunca menciones marcas registradas. Las prendas se buscan después en tiendas reales — tu trabajo es describir la prenda, no decir dónde comprarla.

EL CAMPO "texto" — markdown con estos títulos exactos, en este orden:

## Tu punto de partida
Dos o tres frases que la retraten: su silueta, su color y lo que quiere proyectar, juntos en una sola idea. Que se reconozca al leerlo.

## Cómo te viste tu figura
Qué cortes y largos le funcionan y por qué, en su cuerpo. Concreto.

## Tus colores
Cómo combinar según su contraste. Qué ponerse cerca de la cara.

## Tu sello
Cómo se ve su personalidad de estilo puesta en ropa real.

## Cuando chocan
La sección más importante. Dos o tres contradicciones REALES entre sus pilares, cada una resuelta. Si no hay contradicciones de fondo, dilo y explica por qué su combinación es coherente.

NO incluyas en "texto" los outfits ni las prendas para comprar — esos van en los campos "outfits" y "prendasClave", aparte, porque después se buscan en tiendas reales y necesitan quedar en piezas sueltas, no en un párrafo.

Máximo 650 palabras en "texto". Prefiere frases cortas. Nada de listas de viñetas sueltas sin explicación.

EL CAMPO "outfits" — tres conjuntos, para tres momentos distintos de su vida (ej. trabajo, plan casual, una salida de noche). Cada prenda de cada outfit necesita tipo/color/rasgos EXACTOS, en el mismo vocabulario con el que se buscaría en Google o en una tienda:
- tipo: SOLO el tipo de prenda, sin color ni estilo (ej. "vestido", "blazer", "jean", "top"). Una palabra o dos, nunca una frase.
- color: UN color, en español, una palabra (ej. "verde oliva" como máximo dos).
- rasgos: 2 a 4 palabras o frases MUY cortas que describan la prenda (ej. ["midi", "manga larga", "lino"], o ["wide leg", "tiro alto"]). Nada de oraciones acá.

EL CAMPO "prendasClave" — las cinco prendas con las que empezaría, en el mismo formato de tipo/color/rasgos, más "porque": una frase de por qué esa prenda en particular, para ella.

Llama siempre a report_manual con los tres campos completos.`;

const REPORT_TOOL: Anthropic.Tool = {
  name: "report_manual",
  description: "Reporta el manual de estilo: el texto y las prendas recomendadas en piezas sueltas para poder buscarlas después.",
  input_schema: {
    type: "object",
    properties: {
      texto: {
        type: "string",
        description: "Markdown con las 5 secciones (## títulos), sin outfits ni prendas para comprar.",
      },
      outfits: {
        type: "array",
        description: "Exactamente 3 outfits completos, para 3 momentos distintos.",
        items: {
          type: "object",
          properties: {
            titulo: { type: "string", description: "Para qué momento, corto (ej. 'Para el trabajo')." },
            descripcion: { type: "string", description: "1-3 frases: cómo se ve puesto y por qué le funciona." },
            prendas: {
              type: "array",
              description: "3 a 5 prendas del outfit.",
              items: {
                type: "object",
                properties: {
                  tipo: { type: "string", description: "Solo el tipo de prenda, 1-2 palabras." },
                  color: { type: "string", description: "Un color, en español." },
                  rasgos: {
                    type: "array",
                    items: { type: "string" },
                    description: "2 a 4 rasgos cortos (largo, corte, tela, manga...).",
                  },
                },
                required: ["tipo", "color", "rasgos"],
              },
            },
          },
          required: ["titulo", "descripcion", "prendas"],
        },
      },
      prendasClave: {
        type: "array",
        description: "Exactamente 5 prendas, en orden de prioridad de compra.",
        items: {
          type: "object",
          properties: {
            tipo: { type: "string", description: "Solo el tipo de prenda, 1-2 palabras." },
            color: { type: "string", description: "Un color, en español." },
            rasgos: {
              type: "array",
              items: { type: "string" },
              description: "2 a 4 rasgos cortos.",
            },
            porque: { type: "string", description: "1 frase: por qué esta prenda, para ella." },
          },
          required: ["tipo", "color", "rasgos", "porque"],
        },
      },
    },
    required: ["texto", "outfits", "prendasClave"],
  },
};

function limpiarPrenda(p: any): PrendaManual | null {
  const tipo = typeof p?.tipo === "string" ? p.tipo.trim() : "";
  const color = typeof p?.color === "string" ? p.color.trim() : "";
  if (!tipo) return null;
  const rasgos = Array.isArray(p?.rasgos)
    ? p.rasgos.filter((r: unknown): r is string => typeof r === "string" && r.trim().length > 0).map((r: string) => r.trim())
    : [];
  return { tipo, color, rasgos };
}

export async function generarManual(d: DatosManual): Promise<ManualGenerado> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODELO,
    max_tokens: 4000,
    system: [{ type: "text", text: SISTEMA, cache_control: { type: "ephemeral" } }],
    tools: [REPORT_TOOL],
    tool_choice: { type: "tool", name: "report_manual" },
    messages: [
      {
        role: "user",
        content: `Escribe el manual de estilo de ${d.nombre ?? "esta clienta"}.\n\n${expediente(d)}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  if (!toolUse || toolUse.name !== "report_manual") {
    throw new Error("Claude no devolvió un report_manual válido");
  }

  const input = toolUse.input as {
    texto?: string;
    outfits?: Array<{ titulo?: string; descripcion?: string; prendas?: unknown[] }>;
    prendasClave?: Array<{ tipo?: string; color?: string; rasgos?: unknown[]; porque?: string }>;
  };

  const texto = typeof input.texto === "string" ? input.texto.trim() : "";
  if (!texto) throw new Error("El manual salió sin texto");

  const outfits: OutfitManual[] = (Array.isArray(input.outfits) ? input.outfits : [])
    .map((o) => {
      const titulo = typeof o.titulo === "string" ? o.titulo.trim() : "";
      const descripcion = typeof o.descripcion === "string" ? o.descripcion.trim() : "";
      const prendas = (Array.isArray(o.prendas) ? o.prendas : [])
        .map(limpiarPrenda)
        .filter((p): p is PrendaManual => p !== null);
      if (!titulo || prendas.length === 0) return null;
      return { titulo, descripcion, prendas };
    })
    .filter((o): o is OutfitManual => o !== null);

  const prendasClave: PrendaClave[] = (Array.isArray(input.prendasClave) ? input.prendasClave : [])
    .map((p) => {
      const base = limpiarPrenda(p);
      if (!base) return null;
      const porque = typeof p.porque === "string" ? p.porque.trim() : "";
      return { ...base, porque };
    })
    .filter((p): p is PrendaClave => p !== null);

  return { texto, outfits, prendasClave };
}
