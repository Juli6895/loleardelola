import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";

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
  title: "LolearDeLola — Encuentra dónde comprar el outfit que te enamoró",
  description:
    "Conecta tu Pinterest, sube una inspiración y te decimos dónde comprar prendas similares online. Moda para Colombia.",
  openGraph: {
    title: "LolearDeLola",
    description:
      "Encuentra dónde comprar los outfits que te inspiran en Pinterest.",
    type: "website",
    locale: "es_CO",
  },
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
            <p className="font-display italic">LolearDeLola</p>
            <p className="mt-1">
              Hecho con amor en Colombia · {new Date().getFullYear()}
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
