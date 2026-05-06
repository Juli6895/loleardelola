import fs from "fs";
import path from "path";

// =====================================================================
// Lista de comercios excluidos de las búsquedas de Google Shopping.
// =====================================================================
// El archivo `config/merchant-exclusions.txt` es la fuente de verdad. Lo
// leemos en cada request (es server-side y filesystem es rápido), así
// editar el archivo aplica de inmediato sin necesidad de reiniciar el
// server en dev. En producción Vercel reinicia en cada deploy, así que
// igual se respeta el archivo del repo.
// =====================================================================

const CONFIG_PATH = path.join(
  process.cwd(),
  "config",
  "merchant-exclusions.txt"
);

/**
 * Lee la lista de dominios excluidos del archivo de configuración.
 * Devuelve una lista vacía si el archivo no existe o no se puede leer
 * (no queremos romper el flujo de búsqueda por un problema de config).
 */
export function getExcludedMerchants(): string[] {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      // Normaliza: minúsculas, sin protocolo, sin www., sin trailing slash
      .map((line) =>
        line
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .replace(/\/.*$/, "")
      )
      .filter((domain) => domain.length > 0);
  } catch (e) {
    console.warn("[merchant-exclusions] no se pudo leer la config:", e);
    return [];
  }
}
