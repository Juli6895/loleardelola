// Las fotos de catálogo que hace Gemini (ver lib/foto-prenda.ts) quedan
// en su propia carpeta de Cloudinary: así se sabe, sin una columna más
// en la base, qué prendas ya la tienen. Va aparte para poder usarlo
// también en el navegador (lib/foto-prenda.ts carga el SDK de
// Cloudinary, que es solo de servidor).
export const CARPETA_CATALOGO = "catalogo";

export function esFotoDeCatalogo(url: string | null | undefined): boolean {
  return !!url && url.includes(`/loleardelola/${CARPETA_CATALOGO}/`);
}
