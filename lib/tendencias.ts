// =====================================================================
// Tendencias 2026 y 2027 (página /tendencias y manual de estilo)
// =====================================================================
// Recopiladas en noviembre de 2026 de Inexmoda (Colombiatex y
// Colombiamoda), Pantone, WGSN y lo que mostraron las pasarelas de
// primavera-verano 2027 (Nueva York y París). Las usa:
//   - app/tendencias/page.tsx: la página que ve la usuaria.
//   - lib/manual-estilo.ts: el manual las tiene en cuenta al sugerir
//     prendas, solo cuando le favorecen a su perfil.
// Al actualizarlas (cada temporada), cambiar ACTUALIZADO y las fuentes.
// Pendiente: Pantone anuncia su color 2027 el 1 de diciembre de 2026, y
// Colombiatex 2027 (19 al 21 de enero) presenta estéticas nuevas.
// =====================================================================

export const ACTUALIZADO = "noviembre de 2026";

export type Color = { nombre: string; hex: string; nota?: string };
export type Estetica = { nombre: string; temporada: string; idea: string; comoLlevarla: string };
export type Fuente = { nombre: string; url: string };

export type AnoDeTendencias = {
  ano: 2026 | 2027;
  resumen: string;
  colores: Color[];
  prendas: string[];
  esteticas: Estetica[];
  fuentes: Fuente[];
};

