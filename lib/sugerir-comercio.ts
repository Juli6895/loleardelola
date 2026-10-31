// Entre más comercios, más promociones y más búsquedas con resultado. Las
// usuarias saben mejor que nadie dónde compran: este enlace abre su
// correo con el asunto y los datos que necesitamos para agregar la
// tienda (nombre y página web; de la página sale el catálogo).
export const CORREO_COMERCIOS = "hola@loleardlola.com";

const ASUNTO = "Quiero este comercio en LoleardLola";
const CUERPO = "Nombre del comercio:\nPágina web:\nInstagram (si lo sabes):\n";

export const ENLACE_SUGERIR = `mailto:${CORREO_COMERCIOS}?subject=${encodeURIComponent(ASUNTO)}&body=${encodeURIComponent(CUERPO)}`;
