// =====================================================================
// Manual de asesoría de imagen — Pilar 1: Colorimetría
// =====================================================================
// Borrador inicial (Fase 2 del roadmap premium). Basado en el modelo
// clásico de "colorimetría estacional" (4 estaciones), el más usado en
// asesoría de imagen profesional en español. Revisar y ajustar con
// criterio propio antes de usarlo en producción — esto es punto de
// partida, no la versión final.
//
// Formato estructurado a propósito: esto es lo que va a leer el motor de
// sugerencias del Avatar (Fase 3) para recomendar colores, no solo texto
// para mostrar en una página.
// =====================================================================

export type Subtono = "frio" | "calido" | "neutro";

export type Estacion = "invierno" | "verano" | "otono" | "primavera";

export type SubtonoInfo = {
  label: string;
  descripcion: string;
  // Señales físicas para que la usuaria detecte su subtono sin equipo.
  comoDetectarlo: string[];
  metalesQueFavorecen: string[];
};

export const SUBTONOS: Record<Subtono, SubtonoInfo> = {
  frio: {
    label: "Frío",
    descripcion:
      "La piel tiene una base rosada, azulada o violeta debajo. El blanco puro y los colores joya (azul, fucsia, esmeralda) se ven bien contra la piel.",
    comoDetectarlo: [
      "Venas de la muñeca: se ven azules o moradas (no verdes).",
      "Con joyería plateada la piel se ve más luminosa que con dorada.",
      "El pelo, si es rubio, tiende a ceniza; si es castaño u oscuro, tiene reflejos azulados o violeta, no rojizos.",
      "Una tela blanco puro ilumina la cara más que una blanco hueso/marfil.",
    ],
    metalesQueFavorecen: ["plata", "platino", "oro blanco"],
  },
  calido: {
    label: "Cálido",
    descripcion:
      "La piel tiene una base dorada, durazno o amarilla debajo. Los colores tierra (café, mostaza, terracota, verde oliva) resaltan más que los fríos.",
    comoDetectarlo: [
      "Venas de la muñeca: se ven verdosas.",
      "Con joyería dorada la piel se ve más luminosa que con plateada.",
      "El pelo suele tener reflejos dorados, cobrizos o rojizos al sol.",
      "Una tela blanco hueso/marfil favorece más que un blanco puro, que puede opacar.",
    ],
    metalesQueFavorecen: ["oro", "bronce", "cobre"],
  },
  neutro: {
    label: "Neutro",
    descripcion:
      "Mezcla de ambos — ni claramente frío ni cálido. Tolera casi cualquier color, pero conviene evitar los extremos muy saturados de cada polo.",
    comoDetectarlo: [
      "Venas de la muñeca: mezcla de azul y verde, no es claro.",
      "Se ve bien tanto con joyería dorada como plateada, sin gran diferencia.",
      "Suele confundirse con frío o cálido — si dudas entre los dos, probablemente eres neutra.",
    ],
    metalesQueFavorecen: ["oro rosa", "plata", "oro (según la prenda)"],
  },
};

export type EstacionInfo = {
  label: string;
  subtono: Subtono;
  contraste: "alto" | "medio" | "bajo";
  descripcion: string;
  // Colores que sí favorecen, agrupados para que el motor de sugerencias
  // los pueda mapear directo a los colores que ya detecta Claude en fotos.
  paletaRecomendada: string[];
  coloresEvitar: string[];
  ejemploCelebridadTipo: string;
};

