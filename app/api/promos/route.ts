import { NextResponse } from "next/server";
import { buscarPromos } from "@/lib/catalogo-tiendas";

// GET /api/promos?tipos=vestido|blusa
//
// Prendas en promoción de las tiendas de la lista, para el panel "Promo".
// Con tipos (lo que se detectó en la foto), solo de esas prendas, hasta
// 3 por tienda (hasta 36). Sin tipos, "otros descuentos" de todo tipo
// de prenda, hasta 2 por tienda (hasta 60). El panel pide las dos por separado, para que las
// de su búsqueda no esperen a las demás. No usa IA: sale del catálogo de cada
// tienda, que ya se guarda 30 minutos en memoria.
// Con más de 40 tiendas, la primera búsqueda (sin caché) puede pasar de los 10
// segundos que Vercel da por defecto.
export const maxDuration = 60;

export async function GET(req: Request) {
  const tipos = (new URL(req.url).searchParams.get("tipos") ?? "")
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6);
  try {
    const promos = tipos.length > 0 ? await buscarPromos(tipos, 36, 3) : await buscarPromos([], 60, 2);
    return NextResponse.json({ promos });
  } catch (e) {
    console.error("[api/promos] falló:", e);
    return NextResponse.json({ promos: [] });
  }
}
