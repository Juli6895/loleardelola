"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchConDispositivo } from "./device-id";
import type { Plan, Topes } from "./planes";

// Quién está usando la app, para las partes que se dibujan en el
// navegador. Antes la barra de arriba no se enteraba de nada: aunque
// hubieras entrado con tu correo, seguía diciendo "Entrar".

export type Usuario = {
  id: string;
  email: string | null;
  nombre: string | null;
  premiumUntil: string | null;
  plan: Plan;
  conSesion: boolean;
};

export function useUsuario() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [topes, setTopes] = useState<Topes | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const res = await fetchConDispositivo("/api/auth/yo");
      const json = await res.json();
      setUsuario(json.usuario ?? null);
      setTopes(json.topes ?? null);
    } catch {
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { usuario, topes, cargando, recargar };
}

/** Con membresía vigente. Lo que está gris para las demás. */
export function tieneMembresia(usuario: Usuario | null): boolean {
  return usuario?.plan === "membresia";
}

/** Cómo llamarla en pantalla: su nombre, o el correo si aún no lo puso. */
export function comoSeLlama(usuario: Usuario | null): string {
  if (!usuario) return "";
  if (usuario.nombre) return usuario.nombre;
  if (usuario.email) return usuario.email.split("@")[0];
  return "";
}
