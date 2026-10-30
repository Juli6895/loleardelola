import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import InstalarApp from "@/components/InstalarApp";
import ErroresGlobales from "@/components/ErroresGlobales";

// Fuentes — Playfair para titulares, Inter para cuerpo
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LoleardLola — Encuentra dónde comprar el outfit que te enamoró",
  description:
    "Conecta tu Pinterest, sube una inspiración y te decimos dónde comprar prendas similares online. Moda para Colombia.",
  // Como app instalada (ver app/manifest.ts): en iPhone, el ícono de la
  // pantalla de inicio y el nombre bajo él salen de acá.
  applicationName: "LoleardLola",
  appleWebApp: { capable: true, title: "LoleardLola", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/iconos/icono-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/iconos/icono-180.png", sizes: "180x180" }],
  },
  // La dirección de la página desde octubre de 2026 (las imágenes y los
  // enlaces al compartir salen de aquí).
  metadataBase: new URL("https://www.loleardlola.com"),
  openGraph: {
    url: "https://www.loleardlola.com",
    title: "LoleardLola",
    description:
      "Encuentra dónde comprar los outfits que te inspiran en Pinterest.",
    type: "website",
    locale: "es_CO",
  },
};

export const viewport: Viewport = {
  themeColor: "#db627f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CO" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-rosa-50 font-sans text-noche">
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="border-t border-rosa-100 bg-white/60 px-4 py-8 text-center text-sm text-noche/60">
            <p className="font-display italic">LoleardLola</p>
            <p className="mt-1">
              Hecho con amor en Colombia · {new Date().getFullYear()}
            </p>
            <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
              <Link href="/preguntas" className="hover:text-rosa-600 hover:underline">
                Preguntas frecuentes
              </Link>
              <Link href="/terminos" className="hover:text-rosa-600 hover:underline">
                Términos y condiciones
              </Link>
              <Link href="/privacy" className="hover:text-rosa-600 hover:underline">
                Privacidad
              </Link>
              <a href="mailto:contacto@lakaja.co" className="hover:text-rosa-600 hover:underline">
                contacto@lakaja.co
              </a>
            </p>
          </footer>
          <InstalarApp />
          <ErroresGlobales />
        </Providers>
      </body>
    </html>
  );
}
