import { NextResponse } from "next/server";
import { prendasDeLaMarca } from "@/lib/catalogo-completo";

// GET /api/promos/todo?marca=dominio&desde=1[&prendas=vestido,jean&tallas=S,M]
//   → { prendas, siguiente }: "Ver todo" de Promociones. Todas las
//   prendas de esa marca (no solo las rebajadas), de lo más nuevo a lo
//   más viejo, con talla disponible. `siguiente` es la página de la
//   tienda para "Cargar más" (null: no hay más). Ver lib/catalogo-completo.ts.
//
// La respuesta es la misma para todas: queda media hora en la caché de Vercel.
export const maxDuration = 60;

const CACHE = "public, s-maxage=1800, stale-while-revalidate=3600";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const marca = (params.get("marca") ?? "").trim().toLowerCase();
  const desde = Math.max(1, Math.min(200, Number(params.get("desde")) || 1));
  const lista = (nombre: string) =>
    (params.get(nombre) ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 30);
  if (!marca) return NextResponse.json({ prendas: [], siguiente: null }, { status: 400 });

  try {
    const r = await prendasDeLaMarca(marca, desde, lista("prendas"), lista("tallas"));
    return NextResponse.json(r, { headers: { "Cache-Control": CACHE } });
  } catch (e) {
    console.error("[api/promos/todo] falló:", e);
    return NextResponse.json({ prendas: [], siguiente: null });
  }
}
