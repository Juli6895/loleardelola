// =====================================================================
// Manual de asesoría de imagen — Pilar 2: Morfología / figura corporal
// =====================================================================
// Borrador inicial. 5 siluetas clásicas de asesoría de imagen. El
// objetivo NUNCA es "corregir" el cuerpo — es usar proporción y volumen
// para lograr el efecto visual que la usuaria busca (equilibrio,
// alargar, marcar cintura, etc). Ajustar tono/lenguaje con tu criterio.
// =====================================================================

export type Silueta =
  | "reloj_de_arena"
  | "pera"
  | "manzana"
  | "rectangulo"
  | "triangulo_invertido";

export type SiluetaInfo = {
  label: string;
  descripcion: string;
  // Cómo identificarla en el cuestionario del Avatar (Fase 3).
  comoIdentificarla: string;
  objetivoVisual: string;
  prendasFavorecen: string[];
  prendasEvitar: string[];
  // Categorías del clóset (ver types/index.ts ClosetCategory) donde esta
  // silueta debería tener más peso al sugerir combinaciones.
  categoriasClave: Array<"top" | "bottom" | "vestido" | "abrigo" | "calzado" | "accesorio">;
};

export const SILUETAS: Record<Silueta, SiluetaInfo> = {
  reloj_de_arena: {
    label: "Reloj de arena",
    descripcion:
      "Hombros y cadera con anchos similares, cintura marcadamente más angosta.",
    comoIdentificarla:
      "El ancho de hombros y el de cadera se ven parecidos, y hay una diferencia clara con la cintura.",
    objetivoVisual: "Mantener la cintura marcada, sin agregar volumen extra arriba o abajo que la tape.",
    prendasFavorecen: [
      "vestidos entallados o wrap",
      "cinturones a la cintura",
      "blusas con pinzas",
      "pantalón recto o skinny",
      "blazers entallados",
    ],
    prendasEvitar: [
      "prendas rectas sin forma que escondan la cintura",
      "capas muy voluminosas arriba y abajo al mismo tiempo",
    ],
    categoriasClave: ["vestido", "top", "accesorio"],
  },
  pera: {
    label: "Pera (triángulo)",
    descripcion:
      "Cadera y muslos más anchos que los hombros, cintura definida.",
    comoIdentificarla:
      "La parte de abajo del cuerpo se ve más ancha que los hombros.",
    objetivoVisual: "Sumar volumen visual arriba (hombros/escote) para equilibrar con la cadera.",
    prendasFavorecen: [
      "blusas con hombros estructurados o mangas con volumen",
      "escote barco o en V",
      "estampados o colores claros en la parte de arriba",
      "pantalón wide leg o bota recta",
      "falda en A",
    ],
    prendasEvitar: [
      "pantalón skinny con top ajustado (acentúa el contraste)",
      "bolsillos o estampados grandes en la cadera",
      "faldas de lápiz muy ajustadas sin estructura arriba",
    ],
    categoriasClave: ["top", "bottom"],
  },
  manzana: {
    label: "Manzana (ovalada)",
    descripcion:
      "Volumen concentrado en el torso y abdomen, piernas y brazos más delgados, poca definición de cintura.",
    comoIdentificarla:
      "El ancho del torso es similar o mayor al de cadera y hombros, sin una cintura muy marcada.",
    objetivoVisual: "Alargar la silueta verticalmente y crear la ilusión de cintura sin apretar el torso.",
    prendasFavorecen: [
      "vestidos línea A o imperio",
      "blusas con caída suelta pero no ancha",
      "escote en V para alargar",
      "pantalón de tiro alto que no marque el abdomen",
      "chaquetas abiertas o largas que estilicen verticalmente",
    ],
    prendasEvitar: [
      "prendas muy ajustadas en el torso",
      "cinturones anchos justo en la cintura natural",
      "capas cortas que corten la silueta a la altura del abdomen",
    ],
    categoriasClave: ["vestido", "top", "abrigo"],
  },
  rectangulo: {
    label: "Rectángulo",
    descripcion:
      "Hombros, cintura y cadera con anchos similares, poca curva marcada.",
    comoIdentificarla:
      "De hombros a cadera el contorno es bastante recto, sin entrada notoria en la cintura.",
    objetivoVisual: "Crear la ilusión de curvas y de una cintura definida donde no hay tanto contraste natural.",
    prendasFavorecen: [
      "cinturones para marcar cintura artificialmente",
      "peplum",
      "vestidos con corte en A o con volados",
      "capas y texturas para dar dimensión",
      "pantalón wide leg con top ajustado (crea contraste)",
    ],
    prendasEvitar: [
      "prendas completamente rectas de arriba a abajo sin ningún quiebre",
      "un solo color liso de pies a cabeza sin textura",
    ],
    categoriasClave: ["top", "bottom", "accesorio"],
  },
  triangulo_invertido: {
    label: "Triángulo invertido",
    descripcion: "Hombros más anchos que la cadera, poca definición de cintura.",
    comoIdentificarla:
      "Los hombros se ven notablemente más anchos que la cadera.",
    objetivoVisual: "Suavizar la línea de hombros y sumar volumen visual en la parte de abajo para equilibrar.",
    prendasFavorecen: [
      "pantalón wide leg, palazzo o con bolsillos/estampado",
      "falda en A o con volumen",
      "escote en V (alarga, no ensancha más)",
      "tops sin hombreras, con escote redondo o en V",
    ],
    prendasEvitar: [
      "hombreras o mangas abullonadas",
      "escote barco o cuello halter (ensancha más los hombros)",
      "pantalón o falda muy ajustados que no den volumen abajo",
    ],
    categoriasClave: ["bottom", "top"],
  },
};

