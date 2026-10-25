import { NextResponse } from "next/server";
import { buscarPromos } from "@/lib/catalogo-tiendas";

// GET /api/promos?tipos=vestido|blusa
//
// Prendas en promoción de las tiendas de la lista, para el panel "Promo".
// Sin tipos, una mezcla general; con tipos (lo que se detectó en la
// foto), solo de esas prendas. No usa IA: sale del catálogo de cada
// tienda, que ya se guarda 30 minutos en memoria.
// Con 45 tiendas, la primera búsqueda (sin caché) puede pasar de los 10
// segundos que Vercel da por defecto.
export const maxDuration = 30;

export async function GET(req: Request) {
  const tipos = (new URL(req.url).searchParams.get("tipos") ?? "")
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6);
  try {
    return NextResponse.json({ promos: await buscarPromos(tipos, 12) });
  } catch (e) {
    console.error("[api/promos] falló:", e);
    return NextResponse.json({ promos: [] });
  }
}
