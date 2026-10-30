"use client";

import { useEffect, useState } from "react";
import { fetchConDispositivo } from "./device-id";

// =====================================================================
// Lo que comparten la barra de arriba y las promociones
// =====================================================================
// El botón de Filtros (las rayitas) vive en la barra, al lado de
// "Promociones", y el panel lo abre la página de promociones
// (components/Promociones.tsx). Se hablan por eventos del navegador:
// - abrirFiltros(): la barra le pide a la página que abra el panel.
// - el tipo de prenda escogido vive en sessionStorage (es de esta
//   visita), para que la barra pueda mostrar cuántos filtros hay.
// La talla y las marcas ya se guardan aparte (tallas-favoritas,
// marcas-favoritas).
// =====================================================================

const ABRIR = "loleardelola:abrir-filtros";
const CLAVE_PRENDAS = "loleardelola:prendas";
const PRENDAS_CAMBIARON = "loleardelola:prendas-cambiaron";

export function abrirFiltros(): void {
  window.dispatchEvent(new Event(ABRIR));
}

/** Llama `alAbrir` cuando la barra pide abrir los filtros. */
export function useAlAbrirFiltros(alAbrir: () => void): void {
  useEffect(() => {
    window.addEventListener(ABRIR, alAbrir);
    return () => window.removeEventListener(ABRIR, alAbrir);
  }, [alAbrir]);
}

function leerPrendas(): string[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(CLAVE_PRENDAS) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function guardarPrendas(prendas: string[]): void {
  try {
    sessionStorage.setItem(CLAVE_PRENDAS, JSON.stringify(Array.from(new Set(prendas))));
  } catch {
    // Sin almacenamiento: el filtro dura lo que dure la página.
  }
  window.dispatchEvent(new Event(PRENDAS_CAMBIARON));
}

/** El tipo de prenda escogido en esta visita (vacío = todas). */
export function usePrendasFiltro(): string[] {
  const [prendas, setPrendas] = useState<string[]>([]);
  useEffect(() => {
    const actualizar = () => setPrendas(leerPrendas());
    actualizar();
    window.addEventListener(PRENDAS_CAMBIARON, actualizar);
    return () => window.removeEventListener(PRENDAS_CAMBIARON, actualizar);
  }, []);
  return prendas;
}

export type AccesoPromos = { permitido: boolean; plan: "anonimo" | "gratis" | "membresia"; hasta: string | null };

// Se pregunta una vez por visita, aunque lo usen la barra y la página.
let pedido: Promise<AccesoPromos> | null = null;
export function pedirAccesoPromos(): Promise<AccesoPromos> {
  pedido ??= fetchConDispositivo("/api/promos/acceso")
    .then((r) => r.json() as Promise<AccesoPromos>)
    .catch(() => ({ permitido: true, plan: "anonimo" as const, hasta: null }));
  return pedido;
}

/** ¿Puede ver las promociones? null mientras se pregunta. */
export function useAccesoPromos(): AccesoPromos | null {
  const [acceso, setAcceso] = useState<AccesoPromos | null>(null);
  useEffect(() => {
    let vigente = true;
    pedirAccesoPromos().then((a) => vigente && setAcceso(a));
    return () => {
      vigente = false;
    };
  }, []);
  return acceso;
}
