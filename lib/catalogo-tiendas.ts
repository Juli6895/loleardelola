// =====================================================================
// Búsqueda dentro del catálogo propio de las tiendas
// =====================================================================
// Hasta ahora los resultados eran enlaces a Google: la usuaria veía el
// nombre de la prenda y tenía que salir de la página para ver una foto.
// Varias de las tiendas de la lista tienen un buscador abierto que su
// propia plataforma sirve —Shopify en `tienda.com/search/suggest.json`,
// VTEX en `/api/catalog_system/...`— con título, precio, foto y enlace.
// Es el mismo buscador que usa la caja de búsqueda de su página.
//
// Eso nos deja mostrar productos REALES con imagen, sin raspar nada ni
// pagar una API de terceros.
//
// Lo que NO cubre: Zara, H&M, Mango, Koaj, Arturo Calle, Bimba y Lola,
// American Eagle y Rapsodia no publican nada equivalente. Para esas
// seguimos mandando a Google. Por eso esto se muestra debajo, como
// complemento, y no reemplaza la búsqueda.
// =====================================================================

export type ProductoTienda = {
  titulo: string;
  precioCop: number | null;
  imagen: string | null;
  url: string;
  tienda: string;
  dominio: string;
};

// Lo que se busca, ya desglosado. Llega así y no como una frase suelta
// porque el color pesa mucho más que los demás rasgos al decidir si dos
// prendas se parecen — una usuaria que buscó un vestido rojo no quiere
// ver uno verde de primero por más que los dos sean midi y florales.
export type ConsultaPrenda = {
  // Tipo de prenda. Obligatorio: sin esto no hay parecido que valga.
  tipo: string;
  color: string | null;
  // Largo, corte, escote, manga, tela, estampado... en frases sueltas.
  rasgos: string[];
};

type TiendaShopify = {
  plataforma: "shopify";
  dominio: string;
  nombre: string;
  host?: string;
};
type TiendaVtex = {
  plataforma: "vtex";
  dominio: string;
  nombre: string;
  host?: string;
};
type Tienda = TiendaShopify | TiendaVtex;

// Verificadas una por una: responden con catálogo de verdad.
const TIENDAS: Tienda[] = [
  { plataforma: "shopify", dominio: "especia.com.co", nombre: "Especia" },
  { plataforma: "shopify", dominio: "julianasanchez.co", nombre: "Juliana Sánchez" },
  { plataforma: "shopify", dominio: "inmaculadavj.com", nombre: "Inmaculada VJ" },
  { plataforma: "shopify", dominio: "gracies.com.co", nombre: "Gracies" },
  { plataforma: "shopify", dominio: "bybla.com.co", nombre: "Bybla" },
  { plataforma: "shopify", dominio: "navissi.com", nombre: "Navissi" },
  { plataforma: "shopify", dominio: "jeansandblouses.com", nombre: "Jeans and Blouses" },
  { plataforma: "shopify", dominio: "esprit.com.co", nombre: "Esprit" },
  { plataforma: "shopify", dominio: "ticketstores.co", nombre: "Ticket Stores" },
  // Malva (co.malvaonline.com) se quitó a pedido de Juliana: sus precios
  // quedan muy por encima de lo que quiere sugerir en el manual.
  // VTEX no entrega el catálogo entero: se le pregunta por término. Por
  // eso va por otro camino, sin caché de catálogo.
  { plataforma: "vtex", dominio: "colorblue.com", nombre: "Color Blue" },
];

// Palabras que no ayudan a distinguir una prenda de otra.
const IGNORADAS = new Set([
  "mujer", "hombre", "niño", "niña", "de", "la", "el", "los", "las",
  "con", "sin", "y", "para", "talla", "una", "un", "muy", "tipo",
]);

// Sin tildes porque se aplica sobre texto ya normalizado. \b exige que
// sea la palabra completa: así "hombre" no descarta nada que solo
// contenga esas letras por casualidad.
const ES_DE_HOMBRE_O_NINO =
  /\b(hombre|masculino|caballero|men|nino|nina|infantil|kids|bebe)\b/;

