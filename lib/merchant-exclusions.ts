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

// Feature flag: las exclusiones por dominio (`-site:shein.com`...) están
// temporalmente desactivadas. Sumadas a las queries con género y al filtro
// de precio, dejaban Google Shopping con 0-1 resultados. Para reactivarlas:
// poner true. El archivo `config/merchant-exclusions.txt` se conserva.
const EXCLUSIONS_ENABLED = false;

const CONFIG_PATH = path.join(
  process.cwd(),
  "config",
  "merchant-exclusions.txt"
);

/**
 * Lee la lista de dominios excluidos del archivo de configuración.
 * Devuelve una lista vacía si el archivo no existe, no se puede leer, o
 * el feature flag EXCLUSIONS_ENABLED está apagado.
 */
export function getExcludedMerchants(): string[] {
  if (!EXCLUSIONS_ENABLED) return [];
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
