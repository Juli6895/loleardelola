// =====================================================================
// Gemini (Google) para generar imágenes
// =====================================================================
// Se usa en el clóset, a partir de fotos reales:
// - la foto de catálogo de cada prenda que sube la usuaria (la prenda
//   sola, de frente, en fondo limpio), que es la que después lee Claude
//   para clasificarla y buscar con qué combinarla;
// - la foto del outfit armado: su prenda junto a las prendas reales de
//   las tiendas que se le sugirieron.
// Claude sigue siendo quien lee las fotos; Gemini solo las compone.
//
// La llave va en la variable de entorno GEMINI_API_KEY (Vercel y
// .env.local). Se crea en https://aistudio.google.com. Cada imagen se
// cobra (~US$0,067 con gemini-3.1-flash-image a 1K, sin capa gratis):
// por eso cada uso tiene tope (ver lib/planes.ts).
// =====================================================================

const MODELO = "gemini-3.1-flash-image";
const URL_API = "https://generativelanguage.googleapis.com/v1beta/interactions";

// Los formatos de foto que Gemini acepta como referencia.
const TIPOS_REFERENCIA = ["image/png", "image/jpeg", "image/webp"];

export type ImagenGenerada = {
  base64: string;
  mimeType: string;
  // Si Gemini rechazó el formato pedido, por qué: queda anotado para
  // poder corregirlo sin adivinar.
  formatoRechazado: string | null;
};

export type Referencia = { base64: string; mimeType: string };

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

/**
 * Descarga una foto para dársela a Gemini como referencia. Las de
 * Cloudinary se piden en JPG y a 1024 px (Cloudinary puede entregar
 * AVIF, que Gemini no recibe). Devuelve null si no se pudo o si llega
 * en un formato que Gemini no acepta: quien llama decide si sigue sin
 * esa foto.
 */
export async function referenciaDesde(url: string): Promise<Referencia | null> {
  const pedida = url.includes("res.cloudinary.com") && url.includes("/image/upload/")
    ? url.replace("/image/upload/", "/image/upload/f_jpg,w_1024,c_limit/")
    : url;
  try {
    const res = await fetch(pedida, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/jpeg,image/png,image/webp;q=0.9",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const tipo = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!TIPOS_REFERENCIA.includes(tipo)) return null;
    const datos = Buffer.from(await res.arrayBuffer());
    // Una "foto" de pocos bytes es un pixel de rastreo o un error.
    if (datos.length < 2000 || datos.length > 8 * 1024 * 1024) return null;
    return { base64: datos.toString("base64"), mimeType: tipo };
  } catch {
    return null;
  }
}

/**
 * Genera una imagen a partir de una descripción y, si se dan, de fotos
 * de referencia (van en el orden en que se nombran en la descripción).
 */
export async function generarImagen(
  descripcion: string,
  opciones: { aspecto?: string; referencias?: Referencia[] } = {}
): Promise<ImagenGenerada> {
  const llave = process.env.GEMINI_API_KEY;
  if (!llave) throw new Error("Falta GEMINI_API_KEY");

  const base = {
    model: MODELO,
    input: [
      { type: "text", text: descripcion },
      ...(opciones.referencias ?? []).map((r) => ({
        type: "image",
        mime_type: r.mimeType,
        data: r.base64,
      })),
    ],
  };
  let res = await pedir(llave, {
    ...base,
    response_format: {
      type: "image",
      mime_type: "image/png",
      aspect_ratio: opciones.aspecto ?? "1:1",
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
