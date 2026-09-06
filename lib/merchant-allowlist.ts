import fs from "fs";
import path from "path";

// =====================================================================
// Lista de comercios PERMITIDOS para las búsquedas de Google Shopping.
// =====================================================================
// Esto es lo opuesto a merchant-exclusions: en vez de sacar unos pocos
// comercios, restringe la búsqueda a SOLO los que estén en esta lista.
// Es un ajuste de administración (edita `config/merchant-allowlist.txt` en
// el repo) — no hay control en la UI para que la usuaria lo cambie.
//
// Si el archivo está vacío (o todas las líneas comentadas), no se aplica
// ninguna restricción y las búsquedas siguen abiertas a todo Google
// Shopping, igual que antes de tener esta config.
// =====================================================================

const CONFIG_PATH = path.join(
  process.cwd(),
  "config",
  "merchant-allowlist.txt"
);

/**
 * Lee la lista de dominios permitidos del archivo de configuración.
 * Devuelve una lista vacía (= sin restricción) si el archivo no existe, no
 * se puede leer, o no tiene ninguna línea activa.
 */
export function getAllowedMerchants(): string[] {
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
    console.warn("[merchant-allowlist] no se pudo leer la config:", e);
    return [];
  }
}
