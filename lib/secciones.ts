// =====================================================================
// Las secciones de LoleardLola, con qué se hace en cada una
// =====================================================================
// Las usan el inicio (components/Servicios.tsx: todas las opciones en
// la primera página) y el pie de cada página (components/OtrasSecciones
// .tsx: para pasar a otra sin subir al menú). Mismo orden que el menú de
// arriba (components/Navbar.tsx), a pedido de Juliana.
// =====================================================================

export type Seccion = {
  href: string;
  nombre: string;
  texto: string;
  // Una etiqueta corta junto al nombre ("Membresía").
  etiqueta?: string;
};

// "Mis marcas favoritas" no es una página: es el panel de Filtros de
// Promociones, que se abre con ?filtros=1.
export const HREF_MIS_MARCAS = "/promociones?filtros=1";

export const SECCIONES: Seccion[] = [
  {
    href: "/promociones",
    nombre: "Promociones",
    texto: "Las rebajas de más del 10% de todas las tiendas, en tallas disponibles. O todo lo nuevo de tus marcas.",
  },
  {
    href: "/buscar",
    nombre: "Buscar",
    texto: "Sube la foto de un outfit que te guste y te decimos en qué tiendas podrías comprarlo.",
  },
  {
    href: "/mis-outfits",
    nombre: "Mis outfits",
    texto: "Los outfits que guardaste y las prendas a las que les diste corazón.",
  },
  {
    href: "/mi-perfil",
    nombre: "Mi perfil",
    texto: "Tus medidas, tu color y tu estilo: con eso armamos tu asesoría de imagen.",
  },
  {
    href: "/manual",
    nombre: "Mi manual",
    texto: "Tu manual de estilo: qué te favorece y cómo combinarlo. Descárgalo cuando quieras.",
    etiqueta: "Membresía",
  },
  {
    href: "/mi-closet",
    nombre: "Mi clóset",
    texto: "Sube las prendas que ya tienes y te recomendamos con qué combinarlas.",
  },
  {
    href: "/membresia",
    nombre: "Membresía",
    texto: "Promociones todos los días, avisos cuando baja lo que te gusta y más búsquedas.",
  },
  {
    href: HREF_MIS_MARCAS,
    nombre: "Mis marcas favoritas",
    texto: "Escoge las marcas que te gustan y en Promociones solo te mostramos esas.",
  },
  {
    href: "/preguntas",
    nombre: "Preguntas",
    texto: "Cómo funciona todo, los planes y cómo instalar la app en tu celular.",
  },
];
