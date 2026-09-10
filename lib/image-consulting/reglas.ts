// =====================================================================
// Manual de asesoría de imagen — Pilar 4: Reglas de combinación
// =====================================================================
// Reglas generales de estilismo, independientes de color y figura — el
// "sentido común" de asesoría de imagen que el Avatar (Fase 3) usa para
// validar si una combinación del clóset funciona como conjunto.
// =====================================================================

export type ReglaCombinacion = {
  id: string;
  titulo: string;
  descripcion: string;
  ejemplo: string;
  // Qué tan estricta es — "dura" casi nunca se rompe bien, "guía" es más
  // flexible según el estilo personal.
  tipo: "dura" | "guia";
};

export const REGLAS_COMBINACION: ReglaCombinacion[] = [
  {
    id: "proporcion-tercios",
    titulo: "Proporción 1/3 – 2/3",
    descripcion:
      "Cuando el outfit tiene dos prendas grandes (top + bottom), lo más favorecedor casi siempre es que una ocupe un tercio de la silueta y la otra dos tercios — evita el efecto 'partido a la mitad' que acorta visualmente.",
    ejemplo:
      "Top corto (1/3) + pantalón de tiro alto (2/3), en vez de camisa larga hasta la cadera + pantalón del mismo largo.",
    tipo: "guia",
  },
  {
    id: "maximo-un-punto-focal",
    titulo: "Un punto focal por outfit",
    descripcion:
      "Si una prenda ya llama la atención (estampado grande, color muy saturado, brillo), el resto del outfit debería ser más neutro para no competir visualmente.",
    ejemplo:
      "Blusa animal print → acompañarla de jean o pantalón liso, no de otra prenda estampada.",
    tipo: "guia",
  },
  {
    id: "maximo-dos-estampados",
    titulo: "Máximo 2 estampados, y que compartan un color",
    descripcion:
      "Combinar más de 2 estampados en el mismo outfit rara vez funciona salvo que se haga a propósito (mixed prints). Si se combinan 2, deben compartir al menos un color en común para que se vean intencionales.",
    ejemplo: "Falda de rayas azul y blanco + blusa floral con azul en el estampado.",
    tipo: "guia",
  },
  {
    id: "contraste-de-textura",
    titulo: "Contrastar texturas en outfits monocromáticos",
    descripcion:
      "Un outfit de un solo color (o tonos muy parecidos) se ve plano si todas las prendas tienen la misma textura. Mezclar mate/brillante o liso/tejido le da profundidad.",
    ejemplo: "Total look negro: pantalón de cuero (brillante) + blusa de punto (mate).",
    tipo: "guia",
  },
  {
    id: "regla-3-colores",
    titulo: "Máximo 3 colores principales por outfit",
    descripcion:
      "Fuera de los neutros (negro, blanco, gris, beige, denim, que cuentan aparte), lo más seguro es no combinar más de 3 colores fuertes en el mismo look para que no se vea desordenado.",
    ejemplo: "Vestido azul + bolso mostaza + zapatos blancos (los blancos, al ser neutro, no cuentan en el tope de 3).",
    tipo: "guia",
  },
  {
    id: "calzado-tono-piernas",
    titulo: "El calzado del tono de la piel o del pantalón alarga la pierna",
    descripcion:
      "Un zapato que hace contraste fuerte con el pantalón/piel corta visualmente la silueta a la altura del tobillo. Uno en tono similar continúa la línea y alarga.",
    ejemplo: "Pantalón beige + zapato nude, en vez de pantalón beige + zapato negro.",
    tipo: "guia",
  },
  {
    id: "ocasion-antes-que-tendencia",
    titulo: "La ocasión manda sobre la tendencia",
    descripcion:
      "Antes de sugerir un outfit, considerar para qué es (trabajo, casual, fiesta, formal) — una prenda de tendencia que no encaja con la ocasión no es una buena sugerencia aunque combine bien en color y figura.",
    ejemplo:
      "Blazer oversize: se sugiere para oficina/casual, no como única prenda de arriba para un evento formal de noche.",
    tipo: "dura",
  },
];

export type Ocasion = "casual" | "trabajo" | "formal" | "fiesta" | "deportivo";

export const OCASIONES: Record<Ocasion, { label: string; prendasTipicas: string[] }> = {
  casual: {
    label: "Casual / diario",
    prendasTipicas: ["jean", "camiseta", "tenis", "chaqueta denim"],
  },
  trabajo: {
    label: "Trabajo / oficina",
    prendasTipicas: ["pantalón de vestir", "blazer", "camisa", "mocasines"],
  },
  formal: {
    label: "Formal / evento",
    prendasTipicas: ["vestido de noche", "tacones", "blazer estructurado"],
  },
  fiesta: {
    label: "Fiesta / salida de noche",
    prendasTipicas: ["vestido corto", "top con brillo", "tacones", "accesorios statement"],
  },
  deportivo: {
    label: "Deportivo / activewear",
    prendasTipicas: ["leggings", "top deportivo", "tenis", "buzo"],
  },
};
