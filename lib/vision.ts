import type { VisionResult } from "@/types";

// Vocabulario de prendas priorizado: lo más específico primero, genérico al final.
// "categoria" permite dedupear (solo una prenda por cuerpo/inferior/superior/etc).
// "colorImplicito" fija un color típico de esa prenda (ej: jean = azul).
type PrendaDef = {
  match: string[];         // substrings que buscamos en los labels de Vision
  nombre: string;          // término en español para Google Shopping
  categoria: string;       // dedup
  colorImplicito?: string; // si la prenda tiene un color intrínseco
};

const PRENDAS: PrendaDef[] = [
  // Inferiores (específico → genérico)
  { match: ["denim", "jeans"], nombre: "jean", categoria: "inferior", colorImplicito: "azul" },
  { match: ["skirt"], nombre: "falda", categoria: "inferior" },
  { match: ["shorts"], nombre: "short", categoria: "inferior" },
  { match: ["trousers", "pants"], nombre: "pantalón", categoria: "inferior" },
  // Cuerpo completo
  { match: ["dress", "gown"], nombre: "vestido", categoria: "cuerpo" },
  { match: ["jumpsuit", "romper"], nombre: "enterizo", categoria: "cuerpo" },
  { match: ["suit"], nombre: "traje", categoria: "cuerpo" },
  // Superiores (específico → genérico; t-shirt/blouse antes que shirt)
  { match: ["t-shirt"], nombre: "camiseta", categoria: "superior" },
  { match: ["blouse"], nombre: "blusa", categoria: "superior" },
  { match: ["hoodie"], nombre: "buzo", categoria: "superior" },
  { match: ["sweater"], nombre: "suéter", categoria: "superior" },
  { match: ["cardigan"], nombre: "cardigan", categoria: "superior" },
  { match: ["shirt"], nombre: "camisa", categoria: "superior" },
  // Prendas externas
  { match: ["blazer"], nombre: "blazer", categoria: "externo" },
  { match: ["coat"], nombre: "abrigo", categoria: "externo" },
  { match: ["jacket"], nombre: "chaqueta", categoria: "externo" },
  // Calzado (específico → genérico)
  { match: ["boots"], nombre: "botas", categoria: "calzado" },
  { match: ["sneakers"], nombre: "tenis", categoria: "calzado" },
  { match: ["heels"], nombre: "tacones", categoria: "calzado" },
  { match: ["sandals"], nombre: "sandalias", categoria: "calzado" },
  { match: ["shoes", "footwear"], nombre: "zapatos", categoria: "calzado" },
  // Accesorios (varios permitidos, cada uno categoría distinta)
  { match: ["handbag"], nombre: "bolso de mano", categoria: "bolso" },
  { match: ["backpack"], nombre: "mochila", categoria: "bolso" },
  { match: ["bag"], nombre: "bolso", categoria: "bolso" },
  { match: ["sunglasses"], nombre: "gafas de sol", categoria: "gafas" },
  { match: ["hat"], nombre: "sombrero", categoria: "sombrero" },
  { match: ["cap"], nombre: "gorra", categoria: "sombrero" },
  { match: ["scarf"], nombre: "bufanda", categoria: "bufanda" },
  { match: ["belt"], nombre: "cinturón", categoria: "cinturon" },
  { match: ["bikini"], nombre: "bikini", categoria: "bano" },
  { match: ["swimsuit"], nombre: "vestido de baño", categoria: "bano" },
];

// Neutros que suelen venir del fondo (calle, pared, cielo). Los excluimos
// como "color de la prenda" porque ensucian las búsquedas ("camiseta gris"
// cuando en realidad la camiseta es blanca y el gris es el concreto).
const COLORES_NEUTROS = new Set(["gris", "negro", "blanco", "beige"]);

// Mapeo de colores detectados por Vision (nombres aproximados por hex)
function hexToColorName(r: number, g: number, b: number): string | null {
  // Heurística simple por tonos dominantes
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const brightness = (r + g + b) / 3;
  if (brightness < 35) return "negro";
  if (brightness > 230 && max - min < 20) return "blanco";
  if (max - min < 25) return "gris";
  if (r > 180 && g < 100 && b < 100) return "rojo";
  if (r > 200 && g > 140 && b < 120) return "naranja";
  if (r > 200 && g > 200 && b < 120) return "amarillo";
  if (g > 150 && r < 160 && b < 160) return "verde";
  if (b > 150 && r < 140) return "azul";
  if (r > 150 && b > 150 && g < 150) return "morado";
  if (r > 180 && g > 120 && b > 140) return "rosa";
  if (r > 120 && g > 80 && b < 80) return "café";
  if (r > 200 && g > 180 && b > 140) return "beige";
  return null;
}

