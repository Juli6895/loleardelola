"use client";

import { useEffect, useRef } from "react";
import { getDeviceId } from "./device-id";

// Anota eventos desde el navegador. Ver lib/eventos.ts para el porqué.
//
// Nunca espera la respuesta ni muestra errores: si la analítica falla,
// a la usuaria no le pasa nada y no tiene por qué enterarse.

// Agrupa una visita. Vive en sessionStorage, así que se renueva al
// cerrar la pestaña — que es justo lo que queremos medir como "una
// visita".
function sesionId(): string {
  try {
    const k = "loleardelola:sesion";
    let v = sessionStorage.getItem(k);
    if (!v) {
      v = crypto.randomUUID();
      sessionStorage.setItem(k, v);
    }
    return v;
  } catch {
    return "";
  }
}

export function anotar(nombre: string, props: Record<string, unknown> = {}): void {
  try {
    const cuerpo = JSON.stringify({ nombre, props });
    fetch("/api/eventos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": getDeviceId(),
        "x-sesion-id": sesionId(),
      },
      body: cuerpo,
      // No frena la navegación: si la usuaria se va de la página, el
      // evento igual sale.
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Ni siquiera esto puede tumbar nada.
  }
}

/** Anota una vez al montar. Para "vio esta página". */
export function useAnotarUnaVez(nombre: string, props: Record<string, unknown> = {}) {
  const yaFue = useRef(false);
  useEffect(() => {
    if (yaFue.current) return;
    yaFue.current = true;
    anotar(nombre, props);
    // Las props se serializan para no relanzar por identidad de objeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre, JSON.stringify(props)]);
}
