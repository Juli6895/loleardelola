import { COLORES_BUSCABLES } from "./catalogo-tiendas";
import type { ConsultaPrenda } from "./use-catalogo";
import type { ClosetCategory } from "@/types";

// =====================================================================
// De un término de búsqueda guardado a una consulta de catálogo
// =====================================================================
// Los outfits guardados solo tienen los términos cortos que se usaron
// en Google ("vestido midi negro mujer"). Para buscarlos en el catálogo
// de las tiendas, igual que en la página de búsqueda, se desarman: la
// primera palabra es el tipo (las tiendas titulan así), el color se
// reconoce de la lista de colores, y lo demás son rasgos.
// =====================================================================

const GENERO = new Set(["mujer", "hombre", "nino", "niño", "nina", "niña"]);

// Tipos de más de una palabra, para no partirlos.
const TIPOS_COMPUESTOS = ["gafas de sol", "top corset", "traje de baño", "vestido de baño"];

const POR_CATEGORIA: Array<[ClosetCategory, RegExp]> = [
  ["vestido", /^(vestido|enterizo|jumpsuit|overol)/],
  ["bottom", /^(jean|pantal|falda|short|pantaloneta|bermuda|legging|jogger)/],
  ["abrigo", /^(chaqueta|blazer|abrigo|chaleco|cardigan|cárdigan|gabardina|trench|saco|buzo|hoodie|sueter|suéter)/],
  ["calzado", /^(tenis|zapat|bota|botin|botín|sandalia|tacon|tacón|baleta|mocasin|mocasín|plataforma)/],
  ["accesorio", /^(bolso|cartera|collar|arete|gafas|gorra|sombrero|cinturon|cinturón|bufanda|reloj|pulsera|anillo|cadena|pañoleta)/],
];

export function categoriaDeTipo(tipo: string): ClosetCategory {
  const t = tipo.toLowerCase();
  return POR_CATEGORIA.find(([, re]) => re.test(t))?.[0] ?? "top";
}

export function consultaDesdeTermino(termino: string): ConsultaPrenda {
  let resto = termino.toLowerCase().trim();
  const compuesto = TIPOS_COMPUESTOS.find((t) => resto.startsWith(t));
  const tipo = compuesto ?? resto.split(/\s+/)[0] ?? resto;
  resto = resto.slice(tipo.length).trim();

  // El color más largo que aparezca ("azul oscuro" antes que "azul"),
  // también en plural o femenino ("blancos", "negras").
  const forma = (c: string) => {
    const base = c.replace(/o$/, "");
    const variantes = base !== c ? `${base}(o|a)s?` : `${c}(s|es)?`;
    return new RegExp(`(^|\\s)(${variantes})(\\s|$)`);
  };
  let color: string | null = null;
  for (const c of [...COLORES_BUSCABLES].sort((a, b) => b.length - a.length)) {
    const m = resto.match(forma(c));
    if (m) {
      color = c;
      resto = resto.replace(m[2], " ");
      break;
    }
  }

  const rasgos = resto
    .split(/\s+/)
    .filter((w) => w && !GENERO.has(w))
    .join(" ")
    .trim();

  return { etiqueta: termino, tipo, color, rasgos: rasgos ? [rasgos] : [] };
}
