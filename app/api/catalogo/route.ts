import { NextResponse } from "next/server";
import { buscarEnCatalogos } from "@/lib/catalogo-tiendas";

// GET /api/catalogo?q=vestido+floral+rojo+mujer
//
// Devuelve prendas con foto y precio, sacadas del catálogo que las
// propias tiendas publican. Va aparte de /api/vision a propósito: la
// primera vez hay que bajar los catálogos (~1.5s por tienda, en
// paralelo), y no queremos que eso demore los resultados principales.
// La página muestra primero las prendas detectadas y pide esto después.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Falta el término de búsqueda" }, { status: 400 });
  }

  try {
    const productos = await buscarEnCatalogos(q, 8);
    return NextResponse.json({ productos });
  } catch (e) {
    console.error("[api/catalogo] falló:", e);
    // Esto es un complemento, no el resultado principal: si falla, la
    // página simplemente no muestra la fila, sin romper la búsqueda.
    return NextResponse.json({ productos: [] });
  }
}