/** Minúsculas y sin tildes, para que "satén" empareje con "saten". */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function limpiarHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}


// ---------------------------------------------------------------------
// Dónde buscar cada palabra, y cuánto vale encontrarla ahí
// ---------------------------------------------------------------------
// Las tiendas no escriben igual: Bybla pone el color en el título
// ("Vestido Corto Floral Camel"), Especia lo deja en la descripción y el
// largo en las etiquetas. Por eso se busca en los tres lados, con pesos
// distintos.
type Indexado = ProductoTienda & {
  titulo_n: string;
  // product_type (Shopify) o categorías (VTEX): cómo la tienda clasifica
  // la prenda. Aparte de los tags porque los tags son ruidosos ("top
  // ventas", "outlet") y no sirven para decidir QUÉ es la prenda.
  clase_n: string;
  // clase + tags.
  meta_n: string;
  descripcion_n: string;
};

const PESO = { titulo: 3, meta: 2, descripcion: 1 };

/** Dónde aparece la frase, y cuánto vale. 0 si no está en ningún lado. */
function pesoDe(p: Indexado, frase: string): number {
  if (p.titulo_n.includes(frase)) return PESO.titulo;
  if (p.meta_n.includes(frase)) return PESO.meta;
  if (p.descripcion_n.includes(frase)) return PESO.descripcion;
  return 0;
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------------------------------------------------------------------
// Colores
// ---------------------------------------------------------------------
// Tres cosas hacían que un color no se encontrara aunque la tienda sí lo
// tuviera — comprobado con prendas reales del clóset de Juliana:
//
// 1. Género: la IA pedía "blanco" y la tienda escribe "Blusa Blanca".
// 2. Matices: la IA pedía "blanco roto" o "verde musgo", que casi
//    ninguna tienda usa; ellas dicen "Marfil", "Crudo", "Oliva".
// 3. Idioma: Especia escribe "white" y "ecru".
//
// Por eso se compara por FAMILIA de color, y cada palabra acepta su
// masculino, femenino y plural. El primer nombre de cada familia es el
// que usa la IA (ver COLORES_BUSCABLES); los demás son cómo lo escriben
// las tiendas.
const FAMILIAS_DE_COLOR: string[][] = [
  ["blanco", "white"],
  ["marfil", "blanco roto", "crudo", "hueso", "ecru", "off white", "ivory"],
  ["negro", "black"],
  ["gris", "gris carbon", "gris oscuro", "gris claro", "gray", "grey"],
  ["beige", "arena", "nude"],
  ["crema", "cream"],
  ["camel"],
  ["cafe", "marron", "chocolate", "brown"],
  // Pedir "azul" a secas acepta cualquier azul: el título "Azul Oscuro"
  // también empieza por "azul". Pedir un azul puntual no acepta otro.
  ["azul", "blue"],
  ["azul medio"],
  ["azul oscuro", "azul marino", "navy"],
  ["azul claro", "celeste"],
  ["verde", "green"],
  ["verde oliva", "oliva", "verde militar", "militar", "verde musgo"],
  ["vinotinto", "vino", "borgona", "burdeos", "wine"],
  // "red" no va: en español es la red de malla, y aparece en títulos.
  ["rojo"],
  ["rosa", "rosado", "pink"],
  ["rosa palo", "palo de rosa", "rosa empolvado", "rosa viejo", "blush"],
  ["fucsia"],
  ["lila", "lavanda"],
  ["morado", "violeta", "purple"],
  ["amarillo", "yellow"],
  ["mostaza"],
  ["naranja", "orange"],
  ["terracota", "ladrillo", "oxido"],
  ["coral"],
  ["dorado", "oro", "gold"],
  ["plateado", "plata", "silver"],
  // No es un color que se pida: está para reconocer que una prenda NO es
  // de un solo color cuando se pidió uno.
  ["multicolor", "bicolor", "tricolor", "estampado", "print", "animal print", "leopardo", "cebra"],
];

/**
 * Los colores que la IA puede pedir. Son los primeros de cada familia,
 * escritos como se leen en pantalla — con tilde donde va.
 */
export const COLORES_BUSCABLES = [
  "blanco", "marfil", "negro", "gris", "beige", "crema", "camel", "café",
  "azul", "azul oscuro", "azul claro", "verde", "verde oliva", "vinotinto",
  "rojo", "rosa", "rosa palo", "fucsia", "lila", "morado", "amarillo",
  "mostaza", "naranja", "terracota", "coral", "dorado", "plateado",
];

/** Una palabra, aceptando masculino, femenino y plural. */
function patronPalabra(w: string): string {
  if (w.length > 3 && /[oa]$/.test(w)) return `${escapar(w.slice(0, -1))}[oa]s?`;
  return `${escapar(w)}(?:s|es)?`;
}

function patronTermino(termino: string): RegExp {
  const palabras = termino.split(/\s+/).filter(Boolean).map(patronPalabra);
  return new RegExp(`\\b${palabras.join("\\s+")}\\b`);
}

const PATRONES_DE_FAMILIA = FAMILIAS_DE_COLOR.map((f) => f.map(patronTermino));

/**
 * A qué familia pertenece el color pedido. Si no está tal cual, se van
 * quitando palabras del final: "verde salvia" cae en "verde" y "mostaza
 * envejecida" en "mostaza". Si ni así, el color queda solo.
 */
function familiaDe(color: string): number | null {
  let palabras = color.split(/\s+/).filter(Boolean);
  while (palabras.length > 0) {
    const t = palabras.join(" ");
    const i = FAMILIAS_DE_COLOR.findIndex((f) => f.includes(t));
    if (i >= 0) return i;
    palabras = palabras.slice(0, -1);
  }
  return null;
}

/**
 * El color PRINCIPAL que nombra un título: el primero que aparece.
 * "Sandalias Chocolate con Dorado" es chocolate con un detalle dorado,
 * no una sandalia dorada. Devuelve las familias que empiezan en esa
 * misma posición ("Rosa Palo" es rosa y rosa palo a la vez), o null si
 * el título no nombra ningún color.
 *
 * Esprit y Juliana Sánchez ponen el color de la variante después de un
 * guion ("Blazer Azul Oscuro con Forro - Negro"): si ese final nombra un
 * color, manda sobre el resto del título.
 */
function coloresPrincipales(titulo: string, ignorarEstampado = false): Set<number> | null {
  const guion = titulo.lastIndexOf(" - ");
  if (guion >= 0) {
    const final = coloresPrincipales(titulo.slice(guion + 3), ignorarEstampado);
    if (final) return final;
    titulo = titulo.slice(0, guion);
  }
  let primera = Infinity;
  const posiciones = PATRONES_DE_FAMILIA.map((patrones, i) =>
    ignorarEstampado && i === FAMILIA_ESTAMPADO
      ? Infinity
      : Math.min(...patrones.map((re) => titulo.search(re)).filter((i) => i >= 0))
  );
  for (const pos of posiciones) primera = Math.min(primera, pos);
  if (primera === Infinity) return null;
  const s = new Set<number>();
  posiciones.forEach((pos, i) => {
    if (pos === primera) s.add(i);
  });
  return s;
}

/**
 * ¿Esta prenda es del color pedido?
 *
 * Manda el título: si su color principal es otro ("Tenis Marfil con
 * Café" cuando se pidió blanco) se descarta, aunque una etiqueta interna
 * diga "blanco". Solo si el título no nombra ningún color se mira la
 * clasificación y las etiquetas. La descripción no cuenta nunca: ahí
 * aparece el color de OTRAS prendas ("combínala con una blusa camel").
 */
function esDelColor(
  p: Indexado,
  color: string,
  estampado: RegExp | null,
  estampadoConcreto: boolean
): boolean {
  const fam = familiaDe(color);
  if (fam === null) {
    const re = patronTermino(color);
    return re.test(p.titulo_n) || re.test(p.meta_n);
  }
  // Si se busca una prenda estampada ("falda roja de cuadros"), que el
  // título diga "Estampada" no le quita el color: se mira el color que
  // nombra aparte del estampado.
  const principales = coloresPrincipales(p.titulo_n, !!estampado);
  if (principales) return principales.has(fam);
  if (PATRONES_DE_FAMILIA[fam].some((re) => re.test(p.meta_n))) return true;
  // El título no nombra color, pero sí el mismo estampado concreto
  // ("Falda Midi Cuadros" para una falda roja de cuadros): el estampado
  // es lo que más se ve, así que es la más parecida que hay. "Estampado"
  // a secas no alcanza: ahí cualquier estampado pasaría.
  return estampadoConcreto && !!estampado && estampado.test(p.titulo_n);
}

// ---------------------------------------------------------------------
// Estampados
// ---------------------------------------------------------------------
// Un estampado no es un color: "falda de cuadros" se busca por el
// estampado, y su color (si lo hay) es el del fondo.
const FAMILIA_ESTAMPADO = FAMILIAS_DE_COLOR.findIndex((f) => f[0] === "multicolor");

const ESTAMPADOS = [
  "cuadros", "rayas", "lunares", "floral", "flores", "estampado", "animal print",
  "leopardo", "cebra", "tie dye", "geometrico", "pata de gallo", "escoces",
  "tropical", "cachemir", "paisley", "tartan",
];

/** El estampado de los rasgos pedidos, si hay alguno: el que va a la búsqueda. */
function estampadoDe(rasgos: string[]): string | null {
  for (const r of rasgos) {
    const n = normalizar(r);
    const e = ESTAMPADOS.find((x) => patronTermino(x).test(n));
    if (e) return e;
  }
  return null;
}

/** Cómo se le pregunta el color al buscador de la tienda. */
function colorParaBuscar(color: string): string {
  const fam = familiaDe(color);
  return fam === null ? color : FAMILIAS_DE_COLOR[fam][0];
}

// ---------------------------------------------------------------------
// Tipos de prenda
// ---------------------------------------------------------------------
/** Los tipos que la IA puede pedir: los nombres con que las tiendas titulan. */
export const TIPOS_BUSCABLES = [
  "blusa", "camisa", "camiseta", "top", "body", "buzo", "suéter", "cárdigan",
  "chaqueta", "blazer", "abrigo", "chaleco", "pantalón", "jean", "falda",
  "short", "vestido", "enterizo", "tenis", "sandalia", "zapato", "bota",
  "bolso", "cinturón", "aretes", "collar", "pulsera",
];

// Cómo más titulan las tiendas el mismo tipo. Gracies dice "Sweater".
const SINONIMOS_DE_TIPO: Record<string, string[]> = {
  sueter: ["sweater", "saco"],
  tenis: ["sneaker", "zapatilla"],
  bolso: ["cartera"],
  aretes: ["candongas", "topos"],
  jean: ["jeans"],
};

function tiposDe(tipo: string): string[] {
  return [tipo, ...(SINONIMOS_DE_TIPO[tipo] ?? [])];
}

/** El tipo y su singular o plural, para no perder "Sandalia" pidiendo "sandalias". */
function basesDe(tipo: string): string[] {
  const b = new Set([tipo]);
  if (tipo.length > 4 && tipo.endsWith("es")) b.add(tipo.slice(0, -2));
  if (tipo.length > 3 && tipo.endsWith("s")) b.add(tipo.slice(0, -1));
  return Array.from(b).map(escapar);
}

function patronesDeTipo(tipo: string): { inicio: RegExp; palabra: RegExp } {
  const alt = tiposDe(tipo).flatMap(basesDe).join("|");
  return {
    inicio: new RegExp(`^(?:${alt})(?:s|es)?\\b`),
    palabra: new RegExp(`\\b(?:${alt})(?:s|es)?\\b`),
  };
}

// ---------------------------------------------------------------------
// Caché en memoria
// ---------------------------------------------------------------------
// Por tienda y por consulta, media hora. En Vercel vive mientras viva la
// instancia; tras un arranque en frío se vuelve a preguntar y ya.
const CACHE_MS = 30 * 60 * 1000;
const cache = new Map<string, { productos: Indexado[]; expira: number }>();

async function pedir(url: string, ms = 9000): Promise<Response> {
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), ms);
  try {
    return await fetch(url, {
      signal: control.signal,
      headers: {
        "user-agent": "LoleardLola/1.0 (+https://loleardelola.vercel.app)",
      },
    });
  } finally {
    clearTimeout(corte);
  }
}

