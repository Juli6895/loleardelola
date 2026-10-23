"use client";

import { useEffect, useState } from "react";
import { anotar } from "@/lib/use-evento";

// =====================================================================
// LoleardLola como app instalable (PWA)
// =====================================================================
// - Registra el service worker (public/sw.js).
// - En Android y en el computador, el navegador avisa que se puede
//   instalar (beforeinstallprompt): se guarda ese aviso y se muestra
//   nuestro propio botón "Instalar".
// - En iPhone no existe ese aviso: se explica cómo hacerlo a mano
//   (Compartir → Agregar a inicio), solo en Safari, que es donde se puede.
// - Si ya la abrió como app, o cerró el aviso hace menos de 30 días, no
//   se muestra nada.
// =====================================================================

type AvisoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const CLAVE_CERRADO = "instalar-app-cerrado";
const DIAS_SIN_MOSTRAR = 30;

function yaEsApp(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function esIphoneEnSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  // Chrome, Firefox y Edge en iPhone no dejan agregar a inicio igual.
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

function cerradoHacePoco(): boolean {
  try {
    const cuando = Number(localStorage.getItem(CLAVE_CERRADO) ?? 0);
    return Date.now() - cuando < DIAS_SIN_MOSTRAR * 24 * 3600_000;
  } catch {
    return false;
  }
}

export default function InstalarApp() {
  const [aviso, setAviso] = useState<AvisoInstalar | null>(null);
  const [iphone, setIphone] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("[sw] no se registró:", e));
    }

    if (yaEsApp()) {
      anotar("app_abierta");
      return;
    }
    if (cerradoHacePoco()) return;

    const alAvisar = (e: Event) => {
      e.preventDefault();
      setAviso(e as AvisoInstalar);
      setVisible(true);
    };
    const alInstalar = () => {
      anotar("app_instalada");
      setVisible(false);
    };
    window.addEventListener("beforeinstallprompt", alAvisar);
    window.addEventListener("appinstalled", alInstalar);

    // En iPhone se espera un poco: que primero vea la página.
    let espera: ReturnType<typeof setTimeout> | undefined;
    if (esIphoneEnSafari()) {
      espera = setTimeout(() => {
        setIphone(true);
        setVisible(true);
      }, 4000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", alAvisar);
      window.removeEventListener("appinstalled", alInstalar);
      if (espera) clearTimeout(espera);
    };
  }, []);

  function cerrar() {
    setVisible(false);
    try {
      localStorage.setItem(CLAVE_CERRADO, String(Date.now()));
    } catch {
      // Sin almacenamiento (modo privado): vuelve a salir la próxima vez.
    }
  }

  async function instalar() {
    if (!aviso) return;
    anotar("app_instalar_clic");
    await aviso.prompt();
    const { outcome } = await aviso.userChoice;
    if (outcome === "accepted") setVisible(false);
    setAviso(null);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar LoleardLola"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-2xl border border-rosa-200 bg-white p-4 shadow-suave sm:bottom-5"
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/iconos/icono-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-noche">Instala LoleardLola</p>
          {iphone ? (
            <p className="mt-0.5 text-xs leading-relaxed text-noche/60">
              Toca{" "}
              <svg viewBox="0 0 24 24" fill="none" className="inline h-4 w-4 align-[-3px] text-rosa-600" aria-label="Compartir">
                <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>{" "}
              <strong className="font-medium text-noche">Compartir</strong> abajo en Safari y luego{" "}
              <strong className="font-medium text-noche">Agregar a inicio</strong>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-noche/60">
              Tenla en tu pantalla de inicio y ábrela como cualquier app, sin buscar el enlace.
            </p>
          )}
          {!iphone && aviso && (
            <button
              onClick={instalar}
              className="mt-3 rounded-full bg-noche px-4 py-1.5 text-xs font-medium text-white transition hover:bg-rosa-500"
            >
              Instalar
            </button>
          )}
        </div>
        <button
          onClick={cerrar}
          aria-label="Cerrar"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-noche/40 transition hover:bg-rosa-50 hover:text-noche"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