export const TENDENCIAS: AnoDeTendencias[] = [
  {
    ano: 2026,
    resumen:
      "Un año de calma y de volver a lo natural: blancos suaves, tonos tierra, lino y sastrería relajada, con espacio para el romanticismo y lo artesanal.",
    colores: [
      { nombre: "Cloud Dancer", hex: "#F0EEE9", nota: "Color del año Pantone 2026: un blanco suave" },
      { nombre: "Transformative Teal", hex: "#1F6E6E", nota: "Color del año WGSN 2026" },
      { nombre: "Chocolate", hex: "#5A3A2A" },
      { nombre: "Mantequilla", hex: "#F3E3A0" },
      { nombre: "Oliva", hex: "#6B7A3A" },
      { nombre: "Terracota", hex: "#B5583A" },
      { nombre: "Arena", hex: "#D9C3A0" },
      { nombre: "Rojo cereza", hex: "#8E1B2C" },
    ],
    prendas: [
      "Vestidos fluidos",
      "Prendas de lino",
      "Sastrería relajada: blazer y pantalón amplio",
      "Denim",
      "Estilo boho con flecos",
      "Accesorios protagonistas",
      "Prendas de segunda mano y moda circular",
    ],
    esteticas: [
      {
        nombre: "Honrado",
        temporada: "Primavera-verano 2026 · Inexmoda (Colombiatex)",
        idea: "Siluetas libres, materiales naturales y tonos apagados.",
        comoLlevarla: "Lino, algodón y prendas holgadas en tonos tierra.",
      },
      {
        nombre: "Terrenal",
        temporada: "Primavera-verano 2026 · Inexmoda (Colombiatex)",
        idea: "Lo simple y lo cotidiano, lo hecho a mano frente a lo digital.",
        comoLlevarla: "Básicos de buena calidad, tejidos y detalles artesanales.",
      },
      {
        nombre: "Mosaico",
        temporada: "Primavera-verano 2026 · Inexmoda (Colombiatex)",
        idea: "Volúmenes generosos y detalles decorativos, con una opulencia al alcance.",
        comoLlevarla: "Una prenda con volumen o con ornamento como protagonista del look.",
      },
      {
        nombre: "Sublime",
        temporada: "Primavera-verano 2026 · Inexmoda (Colombiatex)",
        idea: "Diseño muy visual y sensorial, guiado por la intuición.",
        comoLlevarla: "Color, textura y piezas que se sienten bien al tacto.",
      },
      {
        nombre: "Prototipo",
        temporada: "Otoño-invierno 2026/27 · Colombiamoda",
        idea: "Experimentar: prendas híbridas y modulares que cambian de forma.",
        comoLlevarla: "Piezas que se transforman o se llevan de varias maneras.",
      },
      {
        nombre: "Preservar",
        temporada: "Otoño-invierno 2026/27 · Colombiamoda",
        idea: "Tradiciones y oficios recuperados, con mirada sostenible.",
        comoLlevarla: "Piezas atemporales, tejidos artesanales y prendas para durar.",
      },
      {
        nombre: "Tensión",
        temporada: "Otoño-invierno 2026/27 · Colombiamoda",
        idea: "Inspirada en lo punk y lo gótico: fuerza y suavidad a la vez.",
        comoLlevarla: "Transparencias en capas y texturas crudas con un detalle disruptivo.",
      },
      {
        nombre: "Linger",
        temporada: "Otoño-invierno 2026/27 · Colombiamoda",
        idea: "Calma y consumo consciente: básicos reinterpretados y materiales que duran.",
        comoLlevarla: "Un clóset corto de básicos de calidad, bien combinados.",
      },
    ],
    fuentes: [
      { nombre: "Pantone: color del año 2026", url: "https://www.pantone.com/na/en-us/color-of-the-year/2026" },
      {
        nombre: "Inexmoda: estéticas primavera-verano 2026 (Colombiatex)",
        url: "https://inexmoda.org.co/moda-y-tendencias/tendencias-primavera-verano-2026-las-esteticas-de-diseno-que-marcaran-el-rumbo-en-colombiatex-2026/",
      },
      { nombre: "Colombiamoda 2026: foro de tendencias", url: "https://colombiamoda.com/en/trends-forum/" },
      {
        nombre: "El País: qué llevar a Colombiamoda 2026",
        url: "https://www.elpais.com.co/entretenimiento/que-llevar-a-colombiamoda-2026-las-prendas-que-marcaran-tendencia-y-atraeran-todas-las-miradas-2213.html",
      },
      { nombre: "Harper's Bazaar: lo mejor de Colombiamoda 2026", url: "https://www.harpersbazaar.com.ec/moda/estos-fueron-highlights-colombiamoda-2026-n1634" },
    ],
  },
  {
    ano: 2027,
    resumen:
      "Vuelve la elegancia: faldas con movimiento, sastrería, transparencias y artesanía visible, con amarillos, lavanda y un azul eléctrico como protagonistas.",
    colores: [
      { nombre: "Luminous Blue", hex: "#2F5BD8", nota: "Color del año WGSN 2027: un azul eléctrico" },
      { nombre: "Amarillo mostaza", hex: "#D9A227" },
      { nombre: "Amarillo mantequilla", hex: "#F3E3A0" },
      { nombre: "Lavanda", hex: "#B9A6D6" },
      { nombre: "Rosa suave", hex: "#F2C6CF" },
      { nombre: "Verde oliva", hex: "#6B7A3A", nota: "El verde es el favorito para el color Pantone 2027 (se anuncia el 1 de diciembre)" },
      { nombre: "Tonos tierra y neutros", hex: "#C8B39A" },
    ],
    prendas: [
      "Faldas fluidas y con movimiento, también la falda globo",
      "Faldas midi",
      "Pantalones balloon y palazzo amplios",
      "Vestidos largos y enterizos",
      "Bermudas",
      "Chaquetas rectas y cruzadas",
      "Blusas con transparencia, con blazer y pantalón largo",
      "Bordados, crochet y flores",
      "Sandalias de tacón",
      "Mezclar estampados: flores con rayas o animal print",
      "Prendas que se combinan por separado, en vez de conjuntos cerrados",
    ],
    esteticas: [
      {
        nombre: "Regreso de la elegancia",
        temporada: "Primavera-verano 2027 · pasarelas",
        idea: "Después de años de streetwear vuelven la sastrería y lo bien hecho.",
        comoLlevarla: "Un blazer o una chaqueta cruzada sobre falda fluida o pantalón amplio.",
      },
      {
        nombre: "Artesanía visible",
        temporada: "Primavera-verano 2027 · pasarelas",
        idea: "Bordados, crochet y oficios a la vista, como contrapeso a lo digital.",
        comoLlevarla: "Una pieza con bordado o crochet como foco, el resto liso.",
      },
      {
        nombre: "Romanticismo con volumen",
        temporada: "Primavera-verano 2027 · pasarelas",
        idea: "Volúmenes exagerados, encajes y la lencería como inspiración.",
        comoLlevarla: "Falda globo o con vuelo, blusas con encaje o transparencia.",
      },
      {
        nombre: "Mezcla de estampados",
        temporada: "Primavera-verano 2027 · pasarelas",
        idea: "Combinar estampados distintos en un mismo look.",
        comoLlevarla: "Dos estampados con un color en común para que conversen.",
      },
    ],
    fuentes: [
      {
        nombre: "FashionUnited: tendencias primavera-verano 2027",
        url: "https://fashionunited.es/noticias/moda/las-tendencias-para-primavera-verano-2027-marcan-una-moda-atravesada-por-la-policrisis-el-placer-contenido-y-el-regreso-de-la-elegancia/2026052949482",
      },
      {
        nombre: "El Espectador: cinco tendencias vistas en París",
        url: "https://www.elespectador.com/moda-e-industria/que-se-va-a-usar-en-primavera-verano-de-2027-cinco-tendencias-de-moda-que-dejo-en-paris/",
      },
      {
        nombre: "Revista Para Ti: las 7 tendencias de primavera-verano 2027",
        url: "https://www.parati.com.ar/moda/moda-primavera-verano-2027-las-7-tendencias-que-llegan-para-renovar-tu-placard/",
      },
      { nombre: "Audaces: tendencias primavera-verano 2027", url: "https://audaces.com/es/blog/tendencias-primavera-verano" },
      { nombre: "Colombiatex 2027 (Inexmoda)", url: "https://inexmoda.org.co/colombiatex-de-las-americas-2027-una-evolucion-del-abastecimiento-inteligente-hacia-la-generacion-de-valor-del-sistema-moda/" },
    ],
  },
];

/**
 * Las tendencias en texto, para las instrucciones del manual de estilo.
 * Corto a propósito: es contexto, no una lista que haya que cumplir.
 */
export function tendenciasParaElManual(): string {
  return TENDENCIAS.map(
    (t) =>
      `${t.ano}: ${t.resumen} Colores: ${t.colores.map((c) => c.nombre).join(", ")}. Prendas: ${t.prendas.join("; ")}.`
  ).join("\n");
}
