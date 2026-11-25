// =====================================================================
// Clima, momento y ocasión de una prenda (filtros de estilo)
// =====================================================================
// Las tiendas no dicen si una prenda es para el frío, para la noche o
// para una fiesta: se deduce de su nombre y su tipo ("Vestido largo en
// lentejuelas" → noche y fiesta; "Saco de lana" → frío). Lo usan los
// filtros de Promociones, "Ver todo" y los resultados de Buscar
// (noviembre de 2026, pedido de Juliana).
//
// Una prenda puede tener varias etiquetas o ninguna. Al filtrar: dentro
// de un mismo grupo vale cualquiera de las escogidas (día o noche); entre
// grupos tienen que cumplirse todos (frío y noche). Una prenda sin
// ninguna etiqueta del grupo escogido no sale.
// =====================================================================

export type GrupoEstilo = "clima" | "momento" | "ocasion";

export type Estilo =
  | "frio"
  | "calido"
  | "dia"
  | "noche"
  | "fiesta"
  | "elegante"
  | "comoda"
  | "oficina"
  | "viaje"
  | "playa"
  | "deporte"
  | "cita";

export const GRUPOS_ESTILO: Array<{ grupo: GrupoEstilo; nombre: string; opciones: Array<{ estilo: Estilo; nombre: string }> }> = [
  {
    grupo: "clima",
    nombre: "Clima",
    opciones: [
      { estilo: "frio", nombre: "Invierno / frío" },
      { estilo: "calido", nombre: "Verano / cálido" },
    ],
  },
  {
    grupo: "momento",
    nombre: "Momento",
    opciones: [
      { estilo: "dia", nombre: "Día" },
      { estilo: "noche", nombre: "Noche" },
    ],
  },
  {
    grupo: "ocasion",
    nombre: "Ocasión",
    opciones: [
      { estilo: "fiesta", nombre: "Fiesta" },
      { estilo: "elegante", nombre: "Elegancia" },
      { estilo: "comoda", nombre: "Comodidad" },
      { estilo: "viaje", nombre: "Viaje" },
      { estilo: "oficina", nombre: "Oficina" },
      { estilo: "playa", nombre: "Playa y piscina" },
      { estilo: "deporte", nombre: "Deporte" },
      { estilo: "cita", nombre: "Cita" },
    ],
  },
];

export const GRUPO_DE: Record<Estilo, GrupoEstilo> = Object.fromEntries(
  GRUPOS_ESTILO.flatMap((g) => g.opciones.map((o) => [o.estilo, g.grupo]))
) as Record<Estilo, GrupoEstilo>;

export const ESTILOS: Estilo[] = Object.keys(GRUPO_DE) as Estilo[];

const sinTildes = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// Palabras (sin tildes) que llevan a cada etiqueta. \b para no confundir
// "lino" con "felino" ni "seda" con "sedal".
const PALABRAS: Record<Estilo, RegExp> = {
  // "Manga larga", "chaleco" o "blazer" solos no son de frío: una camisa
  // manga larga o un chaleco sastre se usan en clima templado.
  frio: /\b(abrigo|chaqueta|chamarra|saco|sueter|sweater|buzo|hoodie|cardigan|lana|cuello alto|tortuga|botas?|botines?|gabardina|trench|acolchad[oa]|polar|terciopelo|pana|corduroy|cuero|chaleco acolchado|ruana|poncho|bufanda|guantes?|termic[oa]|forrad[oa]|peluche|sherpa|bomber|parka)\b/,
  calido: /\b(short|shorts|bermuda|lino|sandalias?|crop|manga corta|sin mangas|tiras|tirantes|strapless|halter|off shoulder|hombros? descubiertos?|fresc[oa]|player[oa]|kimono|caftan|pareo|mini|minifalda|tank|esqueleto|camisilla|chancletas?|alpargatas?|crochet|calad[oa]|gasa|viscosa)\b/,
  dia: /\b(lino|algodon|denim|jean|jeans|camiseta|short|shorts|tenis|sneakers?|casual|flores|floral|estampad[oa]|overol|enterizo de jean|camisa|polo|guayabera|sandalias?|alpargatas?|bermuda)\b/,
  noche: /\b(lentejuelas?|brillos?|brillante|satin|saten|seda|terciopelo|encaje|fiesta|gala|coctel|cocktail|noche|metalizad[oa]|metalic[oa]|escarchad[oa]|glitter|corse|corset|corsé|strapless|tacon|tacones|plataformas?|largo de fiesta|lame|perlas?|cristales|pedreria|plumas?|negro largo)\b/,
  fiesta: /\b(lentejuelas?|brillos?|brillante|satin|saten|fiesta|gala|coctel|cocktail|metalizad[oa]|metalic[oa]|escarchad[oa]|glitter|corse|corset|plumas?|pedreria|cristales|lame|tacon|tacones|flecos)\b/,
  elegante: /\b(blazer|sastre|sastrer[oa]|satin|saten|seda|plisad[oa]|traje|palazzo|crepe|gabardina|trench|tacon|tacones|mocasin(es)?|perlas?|vestido midi|midi|elegante|formal|chaleco sastre|camisa de seda|pantalon de vestir|lino premium|cuello bebe)\b/,
  comoda: /\b(jogger|sudadera|buzo|hoodie|legging|leggins?|camiseta|tenis|sneakers?|oversize|basic[oa]|elastic[oa]|algodon|punto|pijama|ancho|wide leg|culotte|overol|enterizo|holgad[oa]|relajad[oa]|comod[oa]|suave|lounge|short|shorts|bermuda|sandalias?|chancletas?)\b/,
  viaje: /\b(viaje|travel|lino|kimono|maxi|jogger|conjunto|set|overol|enterizo|sandalias?|sombrero|gafas|bolso grande|tote|mochila|chaqueta ligera|cortavientos|impermeable|rompevientos|caftan|pareo)\b/,
  oficina: /\b(blazer|sastre|sastrer[oa]|camisa|pantalon de vestir|palazzo|recto|falda midi|falda lapiz|lapiz|chaleco|mocasin(es)?|traje|cuello camisero|ejecutiv[oa]|oficina|formal|gabardina|trench|crepe|cardigan)\b/,
  playa: /\b(playa|player[oa]|pareo|kimono|caftan|salida de bano|crochet|tiras|sandalias?|chancletas?|sombrero|short|shorts|calad[oa]|gasa|resort|bermuda)\b/,
  deporte: /\b(deportiv[oa]|sport|active|activewear|legging|leggins?|top deportivo|tenis|sneakers?|jogger|sudadera|running|yoga|gym|entrenamiento|ciclista|biker|licra|lycra)\b/,
  cita: /\b(encaje|satin|saten|seda|corse|corset|escote|strapless|halter|vestido corto|mini|ajustad[oa]|bodycon|transparencia|transparente|rojo|tacon|tacones|romantic[oa]|lazo|mono)\b/,
};

