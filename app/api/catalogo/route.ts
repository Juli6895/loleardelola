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

  const color = params.get("color")?.trim() || null;

  // ?flexible=1 lo piden las tarjetas de Instagram: no buscan "la misma
  // prenda" sino una prenda de ESA tienda para ponerle foto a la
  // tarjeta. Con la búsqueda estricta casi nunca había una (una tienda
  // rara vez tiene justo el mismo estampado), y las tarjetas quedaban
  // sin foto. Mismo tipo y color, sin exigir estampado ni rasgos; si
  // así no hay, solo el tipo.
  if (params.get("flexible") === "1") {
    try {
      const [conColor, soloTipo] = await Promise.all([
        color ? buscarEnCatalogos({ tipo, color, rasgos: [] }, 24) : Promise.resolve([]),
        buscarEnCatalogos({ tipo, color: null, rasgos: [] }, 24),
      ]);
      const vistos = new Set<string>();
      const productos = [...conColor, ...soloTipo].filter((p) => !vistos.has(p.url) && !!vistos.add(p.url));
      return NextResponse.json({ productos });
    } catch (e) {
      console.error("[api/catalogo] flexible falló:", e);
      return NextResponse.json({ productos: [] });
    }
  }

  const consulta: ConsultaPrenda = {
    // Esto lo usa la búsqueda por foto: la prenda es una de verdad, así
    // que su estampado y su textura (lentejuelas, encaje...) se exigen.
    estricto: true,
    tipo,
    color,
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
