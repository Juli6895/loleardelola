import { uploadImage } from "./cloudinary";
import { generarImagen, referenciaDesde, type Referencia } from "./gemini";
import { CARPETA_CATALOGO, esFotoDeCatalogo } from "./foto-catalogo";
import type { ClosetCategory } from "@/types";

// =====================================================================
// Fotos del clóset hechas con Gemini
// =====================================================================
// 1. La foto de catálogo: de la foto que sube la usuaria (en el espejo,
//    puesta, en la cama, con más cosas alrededor) sale la prenda SOLA,
//    de frente y en fondo limpio. Esa es la que se ve en su clóset y la
//    que lee Claude para clasificarla: con una sola prenda en la foto,
//    el tipo, el color y el estampado se leen mucho mejor, y la búsqueda
//    de combinaciones sale de ahí.
// 2. La foto del outfit: su prenda junto a las prendas reales de las
//    tiendas que se le sugirieron, para VER la combinación.
//
// Las descripciones van en inglés: los modelos de imagen las siguen con
// más precisión.
// =====================================================================

export { esFotoDeCatalogo };

const CUAL_PRENDA: Record<ClosetCategory, string> = {
  top: "the top / upper-body garment (blouse, shirt, t-shirt, sweater or top)",
  bottom: "the bottom garment (pants, jeans, skirt or shorts)",
  vestido: "the dress or jumpsuit",
  abrigo: "the outer layer (coat, jacket, blazer or cardigan)",
  calzado: "the footwear (show the pair)",
  accesorio: "the accessory (bag, belt, hat, scarf or jewelry)",
};

function pedidoCatalogo(pista: ClosetCategory | null): string {
  const cual = pista
    ? `Isolate ONLY ${CUAL_PRENDA[pista]}.`
    : "Isolate ONLY the main garment: if a person is wearing several items, the one that is most prominent and central in the photo.";
  return [
    "Turn this real photo into a professional e-commerce product photo of ONE clothing item.",
    cual,
    "Show it alone, front view, complete (nothing cropped), centered and filling most of the frame, as an invisible ghost-mannequin shot for clothing or a clean product shot for shoes and accessories, with natural folds and drape.",
    "Reproduce the item EXACTLY as it is in the photo: same color and shade, same print or pattern at the same scale, same fabric texture and sheen, same neckline, sleeves, length, buttons, pockets, seams and details. Do not redesign, recolor, simplify or add anything.",
    "Plain seamless off-white background, soft even studio lighting, subtle natural shadow.",
    "No person, no body parts, no hanger, no other items, no text, no logos, no watermark.",
  ].join(" ");
}

/**
 * La foto de catálogo de una prenda, a partir de la foto real. Devuelve
 * la URL ya subida a Cloudinary. Lanza si Gemini falla: quien llama se
 * queda con la foto real y sigue.
 */
export async function fotoDeCatalogo(
  urlReal: string,
  pista: ClosetCategory | null
): Promise<string> {
  const real = await referenciaDesde(urlReal);
  if (!real) throw new Error("No se pudo descargar la foto de la prenda");
  const imagen = await generarImagen(pedidoCatalogo(pista), { aspecto: "1:1", referencias: [real] });
  return uploadImage(`data:${imagen.mimeType};base64,${imagen.base64}`, CARPETA_CATALOGO);
}

export type PiezaDelOutfit = { foto: string; nombre: string };

/**
 * La foto del outfit armado: su prenda (la protagonista) con las
 * prendas de tienda sugeridas, cada una copiada de su foto real. Las
 * fotos de tienda que no se puedan descargar se saltan; si no queda
 * ninguna, no hay outfit que mostrar.
 */
export async function fotoDelOutfit(
  prenda: { foto: string; nombre: string },
  piezas: PiezaDelOutfit[]
): Promise<string> {
  const suya = await referenciaDesde(prenda.foto);
  if (!suya) throw new Error("No se pudo descargar la foto de su prenda");

  const descargadas = await Promise.all(piezas.map((p) => referenciaDesde(p.foto)));
  const usadas: Array<{ ref: Referencia; nombre: string }> = [];
  descargadas.forEach((ref, i) => {
    if (ref) usadas.push({ ref, nombre: piezas[i].nombre });
  });
  if (usadas.length === 0) throw new Error("No se pudo descargar ninguna foto de tienda");

  const lista = usadas.map((u, i) => `Image ${i + 2}: ${u.nombre}.`).join(" ");
  const pedido = [
    "Create an elegant fashion editorial flat lay of ONE complete women's outfit, made only of the items in the reference images, arranged together as they would be worn (top above bottom, shoes at the bottom, accessories and layers beside them), neatly spaced with no overlap that hides any item.",
    `Image 1: ${prenda.nombre} — the hero piece of the outfit, place it at the center and give it the most space. ${lista}`,
    "Reference images from stores may show a model: use ONLY the clothing item, never the person.",
    "Reproduce every item EXACTLY as in its image: same color and shade, same print or pattern, same fabric, shape and details. Do not add any item that is not in the references.",
    "Plain seamless very light warm-gray background, soft natural top-down light, subtle shadows, high-end magazine look.",
    "No people, no body parts, no hangers, no text, no logos, no watermark.",
  ].join(" ");

  const imagen = await generarImagen(pedido, {
    aspecto: "3:4",
    referencias: [suya, ...usadas.map((u) => u.ref)],
  });
  return uploadImage(`data:${imagen.mimeType};base64,${imagen.base64}`, "outfits");
}
