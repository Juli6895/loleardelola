"use client";

import { useEffect, useState } from "react";
import { fetchConDispositivo } from "./device-id";

// =====================================================================
// "Avísame si baja" desde el navegador
// =====================================================================
// Las prendas que sigue se piden UNA vez y se comparten entre todos los
// botones de la página (puede haber decenas): cada botón solo pregunta
// "¿esta URL está?" y se entera cuando alguien sigue o deja una.
// =====================================================================

type Estado = { cargado: boolean; puede: boolean; motivo: string | null; urls: Set<string> };

let estado: Estado = { cargado: false, puede: false, motivo: null, urls: new Set() };
let pedido: Promise<void> | null = null;
const oyentes = new Set<() => void>();

function avisarCambio() {
  oyentes.forEach((f) => f());
}

function cargar(): Promise<void> {
  if (!pedido) {
    pedido = fetchConDispositivo("/api/seguimientos")
      .then((r) => r.json())
      .then((j) => {
        estado = {
          cargado: true,
          puede: !!j.puede,
          motivo: j.motivo ?? null,
          urls: new Set((j.seguimientos ?? []).map((s: { url: string }) => s.url)),
        };
      })
      .catch(() => {
        estado = { ...estado, cargado: true };
      })
      .finally(avisarCambio);
  }
  return pedido;
}

export function useSeguimientos() {
  const [, refrescar] = useState(0);
  useEffect(() => {
    const f = () => refrescar((n) => n + 1);
    oyentes.add(f);
    cargar();
    return () => {
      oyentes.delete(f);
    };
  }, []);
  return estado;
}

/** Vuelve a pedir la lista (por ejemplo, después de entrar o pagar). */
export function recargarSeguimientos() {
  pedido = null;
  return cargar();
}

export function marcarSeguida(url: string, seguida: boolean) {
  const urls = new Set(estado.urls);
  if (seguida) urls.add(url);
  else urls.delete(url);
  estado = { ...estado, urls };
  avisarCambio();
}

function esIphone(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

function esApp(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function llaveABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(crudo.length));
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
  return bytes;
}

/**
 * Pide permiso de notificaciones y registra este celular o navegador.
 * Devuelve null si quedó listo, o el mensaje de por qué no se pudo.
 */
export async function activarNotificaciones(): Promise<string | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    if (esIphone() && !esApp()) {
      return "En iPhone, los avisos llegan con la app instalada: en Safari toca Compartir y luego Agregar a inicio, y ábrela desde ahí.";
    }
    return "Este navegador no recibe notificaciones. Prueba desde Chrome o con la app instalada.";
  }
  const llave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!llave) return "Los avisos todavía no están configurados.";

  const permiso = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permiso !== "granted") {
    return "Sin permiso de notificaciones no te podemos avisar. Actívalo en la configuración del navegador para LoleardLola.";
  }

  let sub: PushSubscription;
  try {
    const registro = await navigator.serviceWorker.ready;
    sub =
      (await registro.pushManager.getSubscription()) ??
      (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llaveABytes(llave) }));
  } catch (e: any) {
    return `El celular no dejó activar los avisos (${e?.name ?? "error"}). Cierra la app, ábrela de nuevo e inténtalo otra vez.`;
  }

  const res = await fetchConDispositivo("/api/push/suscribir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  if (!res.ok) return (await res.json().catch(() => null))?.error ?? `No pudimos activar los avisos (error ${res.status}).`;
  return null;
}
