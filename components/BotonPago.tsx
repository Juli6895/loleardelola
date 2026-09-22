"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { fetchConDispositivo } from "@/lib/device-id";
import { useUsuario } from "@/lib/use-usuario";
import type { TipoPlan } from "@/lib/planes";

// Botón de pago de Bold.
//
// El botón no se puede escribir directo en el HTML: hay que pedirle al
// servidor una orden firmada primero (la firma lleva la llave secreta,
// que no puede bajar al navegador). Por eso esto es un botón normal que,
// al tocarlo, pide la orden, inyecta el script de Bold con los datos
// firmados y lo dispara.

const SCRIPT_BOLD = "https://checkout.bold.co/library/boldPaymentButton.js";

function cargarScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${SCRIPT_BOLD}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = SCRIPT_BOLD;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No pudimos cargar el pago de Bold"));
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

      const b = json.boton;
      await cargarScript();

      // Bold lee los datos de los atributos de un <script>, así que se
      // arma uno al vuelo dentro de un contenedor propio y se deja que
      // su librería lo convierta en el botón real.
      const caja = document.createElement("div");
      caja.style.display = "none";
      const tag = document.createElement("script");
      tag.setAttribute("data-bold-button", "dark-L");
      tag.setAttribute("data-api-key", b.apiKey);
      tag.setAttribute("data-order-id", b.orden);
      tag.setAttribute("data-amount", String(b.montoCop));
      tag.setAttribute("data-currency", b.divisa);
      tag.setAttribute("data-integrity-signature", b.firma);
      tag.setAttribute("data-description", b.descripcion);
      tag.setAttribute("data-redirection-url", b.urlRetorno);
      tag.setAttribute("data-render-mode", "embedded");
      caja.appendChild(tag);
      document.body.appendChild(caja);

      // La librería tarda un instante en reemplazar el script por el
      // botón; cuando aparece, se le hace clic para abrir el pago sin
      // que la usuaria tenga que tocar dos botones seguidos.
      const desde = Date.now();
      const buscar = setInterval(() => {
        const real = caja.querySelector("button, a") as HTMLElement | null;
        if (real) {
          clearInterval(buscar);
          real.click();
          setOcupado(false);
        } else if (Date.now() - desde > 8000) {
          clearInterval(buscar);
          setOcupado(false);
          toast.error("El pago no abrió. Recarga la página e intenta de nuevo.");
        }
      }, 120);
    } catch (err: any) {
      toast.error(err.message);
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