// =====================================================================
// Silueta a partir de medidas corporales
// =====================================================================
// Heurística clásica de asesoría de imagen basada en 3 medidas (busto,
// cintura, cadera, en cm) — el mismo criterio que usan muchas
// calculadoras de "shape" de tiendas de ropa. Es una PRIMERA
// APROXIMACIÓN: los umbrales (6cm de diferencia hombro/cadera, 9-10cm de
// definición de cintura) son valores de referencia general, no una
// medición clínica. Ajustar con criterio profesional si hace falta.
//
// Se guarda junto con las medidas crudas (ver types/index.ts
// BodyMeasurements) para que si el criterio cambia más adelante, se
// pueda recalcular sin pedirle los datos de nuevo a la usuaria.
export function inferirSiluetaPorMedidas(
  bustoCm: number,
  cinturaCm: number,
  caderaCm: number
): Silueta {
  const bustoMenosCadera = bustoCm - caderaCm;
  const bustoMenosCintura = bustoCm - cinturaCm;
  const caderaMenosCintura = caderaCm - cinturaCm;

  const cinturaDefinida = bustoMenosCintura >= 9 && caderaMenosCintura >= 10;

  // 1. Hombros/busto claramente más ancho que la cadera.
  if (bustoMenosCadera >= 6) return "triangulo_invertido";
  // 2. Cadera claramente más ancha que el busto.
  if (bustoMenosCadera <= -6) return "pera";

  // A partir de acá, busto y cadera están dentro de 6cm uno del otro
  // ("balanceados"). Lo que diferencia reloj de arena / manzana /
  // rectángulo es qué tan marcada está la cintura:
  if (cinturaDefinida) return "reloj_de_arena";
  // Sin cintura marcada: si el busto es igual o mayor a la cadera, el
  // volumen está concentrado arriba/en el torso → manzana. Si la cadera
  // es apenas un poco mayor (pero no lo suficiente para ser "pera"), el
  // contorno se lee más como rectángulo.
  if (bustoMenosCadera >= 0) return "manzana";
  return "rectangulo";
}
