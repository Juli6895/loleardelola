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

export type VisionResult = {
  // Etiquetas ya traducidas y pensadas para búsqueda de moda (ej: "vestido rojo floral")
  searchTerms: string[];
  // Etiquetas crudas que devolvió Vision (útiles para debug)
  rawLabels: string[];
  // Colores dominantes detectados
  dominantColors: string[];
};
