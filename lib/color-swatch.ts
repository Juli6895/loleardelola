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
  chocolate: "#4a2c1a",
  crudo: "#efe6d8",
  marfil: "#f5f0e6",
  caqui: "#8a7b5c",
  khaki: "#8a7b5c",
  "verde salvia": "#87a06b",
  salvia: "#87a06b",
  "rosa viejo": "#c98a99",
  "rosa empolvado": "#c98a99",
  borgoña: "#6e1423",
  vino: "#6e1423",
  "azul medio": "#3b6ea5",
  "azul denim": "#3f5f7a",
  denim: "#3f5f7a",
  indigo: "#3a3f6b",
  índigo: "#3a3f6b",
  "gris perla": "#c9c9c9",
};

/**
 * Devuelve un hex aproximado para un nombre de color en español. Si no
 * hay coincidencia exacta, busca la clave conocida más larga que esté
 * contenida en el nombre — así "mostaza pálido" o "azul denim oscuro"
 * igual encuentran un color de referencia en vez de caer siempre al
 * gris. Solo es para pintar un puntico junto al nombre, no necesita ser
 * exacto.
 */
export function colorAHex(nombre: string): string {
  const limpio = nombre.trim().toLowerCase();
  if (COLOR_HEX[limpio]) return COLOR_HEX[limpio];

  const claves = Object.keys(COLOR_HEX).sort((a, b) => b.length - a.length);
  for (const clave of claves) {
    if (limpio.includes(clave)) return COLOR_HEX[clave];
  }
  return "#a3a3a3";
}