export const ESTACIONES: Record<Estacion, EstacionInfo> = {
  invierno: {
    label: "Invierno",
    subtono: "frio",
    contraste: "alto",
    descripcion:
      "Piel clara o muy oscura con alto contraste frente a pelo y ojos oscuros. Favorecen los colores intensos, saturados y fríos — el contraste fuerte es lo que ilumina la cara, no los colores suaves.",
    paletaRecomendada: [
      "negro",
      "blanco puro",
      "azul rey",
      "fucsia",
      "esmeralda",
      "morado",
      "rojo cereza",
      "gris carbón",
    ],
    coloresEvitar: ["mostaza", "naranja", "beige cálido", "café claro"],
    ejemploCelebridadTipo: "Contraste alto piel-pelo-ojos, tono de piel frío",
  },
  verano: {
    label: "Verano",
    subtono: "frio",
    contraste: "bajo",
    descripcion:
      "Piel, pelo y ojos en tonos más suaves y apagados, con base fría. Favorecen los colores frios pero suaves — pasteles y tonos empolvados, no los muy saturados.",
    paletaRecomendada: [
      "azul cielo",
      "rosa palo",
      "lavanda",
      "gris perla",
      "azul jean",
      "verde menta",
      "vinotinto suave",
    ],
    coloresEvitar: ["naranja", "amarillo mostaza", "negro puro", "café"],
    ejemploCelebridadTipo: "Piel fría de contraste bajo-medio, colores suaves",
  },
  otono: {
    label: "Otoño",
    subtono: "calido",
    contraste: "bajo",
    descripcion:
      "Piel, pelo y ojos con base dorada/cálida y contraste suave. Favorecen los colores tierra, cálidos y terrosos — el mismo espíritu que la paleta de otoño en la naturaleza.",
    paletaRecomendada: [
      "café",
      "mostaza",
      "terracota",
      "verde oliva",
      "naranja quemado",
      "beige",
      "vinotinto cálido",
      "dorado",
    ],
    coloresEvitar: ["fucsia", "azul rey", "blanco puro", "gris frío"],
    ejemploCelebridadTipo: "Pelo cobrizo o castaño cálido, piel dorada",
  },
  primavera: {
    label: "Primavera",
    subtono: "calido",
    contraste: "medio",
    descripcion:
      "Piel clara y cálida con contraste medio, colores claros y brillantes. Favorecen los colores cálidos pero luminosos — nada apagado ni muy oscuro.",
    paletaRecomendada: [
      "coral",
      "durazno",
      "verde manzana",
      "amarillo cálido",
      "turquesa",
      "camel",
      "rojo tomate",
    ],
    coloresEvitar: ["negro puro", "gris frío", "morado oscuro", "vinotinto"],
    ejemploCelebridadTipo: "Piel clara cálida, pelo rubio o castaño claro dorado",
  },
};

export type TonoPiel = "blanca" | "canela" | "morena" | "negra";

export const TONOS_PIEL: Record<TonoPiel, { label: string }> = {
  blanca: { label: "Blanca" },
  canela: { label: "Canela" },
  morena: { label: "Morena" },
  negra: { label: "Negra / oscura" },
};

// Qué tan claro u oscuro es cada tono de piel y cada color de cabello,
// en una misma escala 0 (más claro) a 3 (más oscuro), para poder
// compararlos entre sí.
const NIVEL_PIEL: Record<TonoPiel, number> = {
  blanca: 0,
  canela: 1,
  morena: 2,
  negra: 3,
};

const NIVEL_CABELLO: Record<string, number> = {
  rubio: 0,
  canoso: 0,
  "castaño claro": 1.5,
  cobrizo: 1.5,
  teñido: 1.5,
  "castaño oscuro": 3,
  negro: 3,
};

/**
 * Deduce el contraste piel-pelo a partir de dos datos que la usuaria sí
 * sabe responder sin pensarlo (su tono de piel y su color de cabello),
 * en vez de preguntárselo directamente.
 *
 * Es una aproximación: la asesoría presencial también mira el color de
 * ojos y la intensidad del cabello. Devuelve null si falta alguno de
 * los dos datos, para no inventar un contraste.
 */
