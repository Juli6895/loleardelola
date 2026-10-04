import { v2 as cloudinary } from "cloudinary";

// Configuración del SDK de Cloudinary (solo servidor)
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Sube una imagen (base64 o URL remota) a Cloudinary, en la carpeta
 * `loleardelola` o en una subcarpeta (ej. "catalogo", las fotos de
 * prenda hechas con Gemini). Devuelve la URL segura para mostrarla.
 */
export async function uploadImage(source: string, subcarpeta?: string): Promise<string> {
  const result = await cloudinary.uploader.upload(source, {
    folder: subcarpeta ? `loleardelola/${subcarpeta}` : "loleardelola",
    resource_type: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });
  return result.secure_url;
}

export { cloudinary };
