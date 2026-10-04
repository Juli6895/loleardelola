import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { SILUETAS, type Silueta } from "./image-consulting/morfologia";
import { PERSONALIDADES, type Personalidad } from "./image-consulting/personalidad";
import { CONTRASTES, TONOS_PIEL, type Contraste, type TonoPiel } from "./image-consulting/colorimetria";
import { PROYECCIONES, type Proyeccion } from "./image-consulting/proyeccion";
import {
  buscarEnCatalogos,
  COLORES_BUSCABLES,
  TIPOS_BUSCABLES,
  type ProductoTienda,
} from "./catalogo-tiendas";
import type { RangoEdad } from "@/types";

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
  edad: RangoEdad | null;
};

const RANGOS_EDAD_LABEL: Record<RangoEdad, string> = {
  "18-24": "18 a 24 años",
  "25-34": "25 a 34 años",
  "35-44": "35 a 44 años",
  "45-54": "45 a 54 años",
  "55-64": "55 a 64 años",
  "65+": "65 años o más",
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

// Un color de su paleta: solo se pinta, no se busca en tiendas, así que
// puede ser un matiz fino ("verde botella") con su hex.
export type ColorPintado = { nombre: string; hex: string };

// Una prenda de su clóset, tal como se le entrega a Claude.
export type PrendaDelClosetManual = { id: string; label: string; foto: string };

// "Prendas favoritas (cómo combinar)": una prenda que YA tiene.
export type FavoritaManual = {
  id: string;
  label: string;
  foto: string;
  comoCombinar: string;
  conQue: string[];
};

export type ManualGenerado = {
  // Markdown con las cinco secciones de texto (## títulos). Lo demás
  // va en campos aparte para poder pintarlo (paleta) o ponerle fotos de
  // tienda (estilo, outfits, básicos).
  texto: string;
  paleta: ColorPintado[];
  evitar: ColorPintado[];
  estilo: PrendaManual[];
  outfits: OutfitManual[];
  favoritas: FavoritaManual[];
  basicos: PrendaClave[];
};

// Sube cuando cambia la forma del manual: la huella cambia con ella, y
// los manuales guardados con la forma anterior quedan para actualizar.
export const VERSION_MANUAL = 2;

/**
 * Huella de los datos que alimentan el manual. Si no cambian, no hay
 * por qué volver a generarlo: cada generación cuesta plata y tarda.
 */
export function huella(d: DatosManual): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify([
        VERSION_MANUAL,
        d.silueta, d.tonoPiel, d.colorCabello, d.largoCabello, d.contraste,
        d.personalidad, d.personalidadSecundaria, d.proyeccion, d.edad,
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
  if (!d.edad) falta.push("tu rango de edad");
  return falta;
}

// Las columnas de users que alimentan el perfil de asesoría, y cómo se
// convierten en DatosManual. Viven acá porque las usan el manual Y
// "Buscar combinaciones" del clóset — que no se desincronicen.
export const COLUMNAS_PERFIL =
  "name, silueta, bust_cm, waist_cm, hip_cm, height_cm, tono_piel, color_cabello, largo_cabello, contraste, personalidad, personalidad_secundaria, proyeccion, rango_edad";

export function datosDesdeFila(fila: any): DatosManual {
  return {
    nombre: fila.name ?? null,
    silueta: fila.silueta ?? null,
    medidas: {
      busto: fila.bust_cm ?? null,
      cintura: fila.waist_cm ?? null,
      cadera: fila.hip_cm ?? null,
      estatura: fila.height_cm ?? null,
    },
    tonoPiel: fila.tono_piel ?? null,
    colorCabello: fila.color_cabello ?? null,
    largoCabello: fila.largo_cabello ?? null,
    contraste: fila.contraste ?? null,
    personalidad: fila.personalidad ?? null,
    personalidadSecundaria: fila.personalidad_secundaria ?? null,
    proyeccion: fila.proyeccion ?? null,
    edad: fila.rango_edad ?? null,
  };
}

/** El material curado que le corresponde a ESTA usuaria, ya resuelto. */
export function expediente(d: DatosManual): string {
  const partes: string[] = [];

  if (d.edad) {
    partes.push(`## SU EDAD: ${RANGOS_EDAD_LABEL[d.edad]}`);
  }

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

const SISTEMA = `Eres una asesora de imagen colombiana escribiendo el manual de estilo personal de UNA clienta. Te entregan su expediente ya resuelto: su silueta, su contraste de color, su personalidad de estilo y lo que quiere proyectar, cada uno con sus reglas. Si tiene prendas en su clóset, también te las entregan.

El manual sigue el orden de una asesoría de imagen presencial: 1) morfología, colorimetría y estilo; 2) outfits para momentos específicos; 3) sus prendas favoritas y cómo combinarlas; 4) los básicos de su fondo de armario.

Tu trabajo NO es repetir ese expediente: es CRUZARLO. Lo que ella no puede hacer sola es saber qué pasa cuando sus cuatro pilares se contradicen, y ahí es donde este manual vale.

REGLAS:

1. Escribe en español colombiano, de tú, cercana y directa. Como una amiga que sabe del tema, no como un folleto.

2. NO inventes reglas de asesoría que no estén en el expediente. Puedes combinarlas, priorizarlas y traducirlas a ejemplos concretos, pero no agregar criterios nuevos.

3. CUANDO DOS PILARES SE CONTRADIGAN, DILO Y RESUÉLVELO. Es la parte más valiosa. Ejemplo: si su figura pide volumen arriba pero quiere proyectar autoridad, explica que el volumen va en forma de hombro estructurado y no de volados. Lo que quiere proyectar manda sobre el gusto; la figura manda sobre el corte.

4. Sé concreta hasta el detalle. "Escote en V" sirve; "prendas favorecedoras" no. Nombra prendas, largos, telas y colores.

5. NUNCA hables de bajar de peso, de "disimular", "esconder" ni "corregir" el cuerpo. El cuerpo no es un problema a resolver. Se habla de proporción y de equilibrio visual, nunca de defectos.

6. Si en el expediente falta un pilar, trabaja con lo que hay y dilo en una línea, sin dramatizar.

7. NO MARCAS: nunca menciones marcas registradas. Las prendas se buscan después en tiendas reales — tu trabajo es describir la prenda, no decir dónde comprarla.

8. TODAS las prendas son para ella, una mujer adulta. No sugieras ni describas ninguna prenda de ropa de hombre.

9. EL COLOR DE CADA PRENDA TIENE QUE QUEDARLE BIEN A SU PIEL Y SU CABELLO PUNTUALES, no solo "un tono cualquiera de su nivel de contraste". Piensa como una colorista real: qué colores iluminan la combinación exacta de su tono de piel y el color de su cabello, y cuáles se la apagan.

10. CADA OUTFIT TIENE QUE SER COHERENTE EN COLOR: decide una paleta de 2-3 colores que se vean bien juntos (para su piel/cabello) y repártela entre las prendas — un color base, uno de apoyo, y como mucho un acento.

11. TEN EN CUENTA SU EDAD para que cada prenda se sienta acorde a su momento de vida. No se trata de "vestir mayor" o "vestir joven": ajusta el detalle (proporción, estampado, tela), no la calidad de la asesoría.

12. PRENDAS QUE SE BUSCAN EN TIENDAS (estilo, outfits, básicos): tipo y color SOLO de las listas permitidas del esquema — son los nombres con que las tiendas titulan sus prendas; con otros nombres no se encuentran. Si el matiz no está (ej. "blanco roto"), usa el más cercano ("marfil"). El denim es una tela, no un color: un jean va con color "azul". rasgos: 2 a 4 palabras o frases MUY cortas (ej. ["midi", "manga larga", "lino"]). Pide siempre más candidatas de las que se van a mostrar: algunas no van a existir en las tiendas.

EL CAMPO "texto" — markdown con estos títulos exactos, en este orden:

## Tu punto de partida
Dos o tres frases que la retraten: su silueta, su color y lo que quiere proyectar, juntos en una sola idea. Que se reconozca al leerlo.

## Cómo te viste tu figura
Qué cortes y largos le funcionan y por qué, en su cuerpo. Concreto.

## Tus colores
Cómo combinar según su contraste, qué ponerse cerca de la cara y cómo usar su paleta.

## Tu sello
Cómo se ve su personalidad de estilo puesta en ropa real.

## Cuando chocan
La sección más importante. Dos o tres contradicciones REALES entre sus pilares, cada una resuelta. Si no hay contradicciones de fondo, dilo y explica por qué su combinación es coherente.

Máximo 650 palabras en "texto". Prefiere frases cortas. Nada de listas de viñetas sueltas sin explicación. NO incluyas en "texto" los outfits, las prendas favoritas ni los básicos: van en sus propios campos.

EL CAMPO "paleta" — 16 colores que la iluminan, como la paleta de una colorimetría profesional: nombre en español (ej. "verde botella", "camel", "rosa empolvado") y su código hex aproximado. Ordénalos de neutros a acentos. Pueden ser matices finos: esta paleta solo se pinta, no se busca en tiendas.

EL CAMPO "evitar" — 4 a 6 colores que le apagan la cara, con nombre y hex. Son para tener lejos del rostro, no prohibidos.

EL CAMPO "estilo" — 6 prendas candidatas que retraten su personalidad de estilo a primera vista, de tipos distintos entre sí, en colores de su paleta. Se van a mostrar 4 fotos de tienda, como el tablero de inspiración de su estilo.

EL CAMPO "outfits" — los outfits para momentos específicos: EXACTAMENTE estos tres, en este orden y con este título literal:
1. "Trabajo casual"
2. "Fin de semana casual"
3. "Salida de noche"
Cada outfit con 4 a 6 prendas coherentes en color entre sí (regla 10).

EL CAMPO "favoritas" — una entrada por cada prenda de su clóset que te entreguen (con su mismo id), y ninguna más. Si no te entregan prendas, va vacío. Para cada una:
- comoCombinar: 1-2 frases, de tú: cómo sacarle partido según su figura, su color, su sello y lo que quiere proyectar.
- conQue: 3 o 4 prendas cortas con las que combinarla (ej. "jean recto azul", "blazer camel", "tenis blancos").

EL CAMPO "basicos" — su fondo de armario: hasta 10 básicos candidatos (vestido, camisa, chaqueta, blazer, tenis, camiseta, bolso, jean...), pero adaptados a ELLA: el corte que le funciona a su figura y el color de su paleta (el "vestido negro" de otra puede ser un vestido azul oscuro para ella). En ORDEN DE PRIORIDAD, cada uno con "porque": una frase de por qué ese básico, así, para ella.

Llama siempre a report_manual con todos los campos.`;

const PRENDA_BUSCABLE = {
  type: "object",
  properties: {
    tipo: { type: "string", enum: TIPOS_BUSCABLES, description: "El tipo de prenda." },
    color: { type: "string", enum: COLORES_BUSCABLES, description: "El color de la prenda." },
    rasgos: {
      type: "array",
      items: { type: "string" },
      description: "2 a 4 rasgos cortos (largo, corte, tela, manga...).",
    },
  },
  required: ["tipo", "color", "rasgos"],
  additionalProperties: false,
};

const COLOR_PINTADO = {
  type: "object",
  properties: {
    nombre: { type: "string", description: "Nombre del color en español." },
    hex: { type: "string", description: "Código hex aproximado, ej. #6B7A3A." },
  },
  required: ["nombre", "hex"],
  additionalProperties: false,
};

/**
 * La herramienta cambia con su clóset: los ids de sus prendas van como
 * lista cerrada, para que "favoritas" solo pueda hablar de prendas que
 * de verdad tiene.
 */
function herramienta(idsDelCloset: string[]): Anthropic.Tool {
  return {
    name: "report_manual",
    description:
      "Reporta el manual de estilo: el texto, su paleta y las prendas en piezas sueltas para poder buscarlas después.",
    // La respuesta tiene listas dentro de listas (outfits → prendas): sin
    // strict, a veces llegan rotas como texto. Con strict la API garantiza
    // que respetan el esquema.
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        texto: {
          type: "string",
          description: "Markdown con las 5 secciones (## títulos), sin outfits, favoritas ni básicos.",
        },
        paleta: { type: "array", items: COLOR_PINTADO, description: "16 colores que la iluminan, de neutros a acentos." },
        evitar: { type: "array", items: COLOR_PINTADO, description: "4 a 6 colores para tener lejos de la cara." },
        estilo: {
          type: "array",
          items: PRENDA_BUSCABLE,
          description: "6 prendas candidatas que retratan su personalidad de estilo.",
        },
        outfits: {
          type: "array",
          description: "EXACTAMENTE 3 outfits, con estos títulos literales en este orden: 'Trabajo casual', 'Fin de semana casual', 'Salida de noche'.",
          items: {
            type: "object",
            properties: {
              titulo: {
                type: "string",
                enum: ["Trabajo casual", "Fin de semana casual", "Salida de noche"],
                description: "Uno de los tres títulos fijos, sin variarlo.",
              },
              descripcion: { type: "string", description: "1-3 frases: cómo se ve puesto y por qué le funciona." },
              prendas: {
                type: "array",
                description: "4 a 6 prendas del outfit, coherentes en color entre sí.",
                items: PRENDA_BUSCABLE,
              },
            },
            required: ["titulo", "descripcion", "prendas"],
            additionalProperties: false,
          },
        },
        favoritas: {
          type: "array",
          description: "Una por cada prenda de su clóset que se entregó, con su mismo id. Vacío si no se entregaron prendas.",
          items: {
            type: "object",
            properties: {
              id: idsDelCloset.length > 0
                ? { type: "string", enum: idsDelCloset, description: "El id de la prenda de su clóset." }
                : { type: "string", description: "El id de la prenda de su clóset." },
              comoCombinar: { type: "string", description: "1-2 frases: cómo sacarle partido, para ella." },
              conQue: {
                type: "array",
                items: { type: "string" },
                description: "3 o 4 prendas cortas con las que combinarla.",
              },
            },
            required: ["id", "comoCombinar", "conQue"],
            additionalProperties: false,
          },
        },
        basicos: {
          type: "array",
          description: "Hasta 10 básicos de su fondo de armario, adaptados a ella, en orden de prioridad.",
          items: {
            type: "object",
            properties: {
              ...PRENDA_BUSCABLE.properties,
              porque: { type: "string", description: "1 frase: por qué este básico, así, para ella." },
            },
            required: ["tipo", "color", "rasgos", "porque"],
            additionalProperties: false,
          },
        },
      },
      required: ["texto", "paleta", "evitar", "estilo", "outfits", "favoritas", "basicos"],
      additionalProperties: false,
    },
  };
}

function limpiarPrenda(p: any): PrendaManual | null {
  const tipo = typeof p?.tipo === "string" ? p.tipo.trim() : "";
  const color = typeof p?.color === "string" ? p.color.trim() : "";
  if (!tipo) return null;
  const rasgos = Array.isArray(p?.rasgos)
    ? p.rasgos.filter((r: unknown): r is string => typeof r === "string" && r.trim().length > 0).map((r: string) => r.trim())
    : [];
  return { tipo, color, rasgos };
}

function limpiarColores(lista: unknown): ColorPintado[] {
  return (Array.isArray(lista) ? lista : [])
    .map((c: any) => ({
      nombre: typeof c?.nombre === "string" ? c.nombre.trim() : "",
      hex: typeof c?.hex === "string" ? c.hex.trim() : "",
    }))
    .filter((c) => c.nombre && /^#[0-9a-f]{6}$/i.test(c.hex));
}

function textoDe(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function generarManual(
  d: DatosManual,
  closet: PrendaDelClosetManual[] = []
): Promise<ManualGenerado> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");

  const suCloset =
    closet.length > 0
      ? `\n\n## SUS PRENDAS FAVORITAS (de su clóset)\n${closet.map((p) => `- id ${p.id}: ${p.label}`).join("\n")}`
      : "\n\n## SUS PRENDAS FAVORITAS\nTodavía no ha subido prendas a su clóset: deja \"favoritas\" vacío.";

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODELO,
    max_tokens: 7000,
    system: [{ type: "text", text: SISTEMA, cache_control: { type: "ephemeral" } }],
    tools: [herramienta(closet.map((p) => p.id))],
    tool_choice: { type: "tool", name: "report_manual" },
    messages: [
      {
        role: "user",
        content: `Escribe el manual de estilo de ${d.nombre ?? "esta clienta"}.\n\n${expediente(d)}${suCloset}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  if (!toolUse || toolUse.name !== "report_manual") {
    throw new Error("Claude no devolvió un report_manual válido");
  }

  const input = toolUse.input as Record<string, any>;

  const texto = textoDe(input.texto);
  if (!texto) throw new Error("El manual salió sin texto");

  const outfits: OutfitManual[] = (Array.isArray(input.outfits) ? input.outfits : [])
    .map((o: any) => {
      const titulo = textoDe(o?.titulo);
      const prendas = (Array.isArray(o?.prendas) ? o.prendas : [])
        .map(limpiarPrenda)
        .filter((p: PrendaManual | null): p is PrendaManual => p !== null);
      if (!titulo || prendas.length === 0) return null;
      return { titulo, descripcion: textoDe(o?.descripcion), prendas };
    })
    .filter((o: OutfitManual | null): o is OutfitManual => o !== null);

  const estilo = (Array.isArray(input.estilo) ? input.estilo : [])
    .map(limpiarPrenda)
    .filter((p: PrendaManual | null): p is PrendaManual => p !== null);

  const porId = new Map(closet.map((p) => [p.id, p]));
  const favoritas: FavoritaManual[] = (Array.isArray(input.favoritas) ? input.favoritas : [])
    .map((f: any) => {
      const prenda = porId.get(textoDe(f?.id));
      const comoCombinar = textoDe(f?.comoCombinar);
      if (!prenda || !comoCombinar) return null;
      const conQue = (Array.isArray(f?.conQue) ? f.conQue : []).map(textoDe).filter(Boolean).slice(0, 4);
      return { id: prenda.id, label: prenda.label, foto: prenda.foto, comoCombinar, conQue };
    })
    .filter((f: FavoritaManual | null): f is FavoritaManual => f !== null);

  const basicos: PrendaClave[] = (Array.isArray(input.basicos) ? input.basicos : [])
    .map((p: any) => {
      const base = limpiarPrenda(p);
      return base ? { ...base, porque: textoDe(p?.porque) } : null;
    })
    .filter((p: PrendaClave | null): p is PrendaClave => p !== null);

  return {
    texto,
    paleta: limpiarColores(input.paleta).slice(0, 16),
    evitar: limpiarColores(input.evitar).slice(0, 6),
    estilo,
    outfits,
    favoritas,
    basicos,
  };
}

// =====================================================================
// Solo lo que de verdad existe en las tiendas
// =====================================================================
// Claude no sabe qué hay hoy en el inventario real — solo describe una
// prenda plausible. Este paso busca cada prenda en el catálogo real
// (lib/catalogo-tiendas) justo después de generar el manual, ANTES de
// guardarlo, y descarta cualquier prenda sin al menos una coincidencia.
// Lo que sobrevive queda con sus fotos YA adjuntas: la página y el HTML
// descargable no vuelven a preguntarle nada al catálogo.
// =====================================================================

export type PrendaConFotos = PrendaManual & { fotos: ProductoTienda[] };
export type OutfitListo = { titulo: string; descripcion: string; prendas: PrendaConFotos[] };
export type PrendaClaveLista = PrendaClave & { fotos: ProductoTienda[] };

export type ManualListo = {
  // 2 = el formato de la asesoría (morfología, colorimetría, estilo,
  // outfits, favoritas, fondo de armario). Los manuales guardados antes
  // no lo traen: la página los sigue pintando y ofrece actualizarlos.
  version?: number;
  texto: string;
  paleta?: ColorPintado[];
  evitar?: ColorPintado[];
  estilo?: PrendaConFotos[];
  outfits: OutfitListo[];
  favoritas?: FavoritaManual[];
  basicos?: PrendaClaveLista[];
  // Solo en los manuales viejos ("Lo primero que compraría").
  prendasClave?: PrendaClaveLista[];
};

async function fotosPara(p: PrendaManual, maximo: number): Promise<ProductoTienda[]> {
  try {
    return await buscarEnCatalogos({ tipo: p.tipo, color: p.color || null, rasgos: p.rasgos }, maximo);
  } catch (e) {
    console.warn("[manual] no se pudo buscar en catálogo:", p.tipo, e);
    return [];
  }
}

export async function adjuntarFotos(manual: ManualGenerado): Promise<ManualListo> {
  const [outfits, estilo, basicos] = await Promise.all([
    Promise.all(
      manual.outfits.map(async (o) => {
        const conFotos = await Promise.all(o.prendas.map(async (p) => ({ ...p, fotos: await fotosPara(p, 2) })));
        const prendas = conFotos.filter((p) => p.fotos.length > 0);
        // Menos de dos prendas confirmadas ya no se ve como un outfit —
        // mejor no mostrar ese momento que mostrar una prenda suelta.
        return prendas.length >= 2 ? { titulo: o.titulo, descripcion: o.descripcion, prendas } : null;
      })
    ),
    // El tablero de su estilo: 4 fotos, una por prenda.
    Promise.all(manual.estilo.map(async (p) => ({ ...p, fotos: await fotosPara(p, 1) }))),
    Promise.all(manual.basicos.map(async (p) => ({ ...p, fotos: await fotosPara(p, 2) }))),
  ]);

  return {
    version: VERSION_MANUAL,
    texto: manual.texto,
    paleta: manual.paleta,
    evitar: manual.evitar,
    estilo: estilo.filter((p) => p.fotos.length > 0).slice(0, 4),
    outfits: outfits.filter((o): o is OutfitListo => o !== null),
    favoritas: manual.favoritas,
    // Se pidieron hasta 10 candidatos; se muestran como máximo 8, en el
    // orden de prioridad en que llegaron.
    basicos: basicos.filter((p) => p.fotos.length > 0).slice(0, 8),
  };
}
