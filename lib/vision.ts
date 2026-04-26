import type { VisionResult } from "@/types";

// =====================================================================
// Vocabulario de prendas
// =====================================================================
// Lista priorizada: lo más específico primero. Una sola prenda por categoría
// (la primera que matchee gana). Si la prenda tiene un color intrínseco
// (ej. jean = azul), se usa SOLO si la paleta confirma ese color.
type PrendaDef = {
  match: string[];           // substrings que buscamos en los labels de Vision
  nombre: string;            // término en español para Google Shopping
  categoria: string;         // dedup
  colorIntrinseco?: string;  // color "natural" de la prenda; aplica si está en la paleta
};

const PRENDAS: PrendaDef[] = [
  // Inferiores (específico → genérico)
  { match: ["denim", "jeans"], nombre: "jean", categoria: "inferior", colorIntrinseco: "azul" },
  { match: ["skirt"], nombre: "falda", categoria: "inferior" },
  { match: ["shorts"], nombre: "short", categoria: "inferior" },
  { match: ["chinos"], nombre: "chinos", categoria: "inferior" },
  { match: ["leggings"], nombre: "leggings", categoria: "inferior" },
  { match: ["trousers", "pants"], nombre: "pantalón", categoria: "inferior" },
  // Cuerpo completo
  { match: ["dress", "gown"], nombre: "vestido", categoria: "cuerpo" },
  { match: ["jumpsuit", "romper"], nombre: "enterizo", categoria: "cuerpo" },
  { match: ["suit"], nombre: "traje", categoria: "cuerpo" },
  // Superiores (específico → genérico)
  { match: ["t-shirt"], nombre: "camiseta", categoria: "superior" },
  { match: ["crop top"], nombre: "crop top", categoria: "superior" },
  { match: ["tank top", "tank"], nombre: "esqueleto", categoria: "superior" },
  { match: ["polo shirt", "polo"], nombre: "polo", categoria: "superior" },
  { match: ["blouse"], nombre: "blusa", categoria: "superior" },
  { match: ["hoodie"], nombre: "buzo", categoria: "superior" },
  { match: ["sweater"], nombre: "suéter", categoria: "superior" },
  { match: ["cardigan"], nombre: "cardigan", categoria: "superior" },
  { match: ["shirt"], nombre: "camisa", categoria: "superior" },
  // Externas (específico → genérico)
  { match: ["bomber"], nombre: "chaqueta bomber", categoria: "externo" },
  { match: ["leather jacket"], nombre: "chaqueta de cuero", categoria: "externo" },
  { match: ["denim jacket"], nombre: "chaqueta de jean", categoria: "externo" },
  { match: ["blazer"], nombre: "blazer", categoria: "externo" },
  { match: ["trench"], nombre: "trench", categoria: "externo" },
  { match: ["parka"], nombre: "parka", categoria: "externo" },
  { match: ["coat"], nombre: "abrigo", categoria: "externo" },
  { match: ["jacket", "outerwear"], nombre: "chaqueta", categoria: "externo" },
  // Calzado (específico → genérico)
  { match: ["boots"], nombre: "botas", categoria: "calzado" },
  { match: ["sneakers"], nombre: "tenis", categoria: "calzado" },
  { match: ["heels", "high heels"], nombre: "tacones", categoria: "calzado" },
  { match: ["sandals"], nombre: "sandalias", categoria: "calzado" },
  { match: ["loafers"], nombre: "mocasines", categoria: "calzado" },
  { match: ["shoes", "footwear"], nombre: "zapatos", categoria: "calzado" },
  // Accesorios
  { match: ["handbag"], nombre: "bolso de mano", categoria: "bolso" },
  { match: ["backpack"], nombre: "mochila", categoria: "bolso" },
  { match: ["clutch"], nombre: "clutch", categoria: "bolso" },
  { match: ["bag"], nombre: "bolso", categoria: "bolso" },
  { match: ["sunglasses"], nombre: "gafas de sol", categoria: "gafas" },
  { match: ["hat"], nombre: "sombrero", categoria: "sombrero" },
  { match: ["cap"], nombre: "gorra", categoria: "sombrero" },
  { match: ["beanie"], nombre: "gorro", categoria: "sombrero" },
  { match: ["scarf"], nombre: "bufanda", categoria: "bufanda" },
  { match: ["belt"], nombre: "cinturón", categoria: "cinturon" },
  { match: ["bikini"], nombre: "bikini", categoria: "bano" },
  { match: ["swimsuit"], nombre: "vestido de baño", categoria: "bano" },
];