async function conCache(
  clave: string,
  buscar: () => Promise<Indexado[]>
): Promise<Indexado[]> {
  const guardado = cache.get(clave);
  if (guardado && guardado.expira > Date.now()) return guardado.productos;
  try {
    const productos = await buscar();
    cache.set(clave, { productos, expira: Date.now() + CACHE_MS });
    return productos;
  } catch (e) {
    console.warn(`[catalogo] ${clave} no respondió:`, e);
    // El fallo se guarda un minuto para no reintentar en cada prenda.
    cache.set(clave, { productos: [], expira: Date.now() + 60 * 1000 });
    return [];
  }
}

// ---------------------------------------------------------------------
// Shopify: el buscador de la propia tienda
// ---------------------------------------------------------------------
// Antes se bajaba `products.json`, que entrega de a 250 prendas. Sin
// paginar solo se veía la primera página: 250 de las 3.000 de Navissi,
// de las 2.233 de Esprit, de las 1.458 de Bybla. Por eso tantas
// combinaciones salían vacías. El buscador de la tienda (el mismo que
// usa la caja de búsqueda de su página) mira el catálogo COMPLETO y
// devuelve las 10 más relevantes, ya sin las agotadas.
async function buscarShopify(t: TiendaShopify, q: string): Promise<Indexado[]> {
  const host = t.host ?? t.dominio;
  return conCache(`${t.dominio}|${q}`, async () => {
    const res = await pedir(
      `https://${host}/search/suggest.json?q=${encodeURIComponent(q)}` +
        `&resources[type]=product&resources[limit]=10` +
        `&resources[options][unavailable_products]=hide`
    );
    if (!res.ok) throw new Error(`http ${res.status}`);
    const data = (await res.json()) as {
      resources?: {
        results?: {
          products?: Array<{
            title?: string;
            handle?: string;
            type?: string;
            tags?: string[];
            body?: string;
            price?: string;
            available?: boolean;
            image?: string;
            featured_image?: { url?: string };
          }>;
        };
      };
    };

    return (data.resources?.results?.products ?? [])
      .filter((p) => p.title && p.handle && (p.featured_image?.url || p.image))
      .filter((p) => p.available !== false)
      // Esprit mezcla hombre y mujer en el mismo catálogo, y NO escribe
      // "hombre" en el título de sus prendas de hombre. Sí tienen un
      // código interno que las delata: comprobado contra 250 productos,
      // la letra del código (ej. "912H012") es H en el 100% de las de
      // hombre y G o F en las de mujer.
      .filter((p) => {
        if (t.dominio !== "esprit.com.co") return true;
        const codigo = (p.tags ?? []).find((tag) => /^\d{3}[A-Z]\d{3}$/.test(tag));
        return codigo ? codigo[3] !== "H" : true;
      })
      .map((p) => {
        const precio = Number(p.price);
        const clase = p.type ?? "";
        return {
          titulo: p.title!.trim(),
          precioCop: Number.isFinite(precio) && precio > 0 ? Math.round(precio) : null,
          imagen: (p.featured_image?.url || p.image)!,
          url: `https://${host}/products/${p.handle}`,
          tienda: t.nombre,
          dominio: t.dominio,
          titulo_n: normalizar(p.title!),
          clase_n: normalizar(clase),
          meta_n: normalizar(`${clase} ${(p.tags ?? []).join(" ")}`),
          descripcion_n: normalizar(limpiarHtml(p.body ?? "")),
        };
      });
  });
}

