import { NextResponse } from "next/server";
import { deLosTipos, facetas, filtrar, porMarca, todasLasPromos, type Promo } from "@/lib/promos-guardadas";

// GET /api/promos
//   ?tipos=vestido|blusa  → { relacionadas, marcas }: las de esas prendas
//                           y todas, agrupadas por marca (4 de cada una).
//   ?marca=dominio&desde=0[&tipos=...] → { promos, total }: todas las de
//                           esa marca, de a POR_PAGINA ("Ver más promos
//                           de esta marca").
//   ?muestra=1            → { promos }: unas pocas, para la vista borrosa
//                           cuando se acabó la prueba.
//   &marcas=a.com,b.co    → solo esas marcas ("Mis marcas" del menú).
//   &prendas=vestido,jean → filtro de tipo de prenda de la página.
//   &tallas=S,M           → solo las que tienen esa talla disponible y
//                           rebajada, con el precio de esa talla.
// La respuesta principal trae además { facetas }: cuántas hay de cada
// tipo y de cada talla, para los botones del filtro.
//
// Salen de la revisión diaria (lib/promos-diarias.ts): más de 10% de
// descuento y con una talla disponible. Quién puede verlas lo decide
// /api/promos/acceso. La respuesta es la misma para todas, así que se
// guarda en la caché de Vercel media hora.
export const maxDuration = 60;

const VISTA_PREVIA = 4;
const POR_PAGINA = 40;
const CACHE = "public, s-maxage=1800, stale-while-revalidate=3600";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const tipos = (params.get("tipos") ?? "")
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
  const marca = params.get("marca");
  const lista = (nombre: string) =>
    (params.get(nombre) ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 30);
  const prendas = lista("prendas");
  const tallas = lista("tallas");
  const marcas = new Set(
    (params.get("marcas") ?? "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)
  );

  try {
    const guardadas = await todasLasPromos();
    const deMisMarcas = marcas.size > 0 ? guardadas.filter((p) => marcas.has(p.dominio)) : guardadas;
    const todas = filtrar(deMisMarcas, prendas, tallas);
    // Las tallas no viajan al navegador: ya se usaron para el precio.
    const sinTallas = (p: Promo) => {
      const { tallas: _t, ...resto } = p;
      return resto;
    };
    const json = (cuerpo: unknown) => NextResponse.json(cuerpo, { headers: { "Cache-Control": CACHE } });

    if (params.get("muestra") === "1") return json({ promos: guardadas.slice(0, 8).map(sinTallas) });

    if (marca) {
      const deLaMarca = deLosTipos(todas, tipos).filter((p) => p.dominio === marca);
      const desde = Math.max(0, Number(params.get("desde")) || 0);
      return json({ promos: deLaMarca.slice(desde, desde + POR_PAGINA).map(sinTallas), total: deLaMarca.length });
    }

    const grupos = (lista: Promo[]) =>
      porMarca(lista, VISTA_PREVIA).map((g) => ({ ...g, promos: g.promos.map(sinTallas) }));
    return json({
      relacionadas: tipos.length > 0 ? grupos(deLosTipos(todas, tipos)) : [],
      marcas: grupos(todas),
      facetas: facetas(deMisMarcas, prendas, tallas),
    });
  } catch (e) {
    console.error("[api/promos] falló:", e);
    return NextResponse.json({ relacionadas: [], marcas: [], promos: [], total: 0 });
  }
}
