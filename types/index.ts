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

// Desglose completo de UNA prenda detectada en la foto. Los campos
// descriptivos son para mostrarle el detalle a la usuaria; los dos
// searchTerm son para buscar:
//   - searchTerm: corto (≤5 palabras). Trae MÁS resultados en Google
//     Shopping. Es el que se usa por defecto.
//   - searchTermEspecifico: largo, con todo el detalle. Más preciso pero
//     puede devolver pocos resultados — por eso va como opción aparte.
// Campos null = Claude no pudo determinarlo, o el análisis vino del
// fallback de Google Vision (que no tiene esta finura).
export type PrendaDetalle = {
  categoria: ClosetCategory | null;
  tipo: string | null;
  color: string | null;
  // Textura, estampado o acabado (pedrería, rayas, cuero...)
  detalle: string | null;
  // Corte o silueta (mini, midi, wide leg, oversize, entallado...)
  corte: string | null;
  tela: string | null;
  ocasion: string | null;
  searchTerm: string;
  searchTermEspecifico: string | null;
};

// Tienda colombiana que vende por Instagram. Directorio curado por
// administración en config/tiendas-instagram.txt — ver
// lib/tiendas-instagram.ts.
export type TiendaInstagram = {
  // Sin la arroba, en minúsculas (ej: "mitienda")
  handle: string;
  nombre: string;
  categorias: ClosetCategory[];
  ciudad: string | null;
};

export type VisionResult = {
  // Términos cortos de búsqueda, uno por prenda — mismo orden que
  // `prendas`. Se mantiene aparte porque es lo que se guarda como tags
  // del outfit y lo que consumen las URLs de Google Shopping.
  searchTerms: string[];
  // Precio máximo en COP por cada prenda (mismo orden que searchTerms).
  // null cuando no hay presupuesto definido o no aplica.
  priceMaxCop: (number | null)[];
  // Desglose descriptivo por prenda, mismo orden que searchTerms.
  prendas: PrendaDetalle[];
  // Etiquetas crudas que devolvió Vision (útiles para debug)
  rawLabels: string[];
  // Colores dominantes detectados
  dominantColors: string[];
};
