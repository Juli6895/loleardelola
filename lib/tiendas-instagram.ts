import fs from "fs";
import path from "path";
import type { ClosetCategory, TiendaInstagram } from "@/types";

// =====================================================================
// Directorio curado de tiendas colombianas que venden por Instagram.
// =====================================================================
// La fuente de verdad es `config/tiendas-instagram.txt`, editable solo
// por administración (igual que merchant-exclusions y merchant-allowlist).
// Se lee en cada request, así que editar el archivo aplica de inmediato
// en dev y con cada deploy en Vercel.
//
// OJO con el alcance: esto NO dice qué tienda tiene una prenda puntual
// en stock (eso necesitaría una API de productos). Dice qué tiendas
// venden ESE TIPO de prenda, según las categorías que se le asignaron
// acá. La UI tiene que dejar esa diferencia clara.
// =====================================================================

const CONFIG_PATH = path.join(
  process.cwd(),
  "config",
  "tiendas-instagram.txt"
);

const CATEGORIAS_VALIDAS: ClosetCategory[] = [
  "top",
  "bottom",
  "vestido",
  "abrigo",
  "calzado",
  "accesorio",
];

/**
 * Lee el directorio de tiendas. Ignora líneas vacías, comentarios y
 * entradas malformadas (sin handle, sin nombre o sin ninguna categoría
 * válida) — una línea mal escrita no debe tumbar la búsqueda entera.
 */
export function getTiendasInstagram(): TiendaInstagram[] {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line): TiendaInstagram | null => {
        const [handleRaw, nombreRaw, categoriasRaw, ciudadRaw, dominioRaw] =
          line.split("|").map((p) => (p ?? "").trim());

        const handle = (handleRaw ?? "").replace(/^@/, "").toLowerCase();
        const nombre = nombreRaw ?? "";
        if (!handle || !nombre) return null;

        const categorias = (categoriasRaw ?? "")
          .split(",")
          .map((c) => c.trim().toLowerCase())
          .filter((c): c is ClosetCategory =>
            CATEGORIAS_VALIDAS.includes(c as ClosetCategory)
          );
        if (categorias.length === 0) return null;

        return {
          handle,
          nombre,
          categorias,
          ciudad: ciudadRaw || null,
          dominio:
            (dominioRaw || "")
              .toLowerCase()
              .replace(/^https?:\/\//, "")
              .replace(/^www\./, "")
              .replace(/\/.*$/, "") || null,
        };
      })
      .filter((t): t is TiendaInstagram => t !== null);
  } catch (e) {
    console.warn("[tiendas-instagram] no se pudo leer la config:", e);
    return [];
  }
}
