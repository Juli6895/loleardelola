import crypto from "crypto";
import type { RangoEdad, Silueta, TonoPiel } from "@/types";

// =====================================================================
// La ilustración de la usuaria (Mi perfil), dibujada por Gemini
// =====================================================================
// Se describe a la usuaria con lo que dijo en su perfil y siempre con la
// misma pose, ropa y fondo, para que todas las ilustraciones de la app
// se vean de una misma familia. La descripción va en inglés: los
// modelos de imagen la siguen con más precisión.
// =====================================================================

export type DatosFigura = {
  silueta: Silueta;
  tonoPiel: TonoPiel | null;
  colorCabello: string | null;
  largoCabello: string | null;
  edad: RangoEdad | null;
  busto: number | null;
  cintura: number | null;
  cadera: number | null;
  estatura: number | null;
};

const SILUETA: Record<Silueta, string> = {
  reloj_de_arena:
    "hourglass body shape: shoulders and hips about the same width, with a clearly defined waist",
  pera: "pear body shape: hips and thighs noticeably wider than shoulders and bust, with a defined waist",
  manzana:
    "apple body shape: fuller bust and midsection with little waist definition, slimmer hips and legs",
  rectangulo:
    "rectangle body shape: shoulders, waist and hips of similar width, with little waist definition",
  triangulo_invertido:
    "inverted triangle body shape: shoulders noticeably broader than the hips, narrower hips",
};

const PIEL: Record<TonoPiel, string> = {
  blanca: "fair, light peach skin (a light-skinned woman, not tanned)",
  canela: "light-medium golden-tan (trigueña) skin",
  morena: "warm medium-deep brown skin",
  negra: "deep dark brown skin",
};

const PELO: Record<string, string> = {
  negro: "black",
  "castaño oscuro": "dark brown",
  "castaño claro": "light brown",
  rubio: "blonde",
  cobrizo: "copper red",
  canoso: "silver gray",
  teñido: "dyed soft pink",
};

const LARGO: Record<string, string> = {
  "muy corto": "very short pixie-cut",
  corto: "chin-length bob",
  "media melena": "shoulder-length",
  largo: "long, down to mid-chest,",
  "muy largo": "very long, down to the waist,",
};

const EDAD: Record<RangoEdad, string> = {
  "18-24": "in her early twenties",
  "25-34": "in her late twenties or early thirties",
  "35-44": "around forty",
  "45-54": "around fifty",
  "55-64": "around sixty",
  "65+": "in her late sixties",
};

export function describirFigura(d: DatosFigura): string {
  const medidas =
    d.busto && d.cintura && d.cadera
      ? ` Her real measurements are bust ${d.busto} cm, waist ${d.cintura} cm, hips ${d.cadera} cm${
          d.estatura ? `, height ${d.estatura} cm` : ""
        }: draw these proportions faithfully, neither slimmer nor fuller.`
      : "";
  const pelo = `${PELO[d.colorCabello ?? ""] ?? "dark brown"} hair, ${LARGO[d.largoCabello ?? ""] ?? "shoulder-length"} softly styled`;

  return [
    `Full-body fashion illustration of a Colombian woman ${d.edad ? EDAD[d.edad] : "in her thirties"}, front view, standing naturally and relaxed, arms hanging at her sides, centered, the whole figure from head to toe visible with some margin.`,
    `She has a ${SILUETA[d.silueta]}.${medidas}`,
    `She has ${d.tonoPiel ? PIEL[d.tonoPiel] : "warm light-medium skin"} and ${pelo}, with a warm, friendly, natural face.`,
    "She wears a fitted pastel pink tank top, fitted charcoal gray leggings and simple taupe ballet flats, so her body shape reads clearly.",
    "Style: elegant modern flat vector illustration with soft shading and clean lines, realistic human proportions, harmonious and body-positive, never exaggerated or sexualized.",
    "Plain very light blush pink background. No text, no logos, no watermark, no other people.",
  ].join(" ");
}

/**
 * Huella de los DATOS: si no cambian, la ilustración guardada sigue
 * sirviendo. No incluye el texto de la descripción a propósito: mejorar
 * esa redacción no debe obligar a nadie a pagar una ilustración nueva.
 */
export function huellaFigura(d: DatosFigura): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify([
        d.silueta, d.tonoPiel, d.colorCabello, d.largoCabello, d.edad,
        d.busto, d.cintura, d.cadera, d.estatura,
      ])
    )
    .digest("hex")
    .slice(0, 32);
}