// Colores que casi siempre vienen del fondo (calle, pared, cielo).
// No los descartamos del todo: solo los degradamos a "fallback" después de los saturados.
const COLORES_NEUTROS = new Set(["gris", "negro", "blanco", "beige"]);

// =====================================================================
// Detección de color (HSL)
// =====================================================================
// El heurístico anterior fallaba con tonos importantes en moda como verde
// olivo, vinotinto y celeste. Pasamos a HSL: hue para distinguir tonos,
// saturación para neutros, luminosidad para café/negro/blanco.
function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h = (h * 60 + 360) % 360;
  }
  return { h, s, l };
}

function hexToColorName(r: number, g: number, b: number): string | null {
  const { h, s, l } = rgbToHsl(r, g, b);

  // Neutros por luminosidad/saturación
  if (l < 0.12) return "negro";
  if (l > 0.93 && s < 0.15) return "blanco";
  if (s < 0.12) {
    if (l < 0.35) return "negro";
    if (l > 0.85) return "blanco";
    return "gris";
  }

  // Beige: amarillos pálidos
  if (l > 0.7 && s < 0.45 && h >= 25 && h <= 55) return "beige";

  // Café: tonos cálidos oscuros
  if (l < 0.45 && h >= 10 && h <= 55 && s >= 0.15) return "café";

  // Resto por hue
  if (h < 15 || h >= 345) return "rojo";
  if (h < 35) return l < 0.5 ? "café" : "naranja";
  if (h < 65) return "amarillo";
  if (h < 165) return "verde"; // incluye olivo (~75)
  if (h < 200) return "celeste";
  if (h < 255) return "azul";
  if (h < 290) return "morado";
  if (h < 345) return "rosa";
  return null;
}

// =====================================================================
// Análisis principal
// =====================================================================
/**
 * Analiza una imagen con Google Cloud Vision API y devuelve
 * términos de búsqueda útiles para Google Shopping.
 */
