import { NextResponse, type NextRequest } from "next/server";

// =====================================================================
// La dirección vieja lleva a la nueva
// =====================================================================
// Desde el 30 de octubre de 2026 la página vive en www.loleardlola.com.
// Quien entre por loleardelola.vercel.app (enlaces viejos, la app
// instalada antes) llega a la misma página en el dominio nuevo.
//
// Lo que NO se redirige, para no romper nada:
// - /api: los crons de Vercel y los pagos llaman directo a la API.
// - /sw.js, el manifiesto y los íconos: la app ya instalada los pide a
//   su dirección, y un service worker no puede venir de una redirección.
// =====================================================================

const VIEJO = "loleardelola.vercel.app";
const NUEVO = "https://www.loleardlola.com";

export function middleware(req: NextRequest) {
  if (req.headers.get("host") !== VIEJO) return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  return NextResponse.redirect(`${NUEVO}${pathname}${search}`, 308);
}

export const config = {
  // Todo menos la API, los archivos de Next, el service worker, el
  // manifiesto, los íconos y la página sin internet.
  matcher: ["/((?!api/|_next/|sw\\.js|manifest\\.webmanifest|iconos/|sin-internet\\.html|favicon).*)"],
};
