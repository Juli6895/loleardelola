// =====================================================================
// Manual de asesoría de imagen — Pilar 3: Catálogo de prendas
// =====================================================================
// Vocabulario de referencia en español colombiano — el mismo que ya usa
// el analizador de outfits (lib/garment-ai.ts) y el clasificador de
// clóset (analyzeClosetItem). Este catálogo es la fuente compartida para
// que ambos hablen el mismo idioma y no se dupliquen términos distintos
// para la misma prenda.
// =====================================================================

import type { ClosetCategory } from "@/types";

export type CuelloTipo =
  | "redondo"
  | "en V"
  | "cuadrado"
  | "barco"
  | "halter"
  | "strapless"
  | "camisero"
  | "tortuga"
  | "asimétrico";

export type MangaTipo =
  | "sin manga"
  | "corta"
  | "3/4"
  | "larga"
  | "abullonada"
  | "campana"
  | "globo";

export type LargoTipo =
  | "corto"
  | "midi"
  | "largo"
  | "tobillero"
  | "cropped";

export type TelaTipo =
  | "algodón"
  | "denim"
  | "lino"
  | "seda"
  | "cuero"
  | "punto/tejido"
  | "lana"
  | "sintético liviano";

// Guía rápida: qué cuello/manga/largo/tela es más de qué temporada, para
// que el motor de sugerencias (Fase 3+) no recomiende lino en diciembre
// frío ni lana en abril calurosa.
export const TELA_POR_CLIMA: Record<TelaTipo, "calido" | "frio" | "todo_el_año"> = {
  algodón: "todo_el_año",
  denim: "todo_el_año",
  lino: "calido",
  seda: "todo_el_año",
  cuero: "frio",
  "punto/tejido": "frio",
  lana: "frio",
  "sintético liviano": "calido",
};

export type CategoriaInfo = {
  label: string;
  ejemplosPrendas: string[];
  atributosRelevantes: Array<"cuello" | "manga" | "largo" | "tela">;
};

// Mismas 6 categorías del clóset (types/index.ts ClosetCategory) — se
// documentan aquí con ejemplos y qué atributos tiene sentido preguntar o
// detectar para cada una.
export const CATALOGO_POR_CATEGORIA: Record<ClosetCategory, CategoriaInfo> = {
  top: {
    label: "Tops",
    ejemplosPrendas: [
      "camisa",
      "blusa",
      "camiseta",
      "top",
      "saco",
      "buzo",
      "crop top",
    ],
    atributosRelevantes: ["cuello", "manga", "tela"],
  },
  bottom: {
    label: "Bottoms",
    ejemplosPrendas: [
      "jean",
      "pantalón",
      "falda",
      "short",
      "pantaloneta",
      "leggings",
    ],
    atributosRelevantes: ["largo", "tela"],
  },
  vestido: {
    label: "Vestidos",
    ejemplosPrendas: ["vestido", "enterizo", "jumpsuit"],
    atributosRelevantes: ["cuello", "manga", "largo", "tela"],
  },
  abrigo: {
    label: "Abrigos",
    ejemplosPrendas: ["chaqueta", "blazer", "abrigo", "ruana", "gabán"],
    atributosRelevantes: ["manga", "largo", "tela"],
  },
  calzado: {
    label: "Calzado",
    ejemplosPrendas: ["tenis", "botas", "tacones", "sandalias", "mocasines"],
    atributosRelevantes: ["tela"],
  },
  accesorio: {
    label: "Accesorios",
    ejemplosPrendas: [
      "bolso",
      "gorra",
      "gafas de sol",
      "cinturón",
      "collar",
      "bufanda",
    ],
    atributosRelevantes: [],
  },
};