export async function analyzeImage(
  imageSource: { url?: string; base64?: string }
): Promise<VisionResult> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) throw new Error("Falta GOOGLE_CLOUD_VISION_API_KEY");

  const image = imageSource.url
    ? { source: { imageUri: imageSource.url } }
    : { content: imageSource.base64 };

  // Subimos los maxResults para tener mejor cobertura de prendas y colores.
  const body = {
    requests: [
      {
        image,
        features: [
          { type: "LABEL_DETECTION", maxResults: 25 },
          { type: "OBJECT_LOCALIZATION", maxResults: 15 },
          { type: "IMAGE_PROPERTIES", maxResults: 10 },
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

  // Hasta 8 colores dominantes (antes 3) para capturar prendas que no son
  // las más grandes en la foto (ej. una blusa pequeña con fondo dominante).
  const colorData: Array<{ color?: any; score?: number; pixelFraction?: number }> =
    response.imagePropertiesAnnotation?.dominantColors?.colors ?? [];

  const colors: string[] = [];
  for (const c of colorData.slice(0, 8)) {
    const { red = 0, green = 0, blue = 0 } = c.color ?? {};
    const name = hexToColorName(red, green, blue);
    if (name && !colors.includes(name)) colors.push(name);
  }

  const coloresSaturados = colors.filter((c) => !COLORES_NEUTROS.has(c));
  const coloresNeutros = colors.filter((c) => COLORES_NEUTROS.has(c));

  // Saturado "principal" — color que ocupa al menos 12% de los píxeles
  // (los colores de fondo suelen ser >25%; los accesorios pequeños <5%).
  // Lo usamos como única señal fuerte para teñir UNA prenda principal.
  const colorPrendaPrincipal: string | undefined = colorData
    .map((c) => {
      const { red = 0, green = 0, blue = 0 } = c.color ?? {};
      return {
        name: hexToColorName(red, green, blue),
        fraction: c.pixelFraction ?? 0,
      };
    })
    .filter((c) => c.name && !COLORES_NEUTROS.has(c.name) && c.fraction > 0.12)
    .sort((a, b) => b.fraction - a.fraction)[0]?.name as string | undefined;

  const tieneLabel = (terms: string[]) =>
    rawLabels.some((l) => terms.some((t) => l.includes(t)));

  // -------------------------------------------------------------------
  // Detección de prendas (sin asignar color todavía)
  // -------------------------------------------------------------------
  const detectadas: { nombre: string; categoria: string; color?: string }[] = [];
  const usadas = new Set<string>();

  for (const def of PRENDAS) {
    if (usadas.has(def.categoria)) continue;
    if (!tieneLabel(def.match)) continue;
    detectadas.push({ nombre: def.nombre, categoria: def.categoria });
    usadas.add(def.categoria);
  }

  // -------------------------------------------------------------------
  // Asignación CONSERVADORA de colores
  // -------------------------------------------------------------------
  // Solo aplicamos color cuando hay evidencia fuerte:
  //   - jean → azul si la paleta confirma azul; si no, reclasificamos a pantalón.
  //   - pantalón → negro si negro está en paleta y no hay otra prenda inferior.
  //   - tenis/zapatos → "blancos" si hay blanco en paleta (los tenis claros son comunes).
  //   - una sola prenda "principal" recibe el saturado dominante (>12% píxeles).
  //   - el resto va sin color → mejor búsqueda genérica que búsqueda equivocada.
  // -------------------------------------------------------------------
  for (const d of detectadas) {
    // 1. jean → confirmar azul, si no, reclasificar
    if (d.nombre === "jean") {
      if (coloresSaturados.includes("azul")) {
        d.color = "azul";
      } else {
        d.nombre = "pantalón";
        if (coloresNeutros.includes("negro")) d.color = "negro";
      }
      continue;
    }

    // 2. pantalón genérico → si hay negro en paleta y no había jean, asumir negro
    if (d.nombre === "pantalón" && coloresNeutros.includes("negro")) {
      d.color = "negro";
      continue;
    }

    // 3. zapatos/tenis blancos cuando hay blanco en la paleta
    if ((d.nombre === "zapatos" || d.nombre === "tenis") && coloresNeutros.includes("blanco")) {
      d.nombre = "tenis blancos";
      continue;
    }
  }

  // 4. Color saturado dominante → la prenda "principal" más visible
  //    (preferimos vestido > chaqueta/blazer > suéter/camisa > demás superiores).
  if (colorPrendaPrincipal) {
    const PRIORIDAD: string[] = ["cuerpo", "externo", "superior", "inferior", "calzado"];
    for (const cat of PRIORIDAD) {
      const candidata = detectadas.find((d) => d.categoria === cat && !d.color);
      if (candidata) {
        candidata.color = colorPrendaPrincipal;
        break;
      }
    }
  }

  // -------------------------------------------------------------------
  // Construir términos finales
  // -------------------------------------------------------------------
  const searchTerms = detectadas.map((d) =>
    d.color ? `${d.nombre} ${d.color}` : d.nombre
  );

  // Fallback: si no detectamos prendas, usar las primeras labels
  if (searchTerms.length === 0 && rawLabels.length > 0) {
    searchTerms.push(...rawLabels.slice(0, 3));
  }

  return {
    searchTerms,
    rawLabels,
    dominantColors: colors,
  };
}

// =====================================================================
// Pinterest scraping
// =====================================================================
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
  const metaRegex = /<meta\b[^>]*>/gi;
  const metas = html.match(metaRegex) ?? [];
  for (const meta of metas) {
    if (/(?:property|name)=["']og:image["']/i.test(meta)) {
      const contentMatch = meta.match(/content=["']([^"']+)["']/i);
      if (contentMatch?.[1]) return contentMatch[1];
    }
  }
  return null;
}
