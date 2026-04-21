import type { VisionResult } from "@/types";

// Vocabulario de prendas que nos interesan (en inglés porque así devuelve Vision)
// Mapeamos a término de búsqueda en español para Google Shopping.
const PRENDAS: Record<string, string> = {
  dress: "vestido",
  gown: "vestido largo",
  skirt: "falda",
  jeans: "jean",
  denim: "jean",
  trousers: "pantalón",
  pants: "pantalón",
  shorts: "short",
  "t-shirt": "camiseta",
  shirt: "camisa",
  blouse: "blusa",
  sweater: "suéter",
  cardigan: "cardigan",
  hoodie: "buzo",
  jacket: "chaqueta",
  coat: "abrigo",
  blazer: "blazer",
  suit: "traje",
  boots: "botas",
  sneakers: "tenis",
  heels: "tacones",
  sandals: "sandalias",
  shoes: "zapatos",
  bag: "bolso",
  handbag: "bolso de mano",
  backpack: "mochila",
  hat: "sombrero",
  cap: "gorra",
  scarf: "bufanda",
  belt: "cinturón",
  sunglasses: "gafas de sol",
  jumpsuit: "enterizo",
  romper: "enterizo corto",
  bikini: "bikini",
  swimsuit: "vestido de baño",
};

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

  // Construir términos de búsqueda: "color + prenda"
  const prendasDetectadas: string[] = [];
  for (const label of rawLabels) {
    for (const [en, es] of Object.entries(PRENDAS)) {
      if (label.includes(en) && !prendasDetectadas.includes(es)) {
        prendasDetectadas.push(es);
      }
    }
  }

  const searchTerms: string[] = [];
  if (prendasDetectadas.length > 0) {
    for (const prenda of prendasDetectadas) {
      if (colors.length > 0) {
        searchTerms.push(`${prenda} ${colors[0]}`);
      } else {
        searchTerms.push(prenda);
      }
    }
  } else if (rawLabels.length > 0) {
    // Fallback: usar primeras etiquetas crudas (por si la imagen no tiene prenda clara)
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
 * Admite URLs tipo https://www.pinterest.com/pin/12345/ o https://pin.it/abc
 */
export async function extractPinterestImage(pinUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pinUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LolearDeLolaBot/1.0; +https://loleardelola.com)",
      },
    });
    const html = await res.text();
    // Pinterest expone la imagen en og:image
    const match = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
