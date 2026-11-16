// =====================================================================
// La forma de la prenda, en las palabras de las tiendas
// =====================================================================
// La foto se describe con su forma (corte, largo, escote, manga: ver
// lib/garment-ai.ts), pero cada tienda la escribe a su manera: lo que
// la descripción llama "línea A" una tienda lo titula "evasé", "wide
// leg" es "palazzo" o "bota ancha", "entallado" es "ajustado". Y antes
// la forma solo sumaba si la frase coincidía tal cual: una forma
// contraria no restaba, así que una falda maxi traía faldas mini.
//
// Aquí cada aspecto de la forma (la pierna, la silueta, el largo, la
// manga, el escote, el tiro, el ajuste) tiene sus familias, y cada
// familia las palabras con que las tiendas la escriben. Al comparar:
//   - la misma familia en el título suma mucho,
//   - una familia DISTINTA del mismo aspecto (mini contra maxi, skinny
//     contra wide leg) resta, para que esa prenda quede al final,
//   - si el título no dice nada de ese aspecto, ni suma ni resta.
// (Noviembre de 2026, a pedido de Juliana: "más precisa en la forma".)
// =====================================================================

type Familia = {
  nombre: string;
  // Sin tildes y en minúscula, como queda el texto normalizado.
  palabras: string[];
  // Cómo se le pregunta al buscador de la tienda (ver consultaDeForma).
  // Sin esto, la familia solo sirve para ordenar.
  buscar?: string;
};

type Aspecto = {
  nombre: string;
  // A qué tipos de prenda aplica (sin tildes).
  tipos: string[];
  familias: Familia[];
  // Si una familia distinta en el título resta. Los detalles que se
  // pueden combinar (abullonada, plisada) solo suman.
  excluyentes: boolean;
};

const ABAJO_LARGOS = ["pantalon", "jean"];
const VESTIDOS_Y_FALDAS = ["vestido", "falda", "enterizo"];
const ARRIBA = ["blusa", "camisa", "camiseta", "top", "body", "buzo", "sueter", "cardigan", "chaqueta", "blazer", "abrigo", "chaleco"];
const CON_MANGA = ["vestido", "enterizo", "blusa", "camisa", "camiseta", "top", "body", "buzo", "sueter", "cardigan", "chaqueta", "blazer", "abrigo"];
const CON_ESCOTE = ["vestido", "enterizo", "blusa", "camisa", "camiseta", "top", "body", "sueter"];

const ASPECTOS: Aspecto[] = [
  {
    nombre: "pierna",
    tipos: ABAJO_LARGOS,
    excluyentes: true,
    familias: [
      { nombre: "ancha", buscar: "wide leg", palabras: ["wide leg", "bota ancha", "palazzo", "culotte", "baggy", "balloon", "amplio", "amplia", "pierna ancha"] },
      { nombre: "ajustada", buscar: "skinny", palabras: ["skinny", "pitillo", "jegging", "jeggings", "slim", "ajustado", "ajustada", "entubado", "bota skinny"] },
      { nombre: "recta", buscar: "recto", palabras: ["recto", "recta", "straight", "bota recta"] },
      { nombre: "acampanada", buscar: "flare", palabras: ["acampanado", "acampanada", "flare", "bota campana", "campana", "oxford", "bootcut"] },
    ],
  },
  {
    nombre: "silueta",
    tipos: VESTIDOS_Y_FALDAS,
    excluyentes: true,
    familias: [
      { nombre: "evase", buscar: "evase", palabras: ["linea a", "evase", "acampanado", "acampanada", "con vuelo", "vuelo", "circular", "skater"] },
      { nombre: "ajustada", buscar: "ajustado", palabras: ["ajustado", "ajustada", "entallado", "entallada", "cenido", "cenida", "bodycon", "tubo", "lapiz", "pencil", "slim", "corset", "corse"] },
      { nombre: "recta", palabras: ["recto", "recta", "holgado", "holgada", "suelto", "suelta", "camisero"] },
    ],
  },
  {
    nombre: "ajuste",
    tipos: ARRIBA,
    excluyentes: true,
    familias: [
      { nombre: "holgado", buscar: "oversize", palabras: ["oversize", "oversized", "holgado", "holgada", "relaxed", "boxy", "amplio", "amplia", "suelto", "suelta"] },
      { nombre: "ajustado", buscar: "ajustado", palabras: ["ajustado", "ajustada", "entallado", "entallada", "slim", "cenido", "cenida", "bodycon"] },
    ],
  },
  {
    nombre: "largo",
    tipos: VESTIDOS_Y_FALDAS,
    excluyentes: true,
    familias: [
      { nombre: "mini", buscar: "corto", palabras: ["mini", "corto", "corta", "cortos", "cortas"] },
      { nombre: "midi", buscar: "midi", palabras: ["midi", "a la rodilla", "rodilla"] },
      { nombre: "maxi", buscar: "largo", palabras: ["maxi", "largo", "larga", "largos", "largas", "long"] },
    ],
  },
  {
    nombre: "manga",
    tipos: CON_MANGA,
    excluyentes: true,
    familias: [
      { nombre: "sin", palabras: ["sin mangas", "sin manga", "manga sisa", "sisa", "tiras", "tirantes", "strapless", "straple", "halter", "esqueleto"] },
      { nombre: "corta", palabras: ["manga corta", "mangas cortas"] },
      { nombre: "tres cuartos", palabras: ["manga 3/4", "3/4", "manga tres cuartos", "tres cuartos"] },
      { nombre: "larga", palabras: ["manga larga", "mangas largas"] },
    ],
  },
  {
    nombre: "forma de la manga",
    tipos: CON_MANGA,
    excluyentes: false,
    familias: [
      { nombre: "abullonada", palabras: ["abullonada", "abullonadas", "globo", "farol", "bombacha", "puff", "voluminosa", "volumen"] },
      { nombre: "acampanada", palabras: ["manga acampanada", "mangas acampanadas", "manga campana", "kimono"] },
    ],
  },
  {
    nombre: "escote",
    tipos: CON_ESCOTE,
    excluyentes: true,
    familias: [
      { nombre: "v", palabras: ["en v", "cuello v", "escote v", "cuello en v", "escote en v", "cruzado", "cruzada", "wrap"] },
      { nombre: "redondo", palabras: ["cuello redondo", "escote redondo", "redondo"] },
      { nombre: "alto", palabras: ["cuello alto", "tortuga", "cuello tortuga", "mock neck", "perkins"] },
      { nombre: "strapless", palabras: ["strapless", "straple", "palabra de honor", "sin tiras"] },
      { nombre: "halter", palabras: ["halter", "al cuello"] },
      { nombre: "cuadrado", palabras: ["cuadrado", "escote cuadrado"] },
      { nombre: "hombros", palabras: ["barco", "hombros descubiertos", "hombro descubierto", "off shoulder", "bardot"] },
      { nombre: "un hombro", palabras: ["un hombro", "one shoulder", "asimetrico", "asimetrica"] },
    ],
  },
  {
    nombre: "tiro",
    tipos: [...ABAJO_LARGOS, "falda", "short"],
    excluyentes: true,
    familias: [
      { nombre: "alto", palabras: ["tiro alto", "high rise", "high waist", "cintura alta", "talle alto"] },
      { nombre: "medio", palabras: ["tiro medio", "mid rise", "tiro regular"] },
      { nombre: "bajo", palabras: ["tiro bajo", "low rise", "descaderado", "descaderada"] },
    ],
  },
  {
    nombre: "pliegues",
    tipos: [...VESTIDOS_Y_FALDAS, ...ABAJO_LARGOS],
    excluyentes: false,
    familias: [{ nombre: "plisada", buscar: "plisada", palabras: ["plisado", "plisada", "plisados", "plisadas", "plises"] }],
  },
];

