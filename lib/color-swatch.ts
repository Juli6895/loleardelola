// Mapa de nombres de color en español (el mismo vocabulario que usa
// lib/garment-ai.ts) a un hex aproximado, solo para pintar un puntico de
// referencia visual junto al nombre — no necesita ser exacto.
const COLOR_HEX: Record<string, string> = {
  negro: "#1a1a1a",
  blanco: "#ffffff",
  azul: "#2563eb",
  "azul oscuro": "#1e3a8a",
  "azul rey": "#1e3a8a",
  "azul jean": "#5b7ba0",
  rojo: "#dc2626",
  vinotinto: "#7a1f2b",
  verde: "#16a34a",
  "verde olivo": "#6b7a3a",
  "verde oliva": "#6b7a3a",
  café: "#6b4423",
  marrón: "#6b4423",
  beige: "#d8c3a0",
  crema: "#f2e8d5",
  amarillo: "#eab308",
  mostaza: "#c9962c",
  naranja: "#ea580c",
  rosa: "#ec4899",
  "rosa palo": "#e8b4c0",
  morado: "#7c3aed",
  lila: "#c9b8e8",
  gris: "#6b7280",
  dorado: "#c9a227",
  plateado: "#c0c0c0",
  fucsia: "#d6006d",
  turquesa: "#0d9488",
  coral: "#ff6f61",
  camel: "#c19a6b",
  terracota: "#c1603e",
};

/** Devuelve un hex aproximado para un nombre de color en español (case
 * insensitive). Si no lo reconoce, cae a un gris neutro. */
export function colorAHex(nombre: string): string {
  return COLOR_HEX[nombre.trim().toLowerCase()] ?? "#a3a3a3";
}
