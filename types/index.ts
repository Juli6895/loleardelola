// Tipos compartidos de la aplicación

export type Outfit = {
  id: string;
  user_id: string | null;
  image_url: string;
  tags: string[];
  pinterest_url: string | null;
  created_at: string;
};

export type PinterestBoard = {
  id: string;
  name: string;
  description?: string;
  pin_count?: number;
  image_cover_url?: string;
};

export type ClosetCategory =
  | "top"
  | "bottom"
  | "vestido"
  | "abrigo"
  | "calzado"
  | "accesorio";

export type ClosetItem = {
  id: string;
  user_id: string | null;
  image_url: string;
  category: ClosetCategory;
  color: string | null;
  tags: string[];
  label: string | null;
  created_at: string;
};

// Silueta y Personalidad viven junto al contenido del manual de asesoría
// (lib/image-consulting/) — se reexportan aquí para no tener dos
// definiciones de la misma unión.
export type { Silueta } from "@/lib/image-consulting/morfologia";
import type { Silueta } from "@/lib/image-consulting/morfologia";
export type { Personalidad } from "@/lib/image-consulting/personalidad";
import type { Personalidad } from "@/lib/image-consulting/personalidad";

// Perfil de medidas de la usuaria — base para la asesoría de figura hoy,
// y para el Avatar (Fase 3 del roadmap) más adelante.
export type PerfilSilueta = {
  bust_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  height_cm: number | null;
  silueta: Silueta | null;
  personalidad: Personalidad | null;
  personalidad_secundaria: Personalidad | null;
  personalidad_fuente: string | null;
};

export type VisionResult = {
  // Etiquetas ya traducidas y pensadas para búsqueda de moda (ej: "vestido rojo floral")
  searchTerms: string[];
  // Precio máximo en COP por cada término (mismo orden que searchTerms).
  // null cuando no hay presupuesto definido o no aplica al término.
  priceMaxCop: (number | null)[];
  // Desglose por prenda (mismo orden/largo que searchTerms) para mostrar
  // el detalle claro en la UI, no solo el texto de búsqueda combinado.
  // null cuando Claude no lo determina para esa prenda, o cuando el
  // análisis vino del fallback de Google Vision (no tiene esta finura).
  tipoPrenda: (string | null)[];
  colores: (string | null)[];
  detalles: (string | null)[];
  // Etiquetas crudas que devolvió Vision (útiles para debug)
  rawLabels: string[];
  // Colores dominantes detectados
  dominantColors: string[];
};