const sinTildes = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ");
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patrones = new Map<string, RegExp>();
function dice(texto: string, palabra: string): boolean {
  let re = patrones.get(palabra);
  if (!re) {
    re = new RegExp(`(^|[^a-z0-9])${escapar(palabra)}([^a-z0-9]|$)`);
    patrones.set(palabra, re);
  }
  return re.test(texto);
}

// "Vestido manga larga" no es un vestido largo, ni "manga corta" uno
// corto: para el largo se mira el texto sin lo que habla de la manga.
const QUE_HABLA_DE_LA_MANGA = /\bmangas? (larga|largas|corta|cortas)\b|\btiras? (larga|largas|corta|cortas)\b/g;

function familiasEn(texto: string, aspecto: Aspecto): Set<string> {
  const t = aspecto.nombre === "largo" ? texto.replace(QUE_HABLA_DE_LA_MANGA, " ") : texto;
  const halladas = new Set<string>();
  for (const f of aspecto.familias) if (f.palabras.some((p) => dice(t, p))) halladas.add(f.nombre);
  return halladas;
}

const aspectosDe = (tipo: string) => ASPECTOS.filter((a) => a.tipos.includes(sinTildes(tipo).trim()));

/** La forma pedida: por cada aspecto, las familias que dicen los rasgos. */
export type FormaPedida = Array<{ aspecto: Aspecto; familias: Set<string> }>;

export function formaPedida(tipo: string, rasgos: string[]): FormaPedida {
  const texto = sinTildes(rasgos.join(" | "));
  return aspectosDe(tipo)
    .map((aspecto) => ({ aspecto, familias: familiasEn(texto, aspecto) }))
    .filter((x) => x.familias.size > 0);
}

// Cuánto pesa la forma frente a lo demás (el título suma 2 y cada rasgo
// hasta 3): coincidir en la forma pesa más que un detalle, y una forma
// contraria baja la prenda por debajo de las que no dicen nada.
const SUMA_TITULO = 4;
const SUMA_META = 2;
const RESTA = 6;

/**
 * Puntos por la forma: título y clasificación de la tienda (ya
 * normalizados). La descripción no cuenta: ahí aparecen otras prendas.
 */
export function puntosDeForma(pedida: FormaPedida, tituloN: string, metaN: string): number {
  let puntos = 0;
  const titulo = sinTildes(tituloN);
  const meta = sinTildes(metaN);
  for (const { aspecto, familias } of pedida) {
    const enTitulo = familiasEn(titulo, aspecto);
    if ([...enTitulo].some((f) => familias.has(f))) {
      puntos += SUMA_TITULO;
    } else if (aspecto.excluyentes && enTitulo.size > 0) {
      puntos -= RESTA;
    } else if ([...familiasEn(meta, aspecto)].some((f) => familias.has(f))) {
      puntos += SUMA_META;
    }
  }
  return puntos;
}

/**
 * La palabra de forma con que se le pregunta a la tienda, además del
 * tipo y el color: el buscador de cada tienda devuelve pocas prendas
 * (10 en Shopify), y si solo se pregunta "pantalón negro" un wide leg
 * puede no estar entre ellas. Se escoge lo que más cambia la prenda.
 */
export function consultaDeForma(pedida: FormaPedida): string | null {
  const orden = ["pierna", "silueta", "pliegues", "largo", "ajuste"];
  for (const nombre of orden) {
    const x = pedida.find((p) => p.aspecto.nombre === nombre);
    if (!x) continue;
    const familia = x.aspecto.familias.find((f) => x.familias.has(f.nombre) && f.buscar);
    if (familia?.buscar) return familia.buscar;
  }
  return null;
}
