"use client";

import { useEffect, useState } from "react";
import { fetchConDispositivo } from "./device-id";
import { anotar } from "./use-evento";

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
  anotar("filtros_abiertos");
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
  anotar("filtro_aplicado", { filtro: "prenda", cantidad: new Set(prendas).size });
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

// Se comparte entre la barra y la página, pero solo por un rato: la app
// instalada puede quedar abierta días, y si se guardara para siempre,
// quien acaba de pagar la membresía seguiría viendo el bloqueo hasta
// cerrar la app.
const VIGENCIA_ACCESO_MS = 30_000;
let pedido: Promise<AccesoPromos> | null = null;
let pedidoEn = 0;
export function pedirAccesoPromos(): Promise<AccesoPromos> {
  if (!pedido || Date.now() - pedidoEn > VIGENCIA_ACCESO_MS) {
    pedidoEn = Date.now();
    pedido = fetchConDispositivo("/api/promos/acceso")
      .then((r) => r.json() as Promise<AccesoPromos>)
      .catch(() => ({ permitido: true, plan: "anonimo" as const, hasta: null }));
  }
  return pedido;
}

/** ¿Puede ver las promociones? null mientras se pregunta. */
export function useAccesoPromos(): AccesoPromos | null {
  const [acceso, setAcceso] = useState<AccesoPromos | null>(null);
  useEffect(() => {
    let vigente = true;
    const preguntar = () => pedirAccesoPromos().then((a) => vigente && setAcceso(a));
    preguntar();
    // Al volver a la app (de otra pestaña o del fondo del celular), se
    // vuelve a preguntar: puede haber pagado mientras tanto.
    const alVolver = () => document.visibilityState === "visible" && preguntar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vigente = false;
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);
  return acceso;
}

// "Solo promociones" o "Ver todo" (todas las prendas de las marcas, ver
// lib/catalogo-completo.ts). Se guarda en el navegador para la próxima.
export type VistaPromos = "promos" | "todo";
const CLAVE_VISTA = "loleardelola:vista-promos";
const VISTA_CAMBIO = "loleardelola:vista-promos-cambio";

function leerVista(): VistaPromos {
  try {
    return localStorage.getItem(CLAVE_VISTA) === "todo" ? "todo" : "promos";
  } catch {
    return "promos";
  }
}

export function guardarVista(vista: VistaPromos): void {
  try {
    localStorage.setItem(CLAVE_VISTA, vista);
  } catch {
    // Sin almacenamiento: dura lo que dure la página.
  }
  window.dispatchEvent(new CustomEvent(VISTA_CAMBIO, { detail: vista }));
}

export function useVistaPromos(): VistaPromos {
  const [vista, setVista] = useState<VistaPromos>("promos");
  useEffect(() => {
    setVista(leerVista());
    const alCambiar = (e: Event) => setVista((e as CustomEvent<VistaPromos>).detail ?? leerVista());
    window.addEventListener(VISTA_CAMBIO, alCambiar);
    return () => window.removeEventListener(VISTA_CAMBIO, alCambiar);
  }, []);
  return vista;
}