// Lo que dice el tipo de prenda, aunque el nombre no lo diga.
const POR_TIPO: Partial<Record<string, Estilo[]>> = {
  abrigo: ["frio"],
  chaqueta: ["frio"],
  blazer: ["oficina", "elegante"],
  saco: ["frio"],
  buzo: ["frio", "comoda"],
  sueter: ["frio"],
  cardigan: ["frio"],
  bota: ["frio"],
  botin: ["frio"],
  short: ["calido", "dia", "comoda"],
  bermuda: ["calido", "dia"],
  sandalia: ["calido", "dia"],
  camiseta: ["dia", "comoda"],
  jean: ["dia", "comoda"],
  tenis: ["dia", "comoda", "deporte"],
  legging: ["comoda", "deporte"],
  jogger: ["comoda", "deporte"],
  tacon: ["noche", "elegante"],
};

/** Las etiquetas de estilo de una prenda, por su nombre y su tipo. */
export function estilosDe(titulo: string, tipo?: string | null): Estilo[] {
  const texto = sinTildes(`${titulo} ${tipo ?? ""}`);
  const salida = new Set<Estilo>();
  for (const e of ESTILOS) if (PALABRAS[e].test(texto)) salida.add(e);
  const t = tipo ? sinTildes(tipo).trim() : "";
  for (const e of POR_TIPO[t] ?? []) salida.add(e);
  // Las de frío no son de playa aunque digan "tiras" o "sandalia" de paso.
  if (salida.has("frio") && /\b(abrigo|chaqueta|saco|sueter|lana|gabardina|parka)\b/.test(texto)) {
    salida.delete("calido");
    salida.delete("playa");
  }
  // La pijama es para estar en casa: ni playa, ni viaje, ni salir.
  if (/\bpijama\b/.test(texto)) return ["comoda"];
  return Array.from(salida);
}

/**
 * ¿Sirve la prenda con los estilos escogidos? Dentro de un grupo vale
 * cualquiera; entre grupos, todos. Sin estilos escogidos, todas sirven.
 */
export function cumpleEstilos(estilosDeLaPrenda: Estilo[], escogidos: Estilo[]): boolean {
  if (escogidos.length === 0) return true;
  const porGrupo = new Map<GrupoEstilo, Estilo[]>();
  for (const e of escogidos) {
    const g = GRUPO_DE[e];
    if (!g) continue;
    porGrupo.set(g, [...(porGrupo.get(g) ?? []), e]);
  }
  for (const lista of Array.from(porGrupo.values())) {
    if (!lista.some((e) => estilosDeLaPrenda.includes(e))) return false;
  }
  return true;
}

/** Limpia lo que llega en la URL: solo estilos que existen. */
export function estilosValidos(lista: string[]): Estilo[] {
  return lista.filter((x): x is Estilo => (ESTILOS as string[]).includes(x));
}
