// =====================================================================
// Gemini (Google) para generar imágenes
// =====================================================================
// Se usa para la ilustración de la usuaria en Mi perfil: un dibujo de
// ella con su silueta, su tono de piel y su pelo. Claude sigue siendo
// quien lee las fotos (búsqueda y clóset); Gemini solo dibuja.
//
// La llave va en la variable de entorno GEMINI_API_KEY (Vercel y
// .env.local). Se crea en https://aistudio.google.com. Cada imagen se
// cobra (~US$0,067 con gemini-3.1-flash-image a 1K, sin capa gratis):
// por eso quien llama guarda el resultado y no la vuelve a pedir si los
// datos no cambiaron.
// =====================================================================

const MODELO = "gemini-3.1-flash-image";
const URL_API = "https://generativelanguage.googleapis.com/v1beta/interactions";

export type ImagenGenerada = {
  base64: string;
  mimeType: string;
  // Si Gemini rechazó el formato pedido (vertical), por qué: queda
  // anotado para poder corregirlo sin adivinar.
  formatoRechazado: string | null;
};

/**
 * Busca la imagen en la respuesta. La API de Gemini cambió de forma más
 * de una vez (output_image, inlineData...), así que en vez de amarrarse
 * a una ruta exacta se busca el primer objeto con datos en base64 y un
 * tipo de imagen.
 */
function encontrarImagen(nodo: unknown): ImagenGenerada | null {
  if (!nodo || typeof nodo !== "object") return null;
  const o = nodo as Record<string, unknown>;
  const datos = o.data ?? o.bytesBase64Encoded;
  const tipo = o.mime_type ?? o.mimeType ?? "image/png";
  if (typeof datos === "string" && datos.length > 1000 && String(tipo).startsWith("image/")) {
    return { base64: datos, mimeType: String(tipo), formatoRechazado: null };
  }
  for (const valor of Object.values(o)) {
    const encontrada = encontrarImagen(valor);
    if (encontrada) return encontrada;
  }
  return null;
}

async function pedir(llave: string, cuerpo: unknown): Promise<Response> {
  return fetch(URL_API, {
    method: "POST",
    headers: { "x-goog-api-key": llave, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(90_000),
  });
}

/** Genera una imagen a partir de una descripción. */
export async function generarImagen(
  descripcion: string,
  formato: { aspecto?: string } = {}
): Promise<ImagenGenerada> {
  const llave = process.env.GEMINI_API_KEY;
  if (!llave) throw new Error("Falta GEMINI_API_KEY");

  const base = { model: MODELO, input: [{ type: "text", text: descripcion }] };
  let res = await pedir(llave, {
    ...base,
    response_format: {
      type: "image",
      mime_type: "image/png",
      aspect_ratio: formato.aspecto ?? "2:3",
      image_size: "1K",
    },
  });
  // Si el modelo no acepta el formato pedido, se intenta sin él: es
  // mejor una imagen en otro formato que ninguna. El motivo se guarda.
  let formatoRechazado: string | null = null;
  if (res.status === 400) {
    formatoRechazado = (await res.text()).slice(0, 300);
    res = await pedir(llave, base);
  }

  const texto = await res.text();
  if (!res.ok) throw new Error(`Gemini respondió ${res.status}: ${texto.slice(0, 300)}`);

  const imagen = encontrarImagen(JSON.parse(texto));
  if (!imagen) throw new Error("Gemini no devolvió ninguna imagen");
  return { ...imagen, formatoRechazado };
}