export function inferirContraste(
  tonoPiel: TonoPiel | null,
  colorCabello: string | null
): Contraste | null {
  if (!tonoPiel) return null;
  const nivelCabello = colorCabello
    ? NIVEL_CABELLO[colorCabello.toLowerCase()]
    : undefined;
  if (nivelCabello === undefined) return null;

  const diferencia = Math.abs(NIVEL_PIEL[tonoPiel] - nivelCabello);
  if (diferencia >= 2.5) return "alto";
  if (diferencia >= 1.2) return "medio";
  return "bajo";
}

export type Contraste = "alto" | "medio" | "bajo";

export type ContrasteInfo = {
  label: string;
  descripcion: string;
  comoVestir: string[];
  evitar: string[];
};

/**
 * Asesoría que se puede dar con solo el contraste piel-pelo, sin saber
 * el subtono. No dice QUÉ colores usar (eso necesita el subtono), sino
 * CÓMO combinarlos entre sí — que es la mitad del consejo, y la que más
 * se nota en una foto.
 */
export const CONTRASTES: Record<Contraste, ContrasteInfo> = {
  alto: {
    label: "Contraste alto",
    descripcion:
      "Entre tu piel y tu cabello hay mucha diferencia de claridad. Tu cara aguanta — y pide — combinaciones fuertes: los colores intensos no te opacan, te acompañan.",
    comoVestir: [
      "Combina un color claro con uno oscuro: blanco con negro, crema con chocolate.",
      "Los colores saturados y puros te lucen (rojo, azul rey, fucsia, esmeralda).",
      "Un accesorio en color fuerte cerca de la cara te ilumina.",
    ],
    evitar: [
      "Conjuntos de tonos muy parecidos entre sí: te apagan la cara.",
      "Los pasteles de arriba a abajo sin nada que corte.",
    ],
  },
  medio: {
    label: "Contraste medio",
    descripcion:
      "La diferencia entre tu piel y tu cabello es moderada. Es el contraste más versátil: te funcionan casi todas las combinaciones, siempre que no te vayas a los extremos.",
    comoVestir: [
      "Combinaciones de contraste suave a medio: camel con blanco hueso, azul jean con gris.",
      "Los colores de intensidad media son tu terreno seguro.",
      "Puedes usar un toque de color fuerte, mejor como acento que como base.",
    ],
    evitar: [
      "El blanco puro junto al negro puro: es más contraste del que tu cara necesita.",
    ],
  },
  bajo: {
    label: "Contraste bajo",
    descripcion:
      "Tu piel y tu cabello tienen una claridad parecida. Tu fuerza está en la armonía, no en el choque: los contrastes muy duros compiten con tu cara en vez de resaltarla.",
    comoVestir: [
      "Combinaciones de tonos cercanos entre sí, o un mismo color en varias intensidades.",
      "Los colores suaves y empolvados te favorecen más que los muy saturados.",
      "Si quieres un color fuerte, úsalo lejos de la cara (falda, zapatos, bolso).",
    ],
    evitar: [
      "Blanco puro con negro puro: te endurece los rasgos.",
      "Bloques de color muy saturado pegados a la cara.",
    ],
  },
};

/**
 * Dado un subtono y un nivel de contraste piel-pelo-ojos, sugiere la
 * estación más probable. Simplificado — la asesoría real usa más
 * variables (valor, croma), pero sirve como heurística inicial para el
 * cuestionario del Avatar (Fase 3).
 *
 * Devuelve null cuando el subtono no cae en ninguna estación. Las 4
 * estaciones clásicas son frías o cálidas; un subtono "neutro" no tiene
 * estación, y eso no es un error sino una respuesta legítima.
 */
export function inferirEstacion(
  subtono: Subtono,
  contraste: Contraste
): Estacion | null {
  const candidatas = (Object.keys(ESTACIONES) as Estacion[]).filter(
    (e) => ESTACIONES[e].subtono === subtono
  );
  if (candidatas.length === 0) return null;
  // Entre las 2 estaciones del mismo subtono, la de contraste más
  // parecido al de la usuaria.
  return candidatas.reduce((mejor, actual) =>
    ESTACIONES[actual].contraste === contraste ? actual : mejor
  );
}
