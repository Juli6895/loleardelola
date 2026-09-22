"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { fetchConDispositivo } from "@/lib/device-id";
import { useUsuario } from "@/lib/use-usuario";
import type { TipoPlan } from "@/lib/planes";

// Botón de pago de Bold.
//
// El botón no se puede escribir directo en el HTML: primero hay que
// pedirle al servidor una orden firmada, porque la firma lleva la llave
// secreta y esa no puede bajar al navegador.
//
// Cómo se abre el pago: la librería de Bold expone `window.BoldCheckout`
// y con eso basta. El primer intento fue distinto —insertar un
// <script data-bold-button> al vuelo y hacerle clic al botón que Bold
// dibujara— y no funcionó: su librería busca esos scripts UNA SOLA VEZ
// al cargar (no tiene MutationObserver), así que lo que se agregue
// después lo ignora por completo. De ahí salía "El pago no abrió".

const SCRIPT_BOLD = "https://checkout.bold.co/library/boldPaymentButton.js";

declare global {
  interface Window {
    BoldCheckout?: new (config: Record<string, string>) => { open: () => void };
  }
}

function cargarLibreria(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.BoldCheckout) return resolve();
    const existente = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_BOLD}"]`
    );
    if (existente) {
      existente.addEventListener("load", () => resolve());
      existente.addEventListener("error", () => reject(new Error("carga")));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_BOLD;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("carga"));
    document.head.appendChild(s);
  });
}

export default function BotonPago({
  plan,
  etiqueta,
}: {
  plan: TipoPlan;
  etiqueta: string;
}) {
  const { usuario, cargando } = useUsuario();
  const [ocupado, setOcupado] = useState(false);

  if (cargando) return null;

  // Sin sesión no se puede pagar: el pago tiene que quedar pegado a una
  // cuenta, si no, no hay a quién activarle la membresía después.
  if (!usuario?.conSesion) {
    return (
      <Link
        href="/entrar?volver=/membresia&motivo=Entra con tu correo para poder activarte la membresía después de pagar."
        className="block rounded-full bg-noche px-6 py-3 text-center text-sm font-medium text-white transition hover:bg-rosa-500"
      >
        Entra con tu correo para pagar
      </Link>
    );
  }

  async function pagar() {
    setOcupado(true);
    try {
      const res = await fetchConDispositivo("/api/membresia/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No pudimos preparar el pago");

      await cargarLibreria();
      if (!window.BoldCheckout) {
        throw new Error("No pudimos cargar el pago de Bold. Revisa tu conexión.");
      }

      const b = json.boton;
      // Las claves van en camelCase: la librería las convierte a
      // api-key, order-id, etc. antes de armar la URL del checkout.
      //
      // Sin `renderMode` se va a la página de Bold y vuelve a la
      // nuestra al terminar. Se prefiere sobre el modo incrustado
      // porque no depende de que el navegador permita el iframe, y
      // acá lo que importa es que el cobro no se caiga.
      new window.BoldCheckout({
        apiKey: b.apiKey,
        orderId: b.orden,
        amount: String(b.montoCop),
        currency: b.divisa,
        integritySignature: b.firma,
        description: b.descripcion,
        redirectionUrl: b.urlRetorno,
      }).open();
      // No se apaga `ocupado`: el navegador se va a ir a Bold. Dejarlo
      // encendido evita que alguien alcance a hacer doble clic y se
      // creen dos órdenes.
    } catch (err: any) {
      toast.error(err.message ?? "No pudimos abrir el pago");
      setOcupado(false);
    }
  }

  return (
    <button
      onClick={pagar}
      disabled={ocupado}
      className="w-full rounded-full bg-noche px-6 py-3 text-sm font-medium text-white transition hover:bg-rosa-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {ocupado ? "Abriendo el pago..." : etiqueta}
    </button>
  );
}