// ---------------------------------------------------------------------
// VTEX: responde búsquedas por término
// ---------------------------------------------------------------------
async function buscarVtex(t: TiendaVtex, q: string): Promise<Indexado[]> {
  const host = t.host ?? t.dominio;
  return conCache(`${t.dominio}|${q}`, async () => {
    const res = await pedir(
      `https://${host}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(q)}&_from=0&_to=19`
    );
    if (!res.ok) throw new Error(`http ${res.status}`);
    const data = (await res.json()) as Array<{
      productName?: string;
      linkText?: string;
      description?: string;
      categories?: string[];
      items?: Array<{
        images?: Array<{ imageUrl?: string }>;
        sellers?: Array<{ commertialOffer?: { Price?: number; AvailableQuantity?: number } }>;
      }>;
    }>;

    return (data ?? [])
      .filter((p) => p.productName && p.linkText && p.items?.[0]?.images?.[0]?.imageUrl)
      .filter((p) => (p.items?.[0]?.sellers?.[0]?.commertialOffer?.AvailableQuantity ?? 1) > 0)
      .map((p) => {
        const precio = p.items?.[0]?.sellers?.[0]?.commertialOffer?.Price;
        const clase = (p.categories ?? []).join(" ");
        return {
          titulo: p.productName!.trim(),
          precioCop: typeof precio === "number" && precio > 0 ? Math.round(precio) : null,
          imagen: p.items![0].images![0].imageUrl!,
          url: `https://${host}/${p.linkText}/p`,
          tienda: t.nombre,
          dominio: t.dominio,
          titulo_n: normalizar(p.productName!),
          clase_n: normalizar(clase),
          // El linkText trae el color al final ("...-614705-rojo").
          meta_n: normalizar(`${clase} ${p.linkText}`),
          descripcion_n: normalizar(limpiarHtml(p.description ?? "")),
        };
      });
  });
}

