import { NextResponse } from "next/server";
import { EVENTOS, contextoDe, registrar, type NombreEvento } from "@/lib/eventos";
import { usuarioActual } from "@/lib/sesion";

// POST /api/eventos  { nombre, props? }
//
// Para los eventos que solo el navegador conoce: que alguien VIO la
// página de membresía, que TOCÓ el botón de pagar. El servidor no se
// entera de eso por su cuenta, y son justo los pasos del embudo donde
// más gente se cae.
//
// Solo acepta nombres de la lista cerrada. Si cualquiera pudiera
// inventar nombres, en tres meses el tablero sería ilegible.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!EVENTOS.includes(body.nombre)) {
      return NextResponse.json({ error: "Evento desconocido" }, { status: 400 });
    }

    // Se resuelve la usuaria para poder cruzar el recorrido con su
    // nivel (anónima / registrada / con membresía).
    const usuario = await usuarioActual(req).catch(() => null);

    // Las props que manda el navegador se recortan: es dato no
    // confiable, y el tablero no necesita más de unas pocas claves.
    const props: Record<string, unknown> = {};
    if (body.props && typeof body.props === "object") {
      for (const [k, v] of Object.entries(body.props).slice(0, 8)) {
        if (typeof v === "string") props[k] = v.slice(0, 120);
        else if (typeof v === "number" || typeof v === "boolean") props[k] = v;
      }
    }
    if (usuario) props.nivel = usuario.plan;

    await registrar(body.nombre as NombreEvento, contextoDe(req, usuario?.id), props);
    return NextResponse.json({ ok: true });
  } catch {
    // Anotar nunca puede romper nada del lado de la usuaria.
    return NextResponse.json({ ok: false });
  }
}
