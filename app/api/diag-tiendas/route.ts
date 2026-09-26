import { NextResponse } from "next/server";

// Temporal: qué responden las tiendas a los servidores de Vercel. Se borra al terminar.
const TIENDAS = ["especia.com.co", "julianasanchez.co", "inmaculadavj.com", "gracies.com.co", "bybla.com.co", "navissi.com", "jeansandblouses.com", "esprit.com.co", "ticketstores.co"];

async function probar(url: string) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { headers: { "user-agent": "LoleardLola/1.0 (+https://loleardelola.vercel.app)" }, signal: AbortSignal.timeout(9000) });
    const txt = await r.text();
    let n: number | string = "no-json";
    try { const j = JSON.parse(txt); n = j?.resources?.results?.products?.length ?? j?.products?.length ?? "?"; } catch {}
    return { status: r.status, ms: Date.now() - t0, productos: n, inicio: txt.slice(0, 80) };
  } catch (e: any) {
    return { error: String(e?.name ?? e), ms: Date.now() - t0 };
  }
}

export async function GET() {
  const out: Record<string, unknown> = {};
  await Promise.all(TIENDAS.map(async (t) => {
    out[t] = {
      suggest: await probar(`https://${t}/search/suggest.json?q=camiseta%20blanc&resources[type]=product&resources[limit]=10&resources[options][unavailable_products]=hide`),
      productsJson: await probar(`https://${t}/products.json?limit=5`),
    };
  }));
  return NextResponse.json(out);
}
