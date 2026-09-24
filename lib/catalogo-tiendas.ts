// =====================================================================
// Búsqueda dentro del catálogo propio de las tiendas
// =====================================================================
// Hasta ahora los resultados eran enlaces a Google: la usuaria veía el
// nombre de la prenda y tenía que salir de la página para ver una foto.
// Varias de las tiendas de la lista publican su catálogo completo en
// una dirección abierta que su propia plataforma sirve —Shopify en
// `tienda.com/products.json`, VTEX en `/api/catalog_system/...`— con
// título, precio, foto y enlace.
//
// Eso nos deja mostrar productos REALES con imagen, sin raspar nada ni
// pagar una API de terceros: es el mismo archivo que la tienda expone
// para que se la pueda integrar.
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
// ("Vestido Corto Floral Camel"), Especia lo deja en la descripción
// ("estampado en tonos rojos") y el largo en las etiquetas ("vestido
// midi"). Buscar solo en el título —como se hacía antes— dejaba a casi
// todos los productos empatados en cero y el orden salía al azar.
type Indexado = ProductoTienda & {
  titulo_n: string;
  // product_type, tags, categorías: lo que la tienda usa para clasificar.
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

// ---------------------------------------------------------------------
// Caché en memoria
// ---------------------------------------------------------------------
// Los catálogos pesan entre 0.5 y 2.4 MB y tardan ~1.5s. Bajarlos en
// cada búsqueda sería lento y descortés con las tiendas. Se guardan por
// media hora; en Vercel el caché vive mientras viva la instancia, así
// que tras un arranque en frío se vuelve a bajar y ya.
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

async function catalogoShopify(t: TiendaShopify): Promise<Indexado[]> {
  const host = t.host ?? t.dominio;
  const res = await pedir(`https://${host}/products.json?limit=250`);
  if (!res.ok) throw new Error(`http ${res.status}`);
  const data = (await res.json()) as {
    products?: Array<{
      title?: string;
      handle?: string;
      product_type?: string;
      tags?: string[];
      body_html?: string;
      images?: Array<{ src?: string }>;
      variants?: Array<{ price?: string }>;
    }>;
  };

  return (data.products ?? [])
    .filter((p) => p.title && p.handle && p.images?.[0]?.src)
    // Esprit mezcla hombre y mujer en el mismo catálogo, y NO escribe
    // "hombre" en el título de sus prendas de hombre — solo marca las
    // de mujer con "para mujer" y deja las otras sin decir nada, así
    // que un filtro de palabras no las agarra. Sí tienen un código
    // interno que las delata: comprobado contra 250 productos, la
    // letra del código (ej. "912H012") es H en el 100% de las prendas
    // de hombre (0 de 55 decían "para mujer") y G o F en las de mujer.
    .filter((p) => {
      if (t.dominio !== "esprit.com.co") return true;
      const codigo = (p.tags ?? []).find((tag) => /^\d{3}[A-Z]\d{3}$/.test(tag));
      return codigo ? codigo[3] !== "H" : true;
    })
    .map((p) => {
      const precio = Number(p.variants?.[0]?.price);
      return {
        titulo: p.title!.trim(),
        precioCop: Number.isFinite(precio) && precio > 0 ? Math.round(precio) : null,
        imagen: p.images![0].src!,
        url: `https://${host}/products/${p.handle}`,
        tienda: t.nombre,
        dominio: t.dominio,
        titulo_n: normalizar(p.title!),
        meta_n: normalizar(`${p.product_type ?? ""} ${(p.tags ?? []).join(" ")}`),
        descripcion_n: normalizar(limpiarHtml(p.body_html ?? "")),
      };
    });
}

async function catalogoDe(t: Tienda): Promise<Indexado[]> {
  const guardado = cache.get(t.dominio);
  if (guardado && guardado.expira > Date.now()) return guardado.productos;
  try {
    const productos =
      t.plataforma === "shopify" ? await catalogoShopify(t) : [];
    cache.set(t.dominio, { productos, expira: Date.now() + CACHE_MS });
    return productos;
  } catch (e) {
    console.warn(`[catalogo] ${t.dominio} no respondió:`, e);
    // Se guarda el fallo un rato para no reintentar en cada búsqueda.
    cache.set(t.dominio, { productos: [], expira: Date.now() + 5 * 60 * 1000 });
    return [];
  }
}

/**
 * VTEX no publica el catálogo completo, pero sí responde búsquedas. Se
 * le pregunta directamente por tipo + color, que es lo que más pesa.
 */
async function buscarVtex(t: TiendaVtex, c: ConsultaPrenda): Promise<Indexado[]> {
  const host = t.host ?? t.dominio;
  const q = encodeURIComponent([c.tipo, c.color].filter(Boolean).join(" "));
  try {
    const res = await pedir(
      `https://${host}/api/catalog_system/pub/products/search?ft=${q}&_from=0&_to=19`
    );
    if (!res.ok) throw new Error(`http ${res.status}`);
    const data = (await res.json()) as Array<{
      productName?: string;
      linkText?: string;
      description?: string;
      categories?: string[];
      items?: Array<{
        images?: Array<{ imageUrl?: string }>;
        sellers?: Array<{ commertialOffer?: { Price?: number } }>;
      }>;
    }>;

    return (data ?? [])
      .filter((p) => p.productName && p.linkText && p.items?.[0]?.images?.[0]?.imageUrl)
      .map((p) => {
        const precio = p.items?.[0]?.sellers?.[0]?.commertialOffer?.Price;
        return {
          titulo: p.productName!.trim(),
          precioCop: typeof precio === "number" && precio > 0 ? Math.round(precio) : null,
          imagen: p.items![0].images![0].imageUrl!,
          url: `https://${host}/${p.linkText}/p`,
          tienda: t.nombre,
          dominio: t.dominio,
          titulo_n: normalizar(p.productName!),
          // El linkText trae el color al final ("...-614705-rojo"), así
          // que entra como metadato.
          meta_n: normalizar(`${(p.categories ?? []).join(" ")} ${p.linkText}`),
          descripcion_n: normalizar(limpiarHtml(p.description ?? "")),
        };
      });
  } catch (e) {
    console.warn(`[catalogo] ${t.dominio} (vtex) no respondió:`, e);
    return [];
  }
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
 * Busca en los catálogos las prendas que más se parecen.
 *
 * El tipo de prenda es obligatorio: un pantalón rojo no sirve para
 * "vestido rojo" por más que compartan el color. De ahí en adelante
 * suman el color (que pesa el doble que el resto, porque es lo primero
 * que la usuaria compara con el ojo) y los demás rasgos.
 */
export async function buscarEnCatalogos(
  c: ConsultaPrenda,
  maximo = 8
): Promise<ProductoTienda[]> {
  const tipo = normalizar(c.tipo).trim();
  if (!tipo) return [];

  const shopify = TIENDAS.filter((t): t is TiendaShopify => t.plataforma === "shopify");
  const vtex = TIENDAS.filter((t): t is TiendaVtex => t.plataforma === "vtex");

  const [catalogos, busquedas] = await Promise.all([
    Promise.all(shopify.map(catalogoDe)),
    Promise.all(vtex.map((t) => buscarVtex(t, c))),
  ]);

  const color = c.color ? normalizar(c.color).trim() : null;
  const rasgos = c.rasgos.map(frasesDe).filter((f) => f.length > 0);

  const puntuados: Array<{ p: Indexado; punto: number }> = [];
  for (const lote of [...catalogos, ...busquedas]) {
    for (const p of lote) {
      // El tipo tiene que estar en el título o en la clasificación de
      // la tienda; en la descripción no vale, porque ahí aparece
      // mencionado de pasada ("combínalo con un vestido").
      const enTitulo = p.titulo_n.includes(tipo) || p.titulo_n.includes(tipo + "s");
      const enMeta = p.meta_n.includes(tipo) || p.meta_n.includes(tipo + "s");
      if (!enTitulo && !enMeta) continue;

      // Casi todas las tiendas de la lista son solo de mujer, pero
      // algunas (Esprit, por ejemplo) mezclan las dos secciones en el
      // mismo catálogo — comprobado: "camisa" sin más trae camisas de
      // hombre igual que de mujer. Se descarta cualquier prenda que
      // mencione ropa de hombre o de niños, en cualquiera de los tres
      // campos, para no sugerirle a nadie algo que no es de su talla.
      if (ES_DE_HOMBRE_O_NINO.test(p.titulo_n + " " + p.meta_n + " " + p.descripcion_n)) {
        continue;
      }

      let punto = enTitulo ? 2 : 1;
      // El color vale doble: es lo que más se nota al comparar fotos.
      if (color) punto += pesoDe(p, color) * 2;
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
    // Algunos catálogos repiten el mismo producto (una entrada por
    // color, por ejemplo). Se muestra una sola vez.
    if (yaVistos.has(p.url)) continue;
    yaVistos.add(p.url);
    const n = porTienda.get(p.dominio) ?? 0;
    if (n >= 3) continue;
    porTienda.set(p.dominio, n + 1);
    const { titulo_n, meta_n, descripcion_n, ...limpio } = p;
    salida.push(limpio);
    if (salida.length >= maximo) break;
  }
  return salida;
}
