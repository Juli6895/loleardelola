import type { MetadataRoute } from "next";

// Lo que el celular necesita para instalar LoleardLola como app (PWA):
// nombre, ícono, colores y que abra en pantalla completa, sin la barra
// del navegador. Next lo sirve en /manifest.webmanifest y lo enlaza solo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LoleardLola",
    short_name: "LoleardLola",
    description: "Tu asesora de estilo: encuentra dónde comprar, arma outfits con tu clóset y tu manual de estilo.",
    lang: "es-CO",
    start_url: "/?origen=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff5f7",
    theme_color: "#db627f",
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // La letra está dentro de la zona segura: Android puede recortarlo
      // en círculo o en cuadro redondeado sin cortarla.
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