/** Frases a buscar por cada rasgo, de la más precisa a la más suelta. */
function frasesDe(rasgo: string): string[] {
  const completa = normalizar(rasgo).trim();
  if (!completa) return [];
  const sueltas = completa
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 3 && !IGNORADAS.has(p));
  // La frase entera primero: "sin mangas" es mucho más preciso que
  // "mangas", que emparejaría con "manga larga" — lo contrario de lo
  // que se buscaba.
  return sueltas.length > 1 || sueltas[0] !== completa
    ? [completa, ...sueltas]
    : [completa];
}

/**
 * Qué se le pregunta al buscador de cada tienda. El color va con la
 * última vocal recortada ("blusa blanc"): el buscador de Shopify
 * completa la última palabra, así que trae "Blanca" y "Blanco" de una.
 * VTEX no completa, así que ahí van las dos formas enteras.
 */
function consultasPara(
  tipo: string,
  color: string | null,
  estampado: string | null
): { shopify: string[]; vtex: string[] } {
  const tipos = tiposDe(tipo);
  // El estampado va en su propia consulta: si solo se pregunta "falda",
  // la tienda devuelve sus 10 faldas más relevantes y las de cuadros
  // pueden no estar entre ellas.
  const conEstampado = estampado ? tipos.map((t) => `${t} ${estampado}`) : [];
  if (!color) {
    return { shopify: [...tipos, ...conEstampado], vtex: [...tipos, ...conEstampado] };
  }
  const c = colorParaBuscar(color);
  const recortado = /[oa]$/.test(c) && c.length > 3 ? c.slice(0, -1) : c;
  const formas = /o$/.test(c) ? [c, c.slice(0, -1) + "a"] : [c];
  return {
    shopify: [...tipos.map((t) => `${t} ${recortado}`), ...conEstampado],
    vtex: [...tipos.flatMap((t) => formas.map((f) => `${t} ${f}`)), ...conEstampado],
  };
}

