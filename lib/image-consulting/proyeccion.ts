// =====================================================================
// Manual de asesoría — Qué quieres proyectar
// =====================================================================
// Los otros tres pilares describen lo que la usuaria ES: su cuerpo
// (morfología), su color (colorimetría) y su gusto (personalidad). Este
// es el único que describe lo que QUIERE — y por eso manda cuando hay
// conflicto.
//
// Es la diferencia entre "esto te queda bien" y "esto te sirve para lo
// que necesitas". Una silueta pera a la que le favorecen los volúmenes
// arriba, si quiere proyectar autoridad, no recibe un volado: recibe un
// hombro estructurado, que consigue lo mismo y además dice lo que ella
// quiere decir.
// =====================================================================

export type Proyeccion =
  | "autoridad"
  | "cercania"
  | "creatividad"
  | "elegancia"
  | "energia"
  | "serenidad";

export type ProyeccionInfo = {
  label: string;
  // Cómo lo diría la usuaria, no el manual.
  enSusPalabras: string;
  // Qué recursos visuales construyen ese mensaje.
  recursos: string[];
  // Qué lo desarma, aunque sea bonito.
  loQueLoRompe: string[];
};

export const PROYECCIONES: Record<Proyeccion, ProyeccionInfo> = {
  autoridad: {
    label: "Autoridad",
    enSusPalabras: "Que me tomen en serio y se note que sé de lo que hablo.",
    recursos: [
      "Hombro definido o estructurado: es lo que más rápido lee el ojo como mando.",
      "Líneas verticales limpias y largos que no se interrumpan.",
      "Colores oscuros o profundos en la mitad de arriba.",
      "Telas con cuerpo, que sostengan la forma en vez de caer.",
      "Pocos accesorios, pero uno con presencia.",
    ],
    loQueLoRompe: [
      "Estampados pequeños y muy repetidos: restan peso visual.",
      "Telas muy livianas que se arrugan o se pegan.",
      "Demasiados accesorios pequeños compitiendo entre sí.",
    ],
  },
  cercania: {
    label: "Cercanía",
    enSusPalabras: "Que la gente se sienta cómoda conmigo y se me acerque.",
    recursos: [
      "Colores medios y cálidos cerca de la cara.",
      "Curvas suaves en escotes y cortes, en vez de ángulos duros.",
      "Telas con textura amable: punto, algodón lavado, gamuza.",
      "Un detalle que invite a comentar: un color, un accesorio con historia.",
    ],
    loQueLoRompe: [
      "Negro absoluto de pies a cabeza.",
      "Cortes muy rígidos o acartonados.",
      "Verse demasiado producida para la ocasión: aleja en vez de acercar.",
    ],
  },
  creatividad: {
    label: "Creatividad",
    enSusPalabras: "Que se note que tengo criterio propio y no sigo la corriente.",
    recursos: [
      "Una combinación inesperada por conjunto: un color, una textura o una proporción.",
      "Mezclar texturas que no suelen ir juntas.",
      "Accesorios con carácter, mejor uno grande que muchos chicos.",
      "Jugar con la proporción: algo oversize contra algo ajustado.",
    ],
    loQueLoRompe: [
      "El conjunto completo tal como viene en la vitrina.",
      "Demasiadas ideas a la vez: tres cosas llamativas se anulan entre sí.",
    ],
  },
  elegancia: {
    label: "Elegancia",
    enSusPalabras: "Que me vea impecable sin que parezca que me esforcé.",
    recursos: [
      "Paleta corta: dos o tres colores por conjunto, máximo.",
      "Calidad visible en la tela antes que cantidad de prendas.",
      "Largos y proporciones exactos — un ruedo mal puesto arruina lo demás.",
      "Accesorios discretos y de buen material.",
    ],
    loQueLoRompe: [
      "Logos grandes y marcas a la vista.",
      "Prendas que se ven cansadas: pilling, ruedos sueltos, colores desteñidos.",
      "Mezclar demasiados metales o estampados.",
    ],
  },
  energia: {
    label: "Energía",
    enSusPalabras: "Que se note que tengo empuje y ganas.",
    recursos: [
      "Un color saturado como protagonista del conjunto.",
      "Cortes que no estorben el movimiento.",
      "Contrastes claros entre las piezas.",
      "Calzado que se vea cómodo y resuelto.",
    ],
    loQueLoRompe: [
      "Paletas apagadas de arriba a abajo.",
      "Prendas que obliguen a estar acomodándose todo el tiempo.",
    ],
  },
  serenidad: {
    label: "Serenidad",
    enSusPalabras: "Que transmita calma y que nada de lo que tengo puesto grite.",
    recursos: [
      "Tonos cercanos entre sí, sin saltos bruscos.",
      "Telas que caen: lino, punto fino, seda lavada.",
      "Siluetas holgadas pero definidas en un punto.",
      "Un solo acento, y lejos de la cara.",
    ],
    loQueLoRompe: [
      "Estampados grandes o de mucho contraste.",
      "Accesorios que suenan o se mueven mucho.",
      "Demasiadas capas visibles.",
    ],
  },
};
