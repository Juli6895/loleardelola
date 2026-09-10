// =====================================================================
// Manual de asesoría de imagen — Pilar 5: Personalidad de estilo
// =====================================================================
// Mientras que Colorimetría y Morfología dicen QUÉ le queda bien a la
// usuaria técnicamente (según su piel y su cuerpo), la Personalidad de
// estilo dice CÓMO quiere verse — su gusto estético, independiente del
// cuerpo o el color. Las dos cosas se combinan: una usuaria "Dramática"
// con silueta pera igual prefiere líneas fuertes y statement pieces,
// pero las elige en los cortes que además le favorecen la figura.
//
// Modelo de 6 arquetipos, el más usado en asesoría de imagen en español.
// Casi nadie es 100% un solo arquetipo — lo normal es una combinación de
// 2 (uno dominante + uno secundario). Borrador inicial, ajustar con
// criterio profesional.
// =====================================================================

export type Personalidad =
  | "clasica"
  | "romantica"
  | "dramatica"
  | "natural"
  | "creativa"
  | "sensual";

export type PersonalidadInfo = {
  label: string;
  descripcion: string;
  palabrasClave: string[];
  // Señales para que la usuaria se auto-identifique en un cuestionario.
  senales: string[];
  prendasClave: string[];
  telasFavoritas: string[];
  accesorios: string;
  // Cómo se ajusta esta personalidad cuando choca con lo que sugiere la
  // morfología — la personalidad no se abandona, se adapta el corte.
  notaDeCombinacion: string;
};

