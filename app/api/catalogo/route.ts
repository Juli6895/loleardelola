import { NextResponse } from "next/server";
import { buscarEnCatalogos, type ConsultaPrenda } from "@/lib/catalogo-tiendas";

// GET /api/catalogo?tipo=vestido&color=rojo&rasgos=floral|midi|sin mangas
//
// Devuelve prendas con foto y precio, sacadas del catálogo que las
// propias tiendas publican. Va aparte de /api/vision a propósito: la
// primera vez hay que bajar los catálogos (~1.5s por tienda, en
// paralelo), y no queremos que eso demore los resultados principales.
//
// Los rasgos van separados por "|" y no por coma, porque varios traen
// coma adentro ("manga 3/4, abullonada" sale de un solo campo).
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const tipo = params.get("tipo")?.trim();
  if (!tipo) {
    return NextResponse.json({ error: "Falta el tipo de prenda" }, { status: 400 });
  }

  const consulta: ConsultaPrenda = {
    tipo,
    color: params.get("color")?.trim() || null,
    rasgos: (params.get("rasgos") ?? "")
      .split("|")
      .map((r) => r.trim())
      .filter(Boolean),
  };

  try {
    // Se devuelven más de las 8 que se muestran en la fila: las de
    // sobra son las que alimentan las tarjetas de Instagram, que
    // necesitan una prenda de UNA tienda puntual, y esa puede no estar
    // entre las mejores 8 del conjunto.
    const productos = await buscarEnCatalogos(consulta, 24);
    return NextResponse.json({ productos });
  } catch (e) {
    console.error("[api/catalogo] falló:", e);
    // Esto es un complemento, no el resultado principal: si falla, la
    // página simplemente no muestra la fila, sin romper la búsqueda.
    return NextResponse.json({ productos: [] });
  }
}
