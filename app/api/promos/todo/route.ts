import { NextResponse } from "next/server";
import { prendasDeLaMarca } from "@/lib/catalogo-completo";
import { estilosValidos } from "@/lib/estilo-prenda";

// GET /api/promos/todo?marca=dominio&desde=1[&prendas=vestido,jean&tallas=S,M]
//   → { prendas, siguiente }: "Ver todo" de Promociones. Todas las
//   prendas de esa marca (no solo las rebajadas), de lo más nuevo a lo
//   más viejo, con talla disponible. `siguiente` es la página de la
//   tienda para "Cargar más" (null: no hay más). Ver lib/catalogo-completo.ts.
//
// La respuesta es la misma para todas: queda 10 minutos en la caché de
// Vercel, para que lo nuevo de cada tienda se vea pronto. Pasados los 10
// minutos se puede servir la copia vieja solo 1 minuto más mientras se
// lee de nuevo la tienda (antes eran 30: "Ver todo" podía mostrar un
// catálogo de hasta 40 minutos). No se baja más porque algunas tiendas
// limitan cuántas veces se les pide el catálogo. Si la tienda no
// respondió no se guarda: antes el vacío quedaba hasta hora y media.
export const maxDuration = 60;

const CACHE = "public, s-maxage=600, stale-while-revalidate=60";

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
    const r = await prendasDeLaMarca(marca, desde, lista("prendas"), lista("tallas"), estilosValidos(lista("estilos")));
    const { fallo, ...cuerpo } = r;
    return NextResponse.json(cuerpo, { headers: { "Cache-Control": fallo ? "no-store" : CACHE } });
  } catch (e) {
    console.error("[api/promos/todo] falló:", e);
    return NextResponse.json({ prendas: [], siguiente: null }, { headers: { "Cache-Control": "no-store" } });
  }
}