export const PERSONALIDADES: Record<Personalidad, PersonalidadInfo> = {
  clasica: {
    label: "Clásica",
    descripcion:
      "Busca líneas limpias, prendas atemporales y calidad sobre tendencia. Prefiere verse siempre apropiada y pulida, sin excesos.",
    palabrasClave: ["atemporal", "ordenada", "de calidad", "discreta"],
    senales: [
      "Prefiere comprar menos piezas pero que duren varias temporadas",
      "Se siente incómoda con estampados muy llamativos o cortes muy atrevidos",
      "Le gusta que el outfit se vea 'terminado' y coherente",
    ],
    prendasClave: [
      "blazer estructurado",
      "camisa blanca",
      "pantalón de corte recto",
      "trench coat",
      "mocasines o tacón bajo",
    ],
    telasFavoritas: ["algodón de buena calidad", "lana", "seda lisa"],
    accesorios: "Pocos pero de calidad — un reloj, perlas, cuero liso.",
    notaDeCombinacion:
      "Si su figura pide sumar volumen en algún lado (ej. pera o triángulo invertido), lo hace con cortes estructurados en vez de estampados o volados — mantiene la limpieza visual.",
  },
  romantica: {
    label: "Romántica",
    descripcion:
      "Se inclina por lo femenino, suave y delicado. Disfruta las texturas suaves, los volados y los colores dulces.",
    palabrasClave: ["femenina", "suave", "delicada", "dulce"],
    senales: [
      "Le atraen los estampados florales, los encajes y las telas fluidas",
      "Prefiere las siluetas que insinúan en vez de marcar fuerte",
      "Los colores pastel o los tonos empolvados le llaman más que los neutros duros",
    ],
    prendasClave: [
      "vestidos con volados o encaje",
      "blusas con detalles (moños, olanes)",
      "faldas midi fluidas",
      "cárdigans suaves",
    ],
    telasFavoritas: ["chiffon", "encaje", "seda", "tul"],
    accesorios: "Delicados — joyería fina, moños, bolsos pequeños estructurados.",
    notaDeCombinacion:
      "Si su figura es reloj de arena o rectángulo, los volados y texturas suaves funcionan casi sin ajuste. Si es triángulo invertido, mejor concentrar los volados abajo (falda) y no en hombros/mangas.",
  },
  dramatica: {
    label: "Dramática",
    descripcion:
      "Busca causar impacto visual. Le gustan las líneas fuertes, el contraste marcado y las prendas statement — menos es más, pero lo poco que usa, impacta.",
    palabrasClave: ["impactante", "de vanguardia", "geométrica", "segura"],
    senales: [
      "Prefiere un outfit muy simple con UNA pieza statement, en vez de muchos detalles pequeños",
      "Le gustan las líneas rectas, angulares, y el contraste fuerte (blanco/negro, por ejemplo)",
      "No le teme a los cortes poco convencionales o asimétricos",
    ],
    prendasClave: [
      "blazer oversize",
      "botas altas",
      "abrigo statement",
      "accesorios grandes (un solo punto focal)",
    ],
    telasFavoritas: ["cuero", "denim rígido", "telas con caída estructurada"],
    accesorios: "Uno grande y llamativo por outfit — nunca varios compitiendo.",
    notaDeCombinacion:
      "Funciona con cualquier figura porque se apoya en UNA prenda statement — solo hay que elegir esa prenda en el corte que favorece la silueta (ej: abrigo statement con línea A si es pera).",
  },
  natural: {
    label: "Natural / Casual",
    descripcion:
      "Prioriza la comodidad y la funcionalidad sin sacrificar verse bien. Le incomoda lo muy arreglado o lo que restringe el movimiento.",
    palabrasClave: ["cómoda", "relajada", "funcional", "sin esfuerzo"],
    senales: [
      "Se cambia rápido a algo más cómodo apenas puede",
      "Prefiere telas suaves y prendas que no requieran mucho cuidado",
      "Le gusta poder moverse libremente en lo que usa",
    ],
    prendasClave: [
      "jean",
      "camiseta de algodón",
      "tenis",
      "chaqueta denim o bomber",
      "buzo",
    ],
    telasFavoritas: ["algodón", "denim", "punto/tejido suave"],
    accesorios: "Mínimos y funcionales — gorra, mochila o bolso cruzado.",
    notaDeCombinacion:
      "El ajuste por figura se hace vía el corte (wide leg vs skinny, largo del top) sin perder la sensación relajada — evitar sugerirle prendas muy estructuradas o incómodas aunque 'favorezcan' en teoría.",
  },
  creativa: {
    label: "Creativa / Bohemia",
    descripcion:
      "Le gusta mezclar, experimentar y que el outfit cuente algo de su personalidad. No sigue reglas de combinación al pie de la letra.",
    palabrasClave: ["ecléctica", "artística", "con capas", "original"],
    senales: [
      "Disfruta mezclar estampados, texturas o prendas de distintas épocas/estilos",
      "Le gustan los accesorios artesanales o poco comunes",
      "El outfit 'perfecto y coordinado' le resulta aburrido",
    ],
    prendasClave: [
      "prendas con estampados étnicos o mezclados",
      "capas (chaleco sobre camisa, saco sobre vestido)",
      "accesorios artesanales",
      "piezas vintage",
    ],
    telasFavoritas: ["lino", "algodón con textura", "mezclas de fibras naturales"],
    accesorios: "Muchos, en capas — collares superpuestos, bolsos tejidos, sombreros.",
    notaDeCombinacion:
      "Es la personalidad más flexible con las 'reglas de combinación' (Pilar 4) — el mix de estampados y texturas es parte de su estilo, no un error a corregir.",
  },
  sensual: {
    label: "Sensual / Glamorosa",
    descripcion:
      "Elige prendas que resalten su figura y le hagan sentir atractiva. Disfruta las siluetas ajustadas y los detalles con brillo o textura llamativa.",
    palabrasClave: ["glamorosa", "segura de su cuerpo", "llamativa", "sofisticada"],
    senales: [
      "Prefiere las prendas entalladas sobre las sueltas",
      "Le gustan los escotes, las telas satinadas o con brillo",
      "Disfruta vestirse para la ocasión de forma notoria (no pasar desapercibida)",
    ],
    prendasClave: [
      "vestidos ajustados",
      "tops con escote",
      "tacones",
      "prendas con textura satinada o brillo",
    ],
    telasFavoritas: ["satín", "punto ajustado", "cuero"],
    accesorios: "Statement pero elegantes — tacones altos, joyería con brillo.",
    notaDeCombinacion:
      "El corte ajustado se elige según qué zona quiere resaltar la usuaria según su figura (ej: reloj de arena → ajustado en cintura; pera → ajustado arriba, con volumen abajo).",
  },
};
