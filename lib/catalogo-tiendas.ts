// =====================================================================
// Búsqueda dentro del catálogo propio de las tiendas
// =====================================================================
// Hasta ahora los resultados eran enlaces a Google: la usuaria veía el
// nombre de la prenda y tenía que salir de la página para ver una foto.
// Varias de las tiendas de la lista publican su catálogo completo en una
// dirección abierta que la propia plataforma (Shopify) sirve —
// `tienda.com/products.json`— con título, precio, foto y enlace.
//
// Eso nos deja mostrar productos REALES con imagen, sin raspar nada ni
// pagar una API de terceros: es el mismo archivo que la tienda expone
// para que se la pueda integrar.
//
// Lo que NO cubre: Zara, H&M, Mango y demás marcas grandes no son
// Shopify y no publican nada equivalente. Para esas seguimos mandando a
// Google. Por eso esto se muestra como "también puedes ver", debajo, y
// no reemplaza la búsqueda.
// =====================================================================

export type ProductoTienda = {
  titulo: string;
  precioCop: number | null;
  imagen: string | null;
  url: string;
  tienda: string;
  dominio: string;
};

type TiendaConCatalogo = { dominio: string; nombre: string; host?: string };

// Solo tiendas verificadas: se comprobó que responden products.json.
// Si una deja de responder, se salta sin romper la búsqueda.
const TIENDAS: TiendaConCatalogo[] = [
  { dominio: "especia.com.co", nombre: "Especia" },
  { dominio: "julianasanchez.co", nombre: "Juliana Sánchez" },
  { dominio: "inmaculadavj.com", nombre: "Inmaculada VJ" },
  { dominio: "gracies.com.co", nombre: "Gracies" },
  { dominio: "bybla.com.co", nombre: "Bybla" },
  { dominio: "navissi.com", nombre: "Navissi" },
  { dominio: "jeansandblouses.com", nombre: "Jeans and Blouses" },
  // colorblue.com responde a /products.json pero devuelve HTML, no el
  // catálogo — no está en Shopify. Queda fuera para no gastar una
  // petición en cada búsqueda a algo que nunca va a servir.
];

// Palabras que no aportan nada al emparejar: el género lo agregamos
// nosotros al término de búsqueda para Google, y en el catálogo de una
// tienda de mujer aparecería en todo o en nada.
const IGNORADAS = new Set([
  "mujer",
  "hombre",
  "niño",
  "niña",
  "de",
  "la",
  "el",
  "con",
  "y",
  "para",
  "talla",
]);

/** Minúsculas y sin tildes, para que "satén" empareje con "saten". */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function palabras(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 2 && !IGNORADAS.has(p));
}

// ---------------------------------------------------------------------
// Caché en memoria
// ---------------------------------------------------------------------
// Los catálogos pesan entre 0.5 y 2.4 MB y tardan ~1.5s. Bajarlos en
// cada búsqueda sería lento y descortés con las tiendas. Se guardan por
// media hora; en Vercel el caché vive mientras viva la instancia, así
// que tras un arranque en frío se vuelve a bajar y ya.
const CACHE_MS = 30 * 60 * 1000;
type Entrada = { productos: ProductoTienda[]; expira: number };
const cache = new Map<string, Entrada>();

async function catalogoDe(t: TiendaConCatalogo): Promise<ProductoTienda[]> {
  const guardado = cache.get(t.dominio);
  if (guardado && guardado.expira > Date.now()) return guardado.productos;

  const host = t.host ?? t.dominio;
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), 8000);
  try {
    const res = await fetch(`https://${host}/products.json?limit=250`, {
      signal: control.signal,
      headers: { "user-agent": "LoleardLola/1.0 (+https://loleardelola.vercel.app)" },
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    const data = (await res.json()) as {
      products?: Array<{
        title?: string;
        handle?: string;
        product_type?: string;
        tags?: string[];
        images?: Array<{ src?: string }>;
        variants?: Array<{ price?: string; available?: boolean }>;
      }>;
    };

    const productos: ProductoTienda[] = (data.products ?? [])
      .filter((p) => p.title && p.handle)
      .map((p) => {
        const precio = Number(p.variants?.[0]?.price);
        return {
          titulo: p.title!.trim(),
          precioCop: Number.isFinite(precio) && precio > 0 ? Math.round(precio) : null,
          imagen: p.images?.[0]?.src ?? null,
          url: `https://${host}/products/${p.handle}`,
          tienda: t.nombre,
          dominio: t.dominio,
        };
      })
      // Sin foto no aporta nada: el punto de esto es ver la prenda.
      .filter((p) => p.imagen);

    cache.set(t.dominio, { productos, expira: Date.now() + CACHE_MS });
    return productos;
  } catch (e) {
    console.warn(`[catalogo] ${t.dominio} no respondió:`, e);
    // Se guarda el fallo un rato para no reintentar en cada búsqueda.
    cache.set(t.dominio, { productos: [], expira: Date.now() + 5 * 60 * 1000 });
    return [];
  } finally {
    clearTimeout(corte);
  }
}

/**
 * Busca en los catálogos las prendas que más se parecen al término.
 *
 * El emparejamiento es a propósito estricto con la PRIMERA palabra (el
 * tipo de prenda): si se busca "vestido floral rojo", un pantalón rojo
 * no sirve por más que comparta dos palabras. Las demás palabras suman
 * puntos pero no son obligatorias, porque casi ninguna tienda escribe
 * "floral" en el título aunque la prenda lo sea.
 */
export async function buscarEnCatalogos(
  termino: string,
  maximo = 8
): Promise<ProductoTienda[]> {
  const terminos = palabras(termino);
  if (terminos.length === 0) return [];
  const tipo = terminos[0];
  const resto = terminos.slice(1);

  const catalogos = await Promise.all(TIENDAS.map(catalogoDe));

  const puntuados: Array<{ p: ProductoTienda; punto: number }> = [];
  for (const catalogo of catalogos) {
    for (const p of catalogo) {
      const texto = normalizar(p.titulo);
      // El tipo de prenda tiene que estar; se acepta el plural simple
      // ("vestido" contra "vestidos") sin meternos en lematización.
      if (!texto.includes(tipo) && !texto.includes(tipo + "s")) continue;
      let punto = 2;
      for (const w of resto) if (texto.includes(w)) punto += 1;
      puntuados.push({ p, punto });
    }
  }

  // Más puntos primero; a igualdad, se reparte entre tiendas para que
  // una sola no se lleve toda la fila.
  puntuados.sort((a, b) => b.punto - a.punto);
  const porTienda = new Map<string, number>();
  const salida: ProductoTienda[] = [];
  for (const { p } of puntuados) {
    const n = porTienda.get(p.dominio) ?? 0;
    if (n >= 3) continue;
    porTienda.set(p.dominio, n + 1);
    salida.push(p);
    if (salida.length >= maximo) break;
  }
  return salida;
}