/**
 * Busca en los catálogos las prendas que más se parecen.
 *
 * Dos cosas son obligatorias: el tipo (un pantalón rojo no sirve para
 * "vestido rojo") y, si se pidió, el color (un cárdigan rosa no sirve
 * para "cárdigan mostaza"). Lo que pasa esos dos filtros se ordena por
 * los demás rasgos.
 */
export async function buscarEnCatalogos(
  c: ConsultaPrenda,
  maximo = 8
): Promise<ProductoTienda[]> {
  const tipo = normalizar(c.tipo).trim();
  if (!tipo) return [];
  const estampado = estampadoDe([c.color ?? "", ...c.rasgos]);
  let color = c.color ? normalizar(c.color).trim() : null;
  // "Multicolor", "estampado", "cuadros" no son un color que se pueda
  // exigir en el título: esas prendas se buscan por el estampado.
  if (color && (familiaDe(color) === FAMILIA_ESTAMPADO || estampadoDe([color]))) color = null;

  const estampadoConcreto = !!estampado && estampado !== "estampado";
  const consultas = consultasPara(tipo, color, estampado);
  const lotes = await Promise.all(
    TIENDAS.flatMap((t) =>
      t.plataforma === "shopify"
        ? consultas.shopify.map((q) => buscarShopify(t, q))
        : consultas.vtex.map((q) => buscarVtex(t, q))
    )
  );

  const { inicio, palabra } = patronesDeTipo(tipo);
  const rasgos = c.rasgos.map(frasesDe).filter((f) => f.length > 0);

  const puntuados: Array<{ p: Indexado; punto: number }> = [];
  for (const lote of lotes) {
    for (const p of lote) {
      // El tipo tiene que ser lo que la prenda ES, no algo que menciona
      // de pasada: "Falda midi con cinturón" NO es un cinturón. Las
      // tiendas titulan empezando por la categoría ("Vestido corto...",
      // "Blusa de lino..."), así que vale al comienzo del título, o en
      // la clasificación que la tienda le puso.
      const enTitulo = inicio.test(p.titulo_n.trim());
      const enClase = palabra.test(p.clase_n);
      if (!enTitulo && !enClase) continue;

      // Un producto que se llama solo "Blusas" no es una prenda puntual
      // (Jeans and Blouses tiene uno así): no se puede saber qué es.
      if (!/\s/.test(p.titulo_n.trim())) continue;

      // Casi todas las tiendas son solo de mujer, pero algunas mezclan.
      // Se descarta cualquier prenda que mencione hombre o niños.
      if (ES_DE_HOMBRE_O_NINO.test(p.titulo_n + " " + p.meta_n + " " + p.descripcion_n)) {
        continue;
      }

      if (color && !esDelColor(p, color, estampado ? patronTermino(estampado) : null, estampadoConcreto)) continue;

      let punto = enTitulo ? 2 : 1;
      for (const frases of rasgos) {
        // De cada rasgo cuenta solo su mejor coincidencia, para que una
        // prenda no sume tres veces por decir "midi" en tres campos.
        let mejor = 0;
        for (let i = 0; i < frases.length; i++) {
          // La frase completa vale entero; las palabras sueltas, la
          // mitad, porque son una coincidencia más floja.
          const factor = i === 0 ? 1 : 0.5;
          mejor = Math.max(mejor, pesoDe(p, frases[i]) * factor);
        }
        punto += mejor;
      }
      puntuados.push({ p, punto });
    }
  }

  puntuados.sort((a, b) => b.punto - a.punto);

  // Máximo 3 por tienda, para que una no se lleve toda la fila.
  const porTienda = new Map<string, number>();
  const yaVistos = new Set<string>();
  const salida: ProductoTienda[] = [];
  for (const { p } of puntuados) {
    // La misma prenda puede llegar por dos consultas: se muestra una vez.
    if (yaVistos.has(p.url)) continue;
    yaVistos.add(p.url);
    const n = porTienda.get(p.dominio) ?? 0;
    if (n >= 3) continue;
    porTienda.set(p.dominio, n + 1);
    const { titulo_n, clase_n, meta_n, descripcion_n, ...limpio } = p;
    salida.push(limpio);
    if (salida.length >= maximo) break;
  }
  return salida;
}
