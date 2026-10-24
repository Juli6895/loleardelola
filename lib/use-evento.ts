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

/**
 * Anota que se hizo clic hacia UN comercio puntual (no una búsqueda
 * genérica de Google Shopping, que no dice a cuál tienda entró la
 * usuaria). `origen` es desde dónde: "buscar", "closet", "manual" o
 * "instagram" — para saber también qué pantalla está generando esos
 * clics, no solo qué comercio se lleva más.
 */
export function anotarClicComercio(datos: {
  tienda: string;
  dominio: string | null;
  origen: string;
  // El nombre de la prenda en la tienda, para saber cuáles atraen más.
  prenda?: string;
}): void {
  anotar("comercio_clic", datos);
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

  // Las páginas ("closet_visto", "membresia_vista"...) también anotan
  // cuánto tiempo se quedó la usuaria en ellas.
  const seccion = /_vist[oa]$/.test(nombre) ? nombre.replace(/_vist[oa]$/, "") : null;
  useTiempoEnPagina(seccion);
}

/**
 * Cuánto tiempo de verdad pasó en una sección: solo cuenta mientras la
 * pestaña está a la vista (si se va a WhatsApp y vuelve, no suma), y se
 * anota cuando sale de la página o la deja de ver.
 */
function useTiempoEnPagina(seccion: string | null) {
  useEffect(() => {
    if (!seccion || typeof document === "undefined") return;
    let desde = document.visibilityState === "visible" ? Date.now() : null;
    let acumulado = 0;

    const pausar = () => {
      if (desde !== null) acumulado += Date.now() - desde;
      desde = null;
    };
    const enviar = () => {
      pausar();
      const segundos = Math.round(acumulado / 1000);
      acumulado = 0;
      // Menos de 2 segundos es un rebote o un clic de paso.
      if (segundos >= 2) anotar("tiempo_pagina", { seccion, segundos: Math.min(segundos, 3600) });
    };
    const alCambiar = () => {
      if (document.visibilityState === "hidden") enviar();
      else desde = Date.now();
    };

    document.addEventListener("visibilitychange", alCambiar);
    window.addEventListener("pagehide", enviar);
    return () => {
      document.removeEventListener("visibilitychange", alCambiar);
      window.removeEventListener("pagehide", enviar);
      // Al navegar a otra sección dentro de la app.
      enviar();
    };
  }, [seccion]);
}
