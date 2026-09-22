import { NextResponse } from "next/server";
import { cerrarSesion } from "@/lib/sesion";

// POST /api/auth/salir → cierra la sesión de este navegador.
export async function POST() {
  await cerrarSesion();
  return NextResponse.json({ ok: true });
}