/**
 * Analiza una imagen con Google Cloud Vision API (REST) y devuelve
 * términos de búsqueda útiles para Google Shopping.
 *
 * @param imageSource URL pública o buffer base64 (sin el prefijo data:)
 */
export async function analyzeImage(
  imageSource: { url?: string; base64?: string }
): Promise<VisionResult> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) throw new Error("Falta GOOGLE_CLOUD_VISION_API_KEY");

  const image = imageSource.url
    ? { source: { imageUri: imageSource.url } }
    : { content: imageSource.base64 };

  const body = {
    requests: [
      {
        image,
        features: [
          { type: "LABEL_DETECTION", maxResults: 15 },
          { type: "OBJECT_LOCALIZATION", maxResults: 10 },
          { type: "IMAGE_PROPERTIES", maxResults: 5 },
        ],
      },
    ],
  };

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vision API error: ${err}`);
  }

  const json = await res.json();
  const response = json.responses?.[0] ?? {};

  const rawLabels: string[] = [
    ...(response.labelAnnotations ?? []).map((l: any) =>
      String(l.description).toLowerCase()
    ),
    ...(response.localizedObjectAnnotations ?? []).map((o: any) =>
      String(o.name).toLowerCase()
    ),
  ];

  // Colores dominantes
  const colors: string[] = [];
  const colorData =
    response.imagePropertiesAnnotation?.dominantColors?.colors ?? [];
  for (const c of colorData.slice(0, 3)) {
    const { red = 0, green = 0, blue = 0 } = c.color ?? {};
    const name = hexToColorName(red, green, blue);
    if (name && !colors.includes(name)) colors.push(name);
  }

  // Detectar prendas recorriendo PRENDAS en orden de especificidad.
  // Una sola prenda por categoría (p.ej. jean gana sobre pantalón).
  const detectadas: { nombre: string; color?: string }[] = [];
  const categoriasUsadas = new Set<string>();
  for (const def of PRENDAS) {
    if (categoriasUsadas.has(def.categoria)) continue;
    const hit = rawLabels.some((label) =>
      def.match.some((m) => label.includes(m))
    );
    if (hit) {
      detectadas.push({ nombre: def.nombre, color: def.colorImplicito });
      categoriasUsadas.add(def.categoria);
    }
  }

  // Separar colores saturados de neutros (los neutros suelen ser del fondo)
  const coloresSaturados = colors.filter((c) => !COLORES_NEUTROS.has(c));

  // Construir términos: prioridad color implícito > saturado real > sin color.
  // Si solo tenemos neutros, omitimos el color (mejor una búsqueda genérica).
  const searchTerms: string[] = [];
  let idxSaturado = 0;
  for (const d of detectadas) {
    let color: string | undefined = d.color;
    if (!color && coloresSaturados.length > 0) {
      color = coloresSaturados[idxSaturado % coloresSaturados.length];
      idxSaturado++;
    }
    searchTerms.push(color ? `${d.nombre} ${color}` : d.nombre);
  }

  // Fallback si no detectamos ninguna prenda
  if (searchTerms.length === 0 && rawLabels.length > 0) {
    searchTerms.push(...rawLabels.slice(0, 3));
  }

  return {
    searchTerms,
    rawLabels,
    dominantColors: colors,
  };
}

/**
 * Extrae la URL de imagen de un pin de Pinterest.
 * Admite URLs tipo https://www.pinterest.com/pin/12345/, https://co.pinterest.com/pin/...
 * y enlaces cortos https://pin.it/abc
 */
export async function extractPinterestImage(pinUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pinUrl, {
      redirect: "follow",
      headers: {
        // Pinterest a veces entrega HTML reducido si el UA no es de navegador real
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
      },
    });
    const html = await res.text();
    return extractOgImage(html);
  } catch {
    return null;
  }
}

/**
 * Busca og:image en un HTML sin asumir el orden de los atributos.
 * Pinterest por ejemplo devuelve `<meta content="..." name="og:image" property="og:image"/>`
 * (content antes que property), por lo que un regex rígido falla.
 */
export function extractOgImage(html: string): string | null {
  // Itera todas las <meta ...> y se queda con la que tenga og:image exacto
  const metaRegex = /<meta\b[^>]*>/gi;
  const metas = html.match(metaRegex) ?? [];
  for (const meta of metas) {
    // Comillas obligatorias alrededor de og:image — así no nos comemos og:image:width/height
    if (/(?:property|name)=["']og:image["']/i.test(meta)) {
      const contentMatch = meta.match(/content=["']([^"']+)["']/i);
      if (contentMatch?.[1]) return contentMatch[1];
    }
  }
  return null;
}
